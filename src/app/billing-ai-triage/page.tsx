import { BillingAiTriagePanel } from "@/components/BillingAiTriagePanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import { billingAiTriageBlockedClaims } from "@/lib/billing-ai-triage-engine";

export default async function BillingAiTriagePage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string; message?: string }>;
}) {
  const { run: selectedRunId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: plans } = await supabase
    .from("billing_plan_catalog_v2")
    .select(
      "plan_key, plan_name, monthly_price_inr, monthly_price_usd, scan_limit, website_limit, report_limit, client_portal_limit, monitoring_target_limit, ai_triage_limit, team_member_limit, plan_description",
    )
    .eq("plan_status", "active")
    .order("monthly_price_inr", { ascending: true });

  let profile = null;
  let counter = null;
  let runs: any[] = [];
  let selectedRun = null;
  let items: any[] = [];
  let events: any[] = [];

  if (user) {
    const { data: profileData } = await supabase
      .from("user_billing_profiles_v2")
      .select(
        "id, plan_key, billing_status, current_period_start, current_period_end, billing_summary, limit_summary",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    profile = profileData;

    if (profile?.id) {
      const { data: counterData } = await supabase
        .from("usage_counters_v2")
        .select(
          "scans_used, websites_used, reports_used, client_portals_used, monitoring_targets_used, ai_triage_used",
        )
        .eq("user_id", user.id)
        .eq("period_start", profile.current_period_start)
        .eq("period_end", profile.current_period_end)
        .maybeSingle();

      counter = counterData;
    }

    const { data: runRows } = await supabase
      .from("ai_triage_runs_v2")
      .select(
        "id, target_url, total_item_count, urgent_count, high_priority_count, quick_win_count, needs_review_count, triage_score, business_impact_score, remediation_efficiency_score, confidence_score, executive_summary, developer_summary, client_safe_summary, limitations_summary, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    runs = runRows || [];
    selectedRun = selectedRunId
      ? runs.find((run) => run.id === selectedRunId) || runs[0]
      : runs[0];

    if (selectedRun?.id) {
      const { data: itemRows } = await supabase
        .from("ai_triage_items_v2")
        .select(
          "id, item_title, item_status, priority, severity, confidence_level, triage_rank, triage_score, business_impact_score, fix_effort_score, confidence_score, affected_area, reason_summary, developer_action, client_safe_note, blocked_claim",
        )
        .eq("run_id", selectedRun.id)
        .eq("user_id", user.id)
        .order("triage_rank", { ascending: true })
        .limit(200);

      items = itemRows || [];
    }

    const { data: eventRows } = await supabase
      .from("billing_ai_triage_events_v2")
      .select("id, title, details, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    events = eventRows || [];
  }

  const selectedPlan = profile
    ? (plans || []).find((plan: any) => plan.plan_key === profile.plan_key) ||
      (plans || [])[0]
    : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        {user ? (
          <BillingAiTriagePanel
            plans={plans || []}
            profile={profile}
            counter={counter}
            selectedPlan={selectedPlan}
            runs={runs}
            selectedRun={selectedRun}
            items={items}
            events={events}
            message={message}
          />
        ) : (
          <section className="space-y-10">
            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
              <p className="text-sm font-black text-blue-700">Mega Part 65</p>
              <h1 className="mt-2 text-5xl font-black text-blue-950">
                Billing + AI Triage + Usage Limits
              </h1>
              <p className="mt-5 max-w-3xl leading-8 text-blue-900">
                Plan limits, usage metering and safe remediation prioritization
                for SecureMSME AI. Login to manage your billing profile and run
                triage.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {(plans || []).map((plan: any) => (
                <div
                  key={plan.plan_key}
                  className="rounded-3xl border border-slate-200 bg-white p-6"
                >
                  <h2 className="text-xl font-black">{plan.plan_name}</h2>
                  <p className="mt-3 text-3xl font-black">
                    ₹{plan.monthly_price_inr}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {plan.plan_description}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
              <h2 className="text-2xl font-black text-red-950">
                Blocked claims
              </h2>
              <div className="mt-5 grid gap-3">
                {billingAiTriageBlockedClaims.map((claim) => (
                  <div
                    key={claim}
                    className="rounded-2xl bg-white/80 p-4 text-sm font-bold text-red-900"
                  >
                    {claim}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
