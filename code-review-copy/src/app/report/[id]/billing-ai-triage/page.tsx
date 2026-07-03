import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingAiTriagePanel } from "@/components/BillingAiTriagePanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ReportBillingAiTriagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run?: string; message?: string }>;
}) {
  const { id } = await params;
  const { run: selectedRunId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to view billing and AI triage");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: plans } = await supabase
    .from("billing_plan_catalog_v2")
    .select(
      "plan_key, plan_name, monthly_price_inr, monthly_price_usd, scan_limit, website_limit, report_limit, client_portal_limit, monitoring_target_limit, ai_triage_limit, team_member_limit, plan_description",
    )
    .eq("plan_status", "active")
    .order("monthly_price_inr", { ascending: true });

  const { data: profile } = await supabase
    .from("user_billing_profiles_v2")
    .select(
      "id, plan_key, billing_status, current_period_start, current_period_end, billing_summary, limit_summary",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: counter } = profile?.id
    ? await supabase
        .from("usage_counters_v2")
        .select(
          "scans_used, websites_used, reports_used, client_portals_used, monitoring_targets_used, ai_triage_used",
        )
        .eq("user_id", user.id)
        .eq("period_start", profile.current_period_start)
        .eq("period_end", profile.current_period_end)
        .maybeSingle()
    : { data: null };

  const { data: runs } = await supabase
    .from("ai_triage_runs_v2")
    .select(
      "id, target_url, total_item_count, urgent_count, high_priority_count, quick_win_count, needs_review_count, triage_score, business_impact_score, remediation_efficiency_score, confidence_score, executive_summary, developer_summary, client_safe_summary, limitations_summary, created_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const selectedRun = selectedRunId
    ? runs?.find((run: any) => run.id === selectedRunId) || runs?.[0]
    : runs?.[0];

  const { data: items } = selectedRun?.id
    ? await supabase
        .from("ai_triage_items_v2")
        .select(
          "id, item_title, item_status, priority, severity, confidence_level, triage_rank, triage_score, business_impact_score, fix_effort_score, confidence_score, affected_area, reason_summary, developer_action, client_safe_note, blocked_claim",
        )
        .eq("run_id", selectedRun.id)
        .eq("user_id", user.id)
        .order("triage_rank", { ascending: true })
        .limit(200)
    : { data: [] };

  const { data: events } = await supabase
    .from("billing_ai_triage_events_v2")
    .select("id, title, details, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const selectedPlan = profile
    ? (plans || []).find((plan: any) => plan.plan_key === profile.plan_key) ||
      (plans || [])[0]
    : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}`}
              className="text-sm font-bold text-slate-600"
            >
              Back to report
            </Link>
            <p className="mt-4 break-all text-sm font-bold text-slate-500">
              {scan.website_url}
            </p>
          </div>
          <Link
            href="/billing-ai-triage"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Billing dashboard
          </Link>
        </div>

        <BillingAiTriagePanel
          scanId={scan.id}
          targetUrl={scan.website_url}
          plans={plans || []}
          profile={profile}
          counter={counter}
          selectedPlan={selectedPlan}
          runs={runs || []}
          selectedRun={selectedRun}
          items={items || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
