import { redirect } from "next/navigation";
import { ManualBillingPanel } from "@/components/ManualBillingPanel";
import { Navbar } from "@/components/Navbar";
import { getEffectivePlan } from "@/lib/billing/entitlements";
import {
  getPaymentCheckout,
  normalizePaidPlanKey,
} from "@/lib/billing/payment-checkout";
import { createClient } from "@/lib/supabase/server";

export default async function ManualBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; plan?: string }>;
}) {
  const { message, plan } = await searchParams;
  const selectedPlan = normalizePaidPlanKey(plan || "starter");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/manual-billing?plan=${selectedPlan}`;
    redirect(
      `/login?message=${encodeURIComponent("Sign in with Google to continue to subscription checkout.")}&next=${encodeURIComponent(next)}`,
    );
  }

  const [{ data: profile }, { data: payments }, checkout] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, plan, plan_expires_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("manual_payment_requests_v2")
      .select(
        "id, requested_plan_key, requested_plan_name, billing_cycle, amount_inr, payment_method, payment_reference, payment_proof_path, request_status, admin_review_note, plan_activated_at, plan_expires_at, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    getPaymentCheckout(selectedPlan),
  ]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <ManualBillingPanel
          payments={payments || []}
          message={message}
          selectedPlan={selectedPlan}
          currentPlan={getEffectivePlan(profile)}
          currentPlanExpiresAt={profile?.plan_expires_at || null}
          payerName={profile?.full_name || ""}
          payerEmail={user.email || ""}
          checkout={checkout}
        />
      </section>
    </main>
  );
}
