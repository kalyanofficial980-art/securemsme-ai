import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getRazorpayConfig,
  getRazorpayPlanId,
  launchPlanConfig,
  razorpayRequest,
  selfServePlans,
  type RazorpayPlan,
  type RazorpaySubscription,
} from "@/lib/billing/razorpay";
import { enforceRateLimit } from "@/lib/security/request-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const subscriptionSchema = z.object({
  plan: z.enum(selfServePlans),
});

function planMatchesLaunchPrice(
  providerPlan: RazorpayPlan,
  expected: (typeof launchPlanConfig)[keyof typeof launchPlanConfig],
) {
  return (
    providerPlan.entity === "plan" &&
    providerPlan.interval === expected.interval &&
    providerPlan.period === expected.period &&
    Number(providerPlan.item?.amount) === expected.amount &&
    providerPlan.item?.currency === expected.currency
  );
}

export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(
    request,
    "billing-subscription-create",
    5,
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
        { error: "Please sign in before checkout." },
        { status: 401 },
      );
    }

    const parsed = subscriptionSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid paid plan." },
        { status: 400 },
      );
    }

    const { plan } = parsed.data;
    const expected = launchPlanConfig[plan];
    const config = getRazorpayConfig();
    const providerPlanId = getRazorpayPlanId(plan);

    if (!config || !providerPlanId) {
      return NextResponse.json(
        { error: "Recurring billing is not configured for this plan yet." },
        { status: 503 },
      );
    }

    const providerPlan = await razorpayRequest<RazorpayPlan>(
      `/v1/plans/${encodeURIComponent(providerPlanId)}`,
      { method: "GET" },
    );

    if (!planMatchesLaunchPrice(providerPlan, expected)) {
      console.error("Razorpay plan does not match VeyraSec launch pricing", {
        plan,
        providerPlanId,
      });
      return NextResponse.json(
        {
          error:
            "Checkout is temporarily unavailable because billing configuration does not match the published price.",
        },
        { status: 503 },
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin
      .from("billing_subscriptions")
      .select(
        "id, razorpay_subscription_id, plan, status, created_at",
      )
      .eq("user_id", user.id)
      .in("status", ["created", "authenticated", "active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.status === "active") {
      return NextResponse.json(
        {
          error:
            "An active subscription already exists. Plan changes are handled separately to avoid duplicate charges.",
        },
        { status: 409 },
      );
    }

    if (
      existing?.razorpay_subscription_id &&
      existing.plan === plan &&
      ["created", "authenticated", "pending"].includes(existing.status)
    ) {
      return NextResponse.json(
        {
          keyId: config.keyId,
          subscriptionId: existing.razorpay_subscription_id,
          amount: expected.amount,
          currency: expected.currency,
          plan,
          displayPrice: expected.displayPrice,
          productName: "VeyraSec",
          reused: true,
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const providerSubscription = await razorpayRequest<RazorpaySubscription>(
      "/v1/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          plan_id: providerPlanId,
          total_count: 120,
          quantity: 1,
          customer_notify: true,
          notes: {
            product: "VeyraSec",
            plan,
            user_id: user.id,
          },
        }),
      },
    );

    if (
      !providerSubscription.id ||
      providerSubscription.plan_id !== providerPlanId
    ) {
      throw new Error("Razorpay returned an unexpected subscription response.");
    }

    const { error: insertError } = await admin
      .from("billing_subscriptions")
      .insert({
        user_id: user.id,
        plan,
        razorpay_subscription_id: providerSubscription.id,
        razorpay_plan_id: providerPlanId,
        status: providerSubscription.status || "created",
        amount: expected.amount,
        currency: expected.currency,
        billing_period: expected.period,
        billing_interval: expected.interval,
        total_count: providerSubscription.total_count || 120,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("billing subscription persistence failed", {
        code: insertError.code,
        subscriptionId: providerSubscription.id,
      });
      return NextResponse.json(
        {
          error:
            "Subscription could not be prepared safely. Please contact support before retrying.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        keyId: config.keyId,
        subscriptionId: providerSubscription.id,
        amount: expected.amount,
        currency: expected.currency,
        plan,
        displayPrice: expected.displayPrice,
        productName: "VeyraSec",
        reused: false,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("billing subscription creation failed", {
      message:
        error instanceof Error ? error.message : "Unknown subscription error",
    });

    return NextResponse.json(
      { error: "Checkout could not be started. Please try again." },
      { status: 500 },
    );
  }
}
