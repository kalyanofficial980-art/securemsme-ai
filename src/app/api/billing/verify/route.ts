import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getRazorpayConfig,
  razorpayRequest,
  shouldActivatePlan,
  verifyCheckoutSignature,
  type RazorpayPayment,
  type SelfServePlan,
} from "@/lib/billing/razorpay";
import { enforceRateLimit } from "@/lib/security/request-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(6).max(120),
  razorpay_payment_id: z.string().min(6).max(120),
  razorpay_signature: z.string().min(32).max(256),
});

export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(request, "billing-verify", 10, 60_000);
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Please sign in to verify payment." }, { status: 401 });
    }

    const parsed = verifySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment verification payload." }, { status: 400 });
    }

    const config = getRazorpayConfig();
    if (!config) {
      return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
    }

    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = parsed.data;

    const authentic = verifyCheckoutSignature({
      orderId,
      paymentId,
      signature,
      keySecret: config.keySecret,
    });

    if (!authentic) {
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: paymentRecord, error: recordError } = await admin
      .from("payments")
      .select("id, user_id, plan, amount, currency, status, razorpay_order_id")
      .eq("razorpay_order_id", orderId)
      .eq("user_id", user.id)
      .single();

    if (recordError || !paymentRecord) {
      return NextResponse.json({ error: "Payment order was not found." }, { status: 404 });
    }

    const providerPayment = await razorpayRequest<RazorpayPayment>(
      `/v1/payments/${encodeURIComponent(paymentId)}`,
      { method: "GET" },
    );

    const matchesOrder = providerPayment.order_id === orderId;
    const matchesAmount = Number(providerPayment.amount) === Number(paymentRecord.amount);
    const matchesCurrency = providerPayment.currency === paymentRecord.currency;

    if (!matchesOrder || !matchesAmount || !matchesCurrency) {
      await admin
        .from("payments")
        .update({
          status: "verification_mismatch",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentRecord.id);

      return NextResponse.json({ error: "Payment details did not match the order." }, { status: 409 });
    }

    const captured = providerPayment.status === "captured";
    const nextStatus = captured ? "captured" : `verified_${providerPayment.status}`;

    await admin
      .from("payments")
      .update({
        razorpay_payment_id: paymentId,
        status: nextStatus,
        captured_at: captured ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentRecord.id);

    let planActivated = false;
    if (captured) {
      const paidPlan = paymentRecord.plan as SelfServePlan;
      const { data: profile } = await admin
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();

      if (shouldActivatePlan(profile?.plan, paidPlan)) {
        const { error: profileError } = await admin
          .from("profiles")
          .update({
            plan: paidPlan,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (profileError) throw profileError;
        planActivated = true;
      }
    }

    return NextResponse.json(
      {
        verified: true,
        captured,
        planActivated,
        status: providerPayment.status,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("billing verification failed", {
      message: error instanceof Error ? error.message : "Unknown billing verification error",
    });

    return NextResponse.json(
      { error: "Payment verification could not be completed. Please contact support if you were charged." },
      { status: 500 },
    );
  }
}
