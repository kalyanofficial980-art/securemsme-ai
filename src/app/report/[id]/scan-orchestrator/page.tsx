import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ScanOrchestratorPanel } from "@/components/ScanOrchestratorPanel";
import { createClient } from "@/lib/supabase/server";

export default async function ReportScanOrchestratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ job?: string; message?: string }>;
}) {
  const { id } = await params;
  const { job: selectedJobId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to run scan orchestrator");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: jobs } = await supabase
    .from("scan_orchestrator_jobs")
    .select(
      "id, target_url, job_name, job_status, scan_mode, authorization_status, total_engines, completed_engines, failed_engines, blocked_engines, skipped_engines, coverage_percent, weighted_coverage_percent, progress_message, safe_summary, developer_summary, created_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const selectedJob = selectedJobId
    ? jobs?.find((item: any) => item.id === selectedJobId) || jobs?.[0]
    : jobs?.[0];

  const { data: engineRuns } = selectedJob?.id
    ? await supabase
        .from("scan_orchestrator_engine_runs")
        .select(
          "id, engine_key, engine_name, engine_group, engine_type, run_order, run_status, retry_count, coverage_weight, duration_ms, status_message, safe_summary, evidence_summary, observations_count, findings_created_count, potential_findings_count, confirmed_findings_count",
        )
        .eq("job_id", selectedJob.id)
        .eq("user_id", user.id)
        .order("run_order", { ascending: true })
        .limit(100)
    : { data: [] };

  const { data: events } = selectedJob?.id
    ? await supabase
        .from("scan_orchestrator_events")
        .select("id, event_type, severity, title, details, created_at")
        .eq("job_id", selectedJob.id)
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
            href="/scan-orchestrator"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Orchestrator info
          </Link>
        </div>

        <ScanOrchestratorPanel
          scanId={scan.id}
          targetUrl={scan.website_url}
          jobs={jobs || []}
          selectedJob={selectedJob}
          engineRuns={engineRuns || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
