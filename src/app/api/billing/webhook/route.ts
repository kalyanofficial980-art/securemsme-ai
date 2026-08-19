import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  shouldActivatePlan,
  unixSecondsToIso,
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

type WebhookSubscriptionEntity = {
  id?: string;
  plan_id?: string;
  status?: string;
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  paid_count?: number;
  total_count?: number;
};

type WebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: WebhookEntity };
    order?: { entity?: WebhookEntity };
    subscription?: { entity?: WebhookSubscriptionEntity };
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

function entitlementEndFor(subscription: WebhookSubscriptionEntity) {
  const terminal = ["cancelled", "completed", "expired"].includes(
    subscription.status || "",
  );

  if (terminal && subscription.ended_at) {
    return unixSecondsToIso(subscription.ended_at);
  }

  return unixSecondsToIso(subscription.current_end);
}

async function syncSubscriptionProfile(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  record: { user_id: string; plan: string },
  subscription: WebhookSubscriptionEntity,
) {
  const entitlementEnd = entitlementEndFor(subscription);
  const activeThroughFuture =
    subscription.status === "active" &&
    Boolean(entitlementEnd) &&
    new Date(entitlementEnd as string).getTime() > Date.now();

  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", record.user_id)
    .single();

  if (activeThroughFuture) {
    const paidPlan = record.plan as SelfServePlan;
    if (shouldActivatePlan(profile?.plan, paidPlan)) {
      const { error: profileError } = await admin
        .from("profiles")
        .update({
          plan: paidPlan,
          plan_expires_at: entitlementEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.user_id);

      if (profileError) throw profileError;
    }
    return;
  }

  if (profile?.plan !== record.plan) return;

  if (entitlementEnd && new Date(entitlementEnd).getTime() > Date.now()) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        plan_expires_at: entitlementEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.user_id);

    if (profileError) throw profileError;
    return;
  }

  if (["halted", "cancelled", "completed", "expired"].includes(subscription.status || "")) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        plan: "free",
        plan_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.user_id)
      .eq("plan", record.plan);

    if (profileError) throw profileError;
  }
}

async function processSubscriptionEvent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  eventType: string,
  subscription: WebhookSubscriptionEntity,
  payment?: WebhookEntity,
) {
  if (!subscription.id || !subscription.plan_id || !subscription.status) {
    throw new Error("Subscription webhook payload is incomplete.");
  }

  const { data: record, error: recordError } = await admin
    .from("billing_subscriptions")
    .select(
      "id, user_id, plan, amount, currency, razorpay_subscription_id, razorpay_plan_id",
    )
    .eq("razorpay_subscription_id", subscription.id)
    .single();

  if (recordError || !record) {
    throw new Error("Razorpay subscription is not known to VeyraSec.");
  }

  if (record.razorpay_plan_id !== subscription.plan_id) {
    throw new Error("Subscription plan id did not match VeyraSec records.");
  }

  if (eventType === "subscription.charged" && payment) {
    if (
      Number(payment.amount || 0) !== Number(record.amount) ||
      payment.currency !== record.currency ||
      payment.status !== "captured"
    ) {
      throw new Error(
        "Recurring payment amount, currency or capture status did not match VeyraSec records.",
      );
    }
  }

  const entitlementEnd = entitlementEndFor(subscription);
  const { error: updateError } = await admin
    .from("billing_subscriptions")
    .update({
      status: subscription.status,
      latest_payment_id: payment?.id || null,
      current_start: unixSecondsToIso(subscription.current_start),
      current_end: unixSecondsToIso(subscription.current_end),
      ended_at: unixSecondsToIso(subscription.ended_at),
      paid_count: subscription.paid_count ?? 0,
      total_count: subscription.total_count ?? 120,
      activated_at:
        subscription.status === "active" ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  if (updateError) throw updateError;

  await syncSubscriptionProfile(admin, record, {
    ...subscription,
    current_end: entitlementEnd
      ? Math.floor(new Date(entitlementEnd).getTime() / 1000)
      : subscription.current_end,
  });
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
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  const eventId = eventIdForRequest(request, rawBody);
  let parsed: WebhookPayload;

  try {
    parsed = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook payload." },
      { status: 400 },
    );
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
    const { error: insertError } = await admin
      .from("payment_webhook_events")
      .insert({
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
      return NextResponse.json(
        { error: "Webhook could not be recorded." },
        { status: 500 },
      );
    }
  }

  try {
    const subscriptionEntity = parsed.payload?.subscription?.entity;
    const paymentEntity = parsed.payload?.payment?.entity;
    const orderEntity = parsed.payload?.order?.entity;

    if (eventType.startsWith("subscription.") && subscriptionEntity) {
      await processSubscriptionEvent(
        admin,
        eventType,
        subscriptionEntity,
        paymentEntity,
      );
    } else {
      const orderId = paymentEntity?.order_id || orderEntity?.id || null;

      if (eventType === "payment.failed" && orderId) {
        await admin
          .from("payments")
          .update({
            razorpay_payment_id: paymentEntity?.id || null,
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", orderId);
      } else if (
        (eventType === "payment.captured" || eventType === "order.paid") &&
        orderId
      ) {
        const { data: paymentRecord } = await admin
          .from("payments")
          .select("id, amount, currency")
          .eq("razorpay_order_id", orderId)
          .maybeSingle();

        if (paymentRecord) {
          const amount = Number(
            paymentEntity?.amount ?? orderEntity?.amount ?? 0,
          );
          const currency =
            paymentEntity?.currency || orderEntity?.currency || "";

          if (
            amount !== Number(paymentRecord.amount) ||
            currency !== paymentRecord.currency
          ) {
            throw new Error(
              "Captured legacy payment amount or currency did not match the stored order.",
            );
          }

          await admin
            .from("payments")
            .update({
              razorpay_payment_id: paymentEntity?.id || null,
              status: "captured",
              captured_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentRecord.id);
        }
      }
    }

    await markEvent(admin, eventId, {
      status: "processed",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown webhook processing error";
    console.error("Razorpay webhook processing failed", {
      eventId,
      eventType,
      message,
    });

    await markEvent(admin, eventId, {
      status: "failed",
      last_error: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
