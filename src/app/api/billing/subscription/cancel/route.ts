import { NextResponse } from "next/server";
import {
  razorpayRequest,
  unixSecondsToIso,
  type RazorpaySubscription,
} from "@/lib/billing/razorpay";
import { enforceRateLimit } from "@/lib/security/request-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function hasCurrentPaidCycle(subscription: RazorpaySubscription) {
  return Boolean(
    subscription.current_end &&
      subscription.current_end * 1000 > Date.now() &&
      !["created", "authenticated", "cancelled", "completed", "expired"].includes(
        subscription.status,
      ),
  );
}

export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(
    request,
    "billing-subscription-cancel",
    3,
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
        { error: "Please sign in to manage your subscription." },
        { status: 401 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: record, error: recordError } = await admin
      .from("billing_subscriptions")
      .select(
        "id, user_id, plan, razorpay_subscription_id, status, current_end, cancel_requested_at, cancel_at_cycle_end",
      )
      .eq("user_id", user.id)
      .in("status", [
        "created",
        "authenticated",
        "active",
        "pending",
        "halted",
        "paused",
      ])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recordError || !record) {
      return NextResponse.json(
        { error: "No cancellable subscription was found." },
        { status: 404 },
      );
    }

    if (record.cancel_requested_at && record.cancel_at_cycle_end) {
      return NextResponse.json(
        {
          cancelled: true,
          atCycleEnd: true,
          currentEnd: record.current_end,
          alreadyRequested: true,
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const providerSubscription = await razorpayRequest<RazorpaySubscription>(
      `/v1/subscriptions/${encodeURIComponent(record.razorpay_subscription_id)}`,
      { method: "GET" },
    );

    if (
      providerSubscription.id !== record.razorpay_subscription_id ||
      ["cancelled", "completed", "expired"].includes(providerSubscription.status)
    ) {
      return NextResponse.json(
        { error: "This subscription is already ended or cannot be cancelled." },
        { status: 409 },
      );
    }

    const cancelAtCycleEnd = hasCurrentPaidCycle(providerSubscription);
    const cancelled = await razorpayRequest<RazorpaySubscription>(
      `/v1/subscriptions/${encodeURIComponent(record.razorpay_subscription_id)}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({
          cancel_at_cycle_end: cancelAtCycleEnd,
        }),
      },
    );

    if (cancelled.id !== record.razorpay_subscription_id) {
      throw new Error("Razorpay returned an unexpected cancellation response.");
    }

    const currentEnd = unixSecondsToIso(
      cancelled.current_end || providerSubscription.current_end,
    );
    const now = new Date().toISOString();

    const { error: updateError } = await admin
      .from("billing_subscriptions")
      .update({
        status: cancelled.status,
        current_start: unixSecondsToIso(cancelled.current_start),
        current_end: currentEnd,
        ended_at: unixSecondsToIso(cancelled.ended_at),
        cancel_requested_at: now,
        cancel_at_cycle_end: cancelAtCycleEnd,
        updated_at: now,
      })
      .eq("id", record.id);

    if (updateError) throw updateError;

    if (cancelAtCycleEnd && currentEnd) {
      await admin
        .from("profiles")
        .update({
          plan_expires_at: currentEnd,
          updated_at: now,
        })
        .eq("id", user.id)
        .eq("plan", record.plan);
    } else {
      await admin
        .from("profiles")
        .update({
          plan: "free",
          plan_expires_at: null,
          updated_at: now,
        })
        .eq("id", user.id)
        .eq("plan", record.plan);
    }

    return NextResponse.json(
      {
        cancelled: true,
        atCycleEnd: cancelAtCycleEnd,
        currentEnd,
        alreadyRequested: false,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("billing subscription cancellation failed", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown subscription cancellation error",
    });

    return NextResponse.json(
      {
        error:
          "Subscription cancellation could not be completed. Please contact support before retrying.",
      },
      { status: 500 },
    );
  }
}
