import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ManualBillingPanel } from "@/components/ManualBillingPanel";
import { getEffectivePlan } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

function normalizePaidPlan(value?: string) {
  return value === "growth" || value === "agency" || value === "starter"
    ? value
    : "starter";
}

export default async function ManualBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; plan?: string }>;
}) {
  const { message, plan } = await searchParams;
  const selectedPlan = normalizePaidPlan(plan);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/manual-billing?plan=${selectedPlan}`;
    redirect(
      `/login?message=${encodeURIComponent("Sign in with Google to request paid activation.")}&next=${encodeURIComponent(next)}`,
    );
  }

  const [{ data: profile }, { data: payments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, plan, plan_expires_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("manual_payment_requests_v2")
      .select(
        "id, requested_plan_name, billing_cycle, amount_inr, payment_reference, request_status, admin_review_note, plan_activated_at, plan_expires_at, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <ManualBillingPanel
          payments={payments || []}
          message={message}
          selectedPlan={selectedPlan}
          currentPlan={getEffectivePlan(profile)}
          currentPlanExpiresAt={profile?.plan_expires_at || null}
          payerName={profile?.full_name || ""}
          payerEmail={user.email || ""}
        />
      </section>
    </main>
  );
}
