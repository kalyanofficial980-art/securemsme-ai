import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function statusClass(status: string) {
  if (status === "completed") return "bg-emerald-100 text-emerald-950";
  if (status === "completed-with-warnings")
    return "bg-amber-100 text-amber-950";
  if (status === "running") return "bg-blue-100 text-blue-950";
  if (status === "failed" || status === "blocked")
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminScanOrchestratorPage() {
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login as admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    redirect("/dashboard?message=Admin access required");

  const { data: jobs } = await supabase
    .from("scan_orchestrator_jobs")
    .select(
      "id, target_url, job_name, job_status, scan_mode, total_engines, completed_engines, failed_engines, blocked_engines, coverage_percent, weighted_coverage_percent, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: engines } = await supabase
    .from("scan_orchestrator_engine_runs")
    .select(
      "id, engine_name, engine_group, run_status, observations_count, findings_created_count, duration_ms, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Scan Orchestrator Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor engine execution pipelines, coverage, warnings and worker
          status.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent pipelines</h2>
          <div className="mt-6 grid gap-4">
            {jobs?.length ? (
              jobs.map((job: any) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        {job.scan_mode}
                      </p>
                      <h3 className="mt-1 font-black">{job.job_name}</h3>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        {job.target_url}
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-700">
                        {job.completed_engines}/{job.total_engines} engines ·
                        coverage {job.coverage_percent}% · weighted{" "}
                        {job.weighted_coverage_percent}%
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(job.job_status)}`}
                    >
                      {job.job_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No pipelines yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent engine runs</h2>
          <div className="mt-6 grid gap-4">
            {engines?.length ? (
              engines.map((engine: any) => (
                <div
                  key={engine.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        {engine.engine_group}
                      </p>
                      <h3 className="mt-1 font-black">{engine.engine_name}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        observations {engine.observations_count} · findings{" "}
                        {engine.findings_created_count} ·{" "}
                        {engine.duration_ms || 0}ms
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(engine.run_status)}`}
                    >
                      {engine.run_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No engine runs yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
