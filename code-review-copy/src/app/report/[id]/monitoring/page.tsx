import Link from "next/link";
import { redirect } from "next/navigation";
import { MonitoringPanel } from "@/components/MonitoringPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function MonitoringPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to view monitoring");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_id, website_url, score, risk_level")
    .eq("id", id);

  if (profile?.role !== "admin") scanQuery = scanQuery.eq("user_id", user.id);

  const { data: scan } = await scanQuery.single();
  if (!scan) redirect("/dashboard?message=Monitoring report not found");

  const { data: jobs } = scan.website_id
    ? await supabase
        .from("monitoring_jobs")
        .select(
          "id, website_url, job_status, cadence, risk_threshold, score_drop_threshold, latest_run_at, next_run_at, run_count, created_at",
        )
        .eq("user_id", scan.user_id)
        .eq("website_id", scan.website_id)
        .order("created_at", { ascending: false })
        .limit(10)
    : await supabase
        .from("monitoring_jobs")
        .select(
          "id, website_url, job_status, cadence, risk_threshold, score_drop_threshold, latest_run_at, next_run_at, run_count, created_at",
        )
        .eq("user_id", scan.user_id)
        .eq("website_url", scan.website_url)
        .order("created_at", { ascending: false })
        .limit(10);

  const activeJobId = jobs?.[0]?.id;

  const { data: runs } = activeJobId
    ? await supabase
        .from("monitoring_runs")
        .select(
          "id, website_url, run_status, worker_version, score_before, score_current, score_delta, risk_before, risk_current, risk_transition, drift_status, regression_detected, regression_reasons, run_summary, evidence_snapshot, created_at",
        )
        .eq("monitoring_job_id", activeJobId)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const { data: events } = activeJobId
    ? await supabase
        .from("monitoring_events")
        .select(
          "id, event_type, severity, title, details, acknowledged, created_at",
        )
        .eq("monitoring_job_id", activeJobId)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/truth-cleanup`}
              className="text-sm font-bold text-slate-600"
            >
              Back to truth cleanup
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Continuous Monitoring
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Score drift, security regression and monitoring event foundation.
            </p>
          </div>

          <Link
            href="/monitoring-worker"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Monitoring info
          </Link>
        </div>

        <MonitoringPanel
          scanId={scan.id}
          websiteUrl={scan.website_url}
          currentScore={scan.score || 0}
          currentRisk={scan.risk_level || "Unknown risk"}
          jobs={jobs || []}
          runs={runs || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
