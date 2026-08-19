import Link from "next/link";
import { redirect } from "next/navigation";
import { CancelSubscriptionButton } from "@/components/CancelSubscriptionButton";
import { Navbar } from "@/components/Navbar";
import { getEffectivePlan } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

function formatBillingDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please sign in to manage billing");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", user.id)
    .single();

  const { data: subscription } = await supabase
    .from("billing_subscriptions")
    .select(
      "plan, status, amount, currency, current_start, current_end, cancel_requested_at, cancel_at_cycle_end, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const effectivePlan = getEffectivePlan(profile);
  const canCancel = Boolean(
    subscription &&
      [
        "created",
        "authenticated",
        "active",
        "pending",
        "halted",
        "paused",
      ].includes(subscription.status) &&
      !(subscription.cancel_requested_at && subscription.cancel_at_cycle_end),
  );

  const amount = subscription?.amount
    ? `₹${(Number(subscription.amount) / 100).toLocaleString("en-IN")}/month`
    : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Billing
            </p>
            <h1 className="mt-2 text-4xl font-black">Plan and subscription</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Review your VeyraSec plan, paid access period and recurring billing
              status.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
          >
            View plans
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Current access</p>
            <p className="mt-2 text-3xl font-black capitalize">{effectivePlan}</p>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {effectivePlan === "free"
                ? "Free evaluation limits apply."
                : `Paid access through ${formatBillingDate(profile?.plan_expires_at)}.`}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Recurring billing</p>
            <p className="mt-2 text-3xl font-black capitalize">
              {subscription?.status || "Not active"}
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {subscription
                ? `${subscription.plan} · ${amount || "Price unavailable"}`
                : "No recurring subscription record is active."}
            </p>
          </div>
        </div>

        {subscription ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black">Subscription details</h2>
            <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="font-bold text-slate-500">Current period starts</dt>
                <dd className="mt-1 font-black">
                  {formatBillingDate(subscription.current_start)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Current period ends</dt>
                <dd className="mt-1 font-black">
                  {formatBillingDate(subscription.current_end)}
                </dd>
              </div>
            </dl>

            {subscription.cancel_requested_at && subscription.cancel_at_cycle_end ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
                Recurring billing is scheduled to stop at the end of the current
                paid cycle. Access remains available through {formatBillingDate(
                  subscription.current_end,
                )}.
              </div>
            ) : null}

            {canCancel ? (
              <div className="mt-6">
                <CancelSubscriptionButton />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 text-sm leading-7 text-slate-600 shadow-sm">
          Payments are completed in Razorpay Checkout. VeyraSec does not ask you
          to type card details, OTPs, UPI PINs or banking passwords into a
          VeyraSec form.
        </div>
      </section>
    </main>
  );
}
