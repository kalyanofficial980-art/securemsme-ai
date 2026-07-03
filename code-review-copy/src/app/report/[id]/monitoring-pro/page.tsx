import Link from "next/link";
import { redirect } from "next/navigation";
import { MonitoringProPanel } from "@/components/MonitoringProPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ReportMonitoringProPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ target?: string; message?: string }>;
}) {
  const { id } = await params;
  const { target: selectedTargetId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to view Monitoring Pro");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: targets } = await supabase
    .from("monitoring_pro_targets_v2")
    .select(
      "id, target_url, target_name, monitoring_status, last_health_score, last_regression_score, last_risk_score, last_client_readiness_score, open_alert_count, critical_alert_count, high_alert_count, regression_count, verified_fixed_count, monitoring_summary, client_safe_summary, developer_summary",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const selectedTarget = selectedTargetId
    ? targets?.find((item: any) => item.id === selectedTargetId) || targets?.[0]
    : targets?.[0];

  const { data: runs } = selectedTarget?.id
    ? await supabase
        .from("monitoring_pro_runs_v2")
        .select(
          "id, run_status, health_score, regression_score, risk_score, client_readiness_score, run_summary, regression_summary, alert_summary, created_at",
        )
        .eq("target_id", selectedTarget.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  const { data: alerts } = selectedTarget?.id
    ? await supabase
        .from("monitoring_regression_alerts_v2")
        .select(
          "id, alert_status, alert_type, severity, alert_title, affected_area, before_summary, after_summary, evidence_summary, developer_action, client_safe_note, blocked_claim",
        )
        .eq("target_id", selectedTarget.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const { data: events } = selectedTarget?.id
    ? await supabase
        .from("monitoring_soc_events_v2")
        .select("id, title, details, created_at")
        .eq("target_id", selectedTarget.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

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
            href="/agency-soc"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Agency SOC
          </Link>
        </div>

        <MonitoringProPanel
          scanId={scan.id}
          targetUrl={scan.website_url}
          targets={targets || []}
          selectedTarget={selectedTarget}
          runs={runs || []}
          alerts={alerts || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
