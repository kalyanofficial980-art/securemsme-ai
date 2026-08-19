import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getRazorpayConfig,
  razorpayRequest,
  shouldActivatePlan,
  unixSecondsToIso,
  verifySubscriptionCheckoutSignature,
  type RazorpaySubscription,
  type SelfServePlan,
} from "@/lib/billing/razorpay";
import { enforceRateLimit } from "@/lib/security/request-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const verifySchema = z.object({
  razorpay_subscription_id: z.string().min(6).max(120),
  razorpay_payment_id: z.string().min(6).max(120),
  razorpay_signature: z.string().min(32).max(256),
});

function isCurrentActiveSubscription(subscription: RazorpaySubscription) {
  if (subscription.status !== "active") return false;
  if (!subscription.current_end) return false;
  return subscription.current_end * 1000 > Date.now();
}

export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(
    request,
    "billing-subscription-verify",
    10,
    60_000,
  );
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Please sign in to verify subscription." },
        { status: 401 },
      );
    }

    const parsed = verifySchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid subscription verification payload." },
        { status: 400 },
      );
    }

    const config = getRazorpayConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Billing is not configured." },
        { status: 503 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: record, error: recordError } = await admin
      .from("billing_subscriptions")
      .select(
        "id, user_id, plan, razorpay_subscription_id, razorpay_plan_id, status",
      )
      .eq("razorpay_subscription_id", parsed.data.razorpay_subscription_id)
      .eq("user_id", user.id)
      .single();

    if (recordError || !record) {
      return NextResponse.json(
        { error: "Subscription was not found." },
        { status: 404 },
      );
    }

    const authentic = verifySubscriptionCheckoutSignature({
      subscriptionId: record.razorpay_subscription_id,
      paymentId: parsed.data.razorpay_payment_id,
      signature: parsed.data.razorpay_signature,
      keySecret: config.keySecret,
    });

    if (!authentic) {
      return NextResponse.json(
        { error: "Subscription signature verification failed." },
        { status: 400 },
      );
    }

    const providerSubscription = await razorpayRequest<RazorpaySubscription>(
      `/v1/subscriptions/${encodeURIComponent(record.razorpay_subscription_id)}`,
      { method: "GET" },
    );

    if (
      providerSubscription.id !== record.razorpay_subscription_id ||
      providerSubscription.plan_id !== record.razorpay_plan_id
    ) {
      await admin
        .from("billing_subscriptions")
        .update({
          status: "verification_mismatch",
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      return NextResponse.json(
        { error: "Subscription details did not match VeyraSec records." },
        { status: 409 },
      );
    }

    const currentStart = unixSecondsToIso(providerSubscription.current_start);
    const currentEnd = unixSecondsToIso(providerSubscription.current_end);
    const active = isCurrentActiveSubscription(providerSubscription);

    const { error: updateError } = await admin
      .from("billing_subscriptions")
      .update({
        status: providerSubscription.status,
        latest_payment_id: parsed.data.razorpay_payment_id,
        current_start: currentStart,
        current_end: currentEnd,
        ended_at: unixSecondsToIso(providerSubscription.ended_at),
        paid_count: providerSubscription.paid_count ?? 0,
        activated_at: active ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    if (updateError) throw updateError;

    let planActivated = false;

    if (active && currentEnd) {
      const paidPlan = record.plan as SelfServePlan;
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
            plan_expires_at: currentEnd,
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
        active,
        planActivated,
        status: providerSubscription.status,
        currentEnd,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("billing subscription verification failed", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown subscription verification error",
    });

    return NextResponse.json(
      {
        error:
          "Subscription verification could not be completed. Please contact support if you were charged.",
      },
      { status: 500 },
    );
  }
}
