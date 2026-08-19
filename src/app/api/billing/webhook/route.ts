import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  selfServePlans,
  shouldActivatePlan,
  verifyWebhookSignature,
  type SelfServePlan,
} from "@/lib/billing/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookEntity = {
  id?: string;
  order_id?: string | null;
  amount?: number;
  currency?: string;
  status?: string;
};

type WebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: WebhookEntity };
    order?: { entity?: WebhookEntity };
  };
};

function eventIdForRequest(request: Request, rawBody: string) {
  return (
    request.headers.get("x-razorpay-event-id")?.trim() ||
    `body_${createHash("sha256").update(rawBody).digest("hex")}`
  );
}

async function markEvent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  values: Record<string, unknown>,
) {
  await admin
    .from("payment_webhook_events")
    .update(values)
    .eq("event_id", eventId);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("Razorpay webhook secret is not configured.");
    return NextResponse.json({ error: "Webhook unavailable." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature")?.trim() || "";

  if (
    !signature ||
    !verifyWebhookSignature({ rawBody, signature, webhookSecret })
  ) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const eventId = eventIdForRequest(request, rawBody);
  let parsed: WebhookPayload;

  try {
    parsed = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const eventType = parsed.event || "unknown";
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("payment_webhook_events")
    .select("event_id, status")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing?.status === "processed") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (existing) {
    await markEvent(admin, eventId, {
      event_type: eventType,
      status: "processing",
      last_error: null,
      updated_at: new Date().toISOString(),
    });
  } else {
    const { error: insertError } = await admin.from("payment_webhook_events").insert({
      event_id: eventId,
      event_type: eventType,
      status: "processing",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError && insertError.code !== "23505") {
      console.error("webhook event persistence failed", {
        eventId,
        code: insertError.code,
      });
      return NextResponse.json({ error: "Webhook could not be recorded." }, { status: 500 });
    }
  }

  try {
    const paymentEntity = parsed.payload?.payment?.entity;
    const orderEntity = parsed.payload?.order?.entity;
    const orderId = paymentEntity?.order_id || orderEntity?.id || null;

    if (eventType === "payment.failed") {
      if (orderId) {
        await admin
          .from("payments")
          .update({
            razorpay_payment_id: paymentEntity?.id || null,
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", orderId);
      }
    } else if (eventType === "payment.captured" || eventType === "order.paid") {
      if (!orderId) {
        throw new Error("Captured payment webhook did not contain an order id.");
      }

      const { data: paymentRecord, error: paymentRecordError } = await admin
        .from("payments")
        .select("id, user_id, plan, amount, currency")
        .eq("razorpay_order_id", orderId)
        .single();

      if (paymentRecordError || !paymentRecord) {
        throw new Error("Captured Razorpay order is not known to VeyraSec.");
      }

      const amount = Number(paymentEntity?.amount ?? orderEntity?.amount ?? 0);
      const currency = paymentEntity?.currency || orderEntity?.currency || "";
      const paymentId = paymentEntity?.id || null;

      if (
        amount !== Number(paymentRecord.amount) ||
        currency !== paymentRecord.currency
      ) {
        await admin
          .from("payments")
          .update({
            status: "webhook_mismatch",
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentRecord.id);
        throw new Error("Captured payment amount or currency did not match the stored order.");
      }

      if (!selfServePlans.includes(paymentRecord.plan as SelfServePlan)) {
        throw new Error("Captured order does not contain a valid self-serve plan.");
      }

      await admin
        .from("payments")
        .update({
          razorpay_payment_id: paymentId,
          status: "captured",
          captured_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentRecord.id);

      const paidPlan = paymentRecord.plan as SelfServePlan;
      const { data: profile } = await admin
        .from("profiles")
        .select("plan")
        .eq("id", paymentRecord.user_id)
        .single();

      if (shouldActivatePlan(profile?.plan, paidPlan)) {
        const { error: profileError } = await admin
          .from("profiles")
          .update({
            plan: paidPlan,
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentRecord.user_id);

        if (profileError) throw profileError;
      }
    }

    await markEvent(admin, eventId, {
      status: "processed",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook processing error";
    console.error("Razorpay webhook processing failed", { eventId, eventType, message });

    await markEvent(admin, eventId, {
      status: "failed",
      last_error: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
