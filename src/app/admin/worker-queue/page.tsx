import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { buildSchedulerSummary } from "@/lib/background-job-queue";
import { createClient } from "@/lib/supabase/server";

export default async function AdminWorkerQueuePage() {
  const supabase = await createClient();
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
    .from("background_worker_jobs")
    .select(
      "id, user_id, website_id, monitoring_job_id, source_scan_id, job_type, job_status, priority, run_after, attempts, max_attempts, locked_at, locked_by, payload, result, worker_version, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: events } = await supabase
    .from("background_worker_events")
    .select("id, event_type, severity, title, details, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const summary = buildSchedulerSummary((jobs || []) as never);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Worker queue observability</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor background jobs, due work, failures, retries and scheduler
          readiness.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold">Due</p>
            <p className="text-3xl font-black">{summary.dueCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold">Queued</p>
            <p className="text-3xl font-black">{summary.queuedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold">Running</p>
            <p className="text-3xl font-black">{summary.runningCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold">Retrying</p>
            <p className="text-3xl font-black">{summary.retryingCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold">Failed</p>
            <p className="text-3xl font-black">{summary.failedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold">Completed</p>
            <p className="text-3xl font-black">{summary.completedCount}</p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest queue jobs</h2>
          <div className="mt-6 grid gap-4">
            {jobs?.length ? (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{job.job_type}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(job.created_at || "").toLocaleString()} ·
                        priority {job.priority} · attempts {job.attempts}/
                        {job.max_attempts}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black">
                      {job.job_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No worker jobs yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest worker events</h2>
          <div className="mt-6 grid gap-4">
            {events?.length ? (
              events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-xs font-black uppercase text-slate-500">
                    {event.event_type} ·{" "}
                    {new Date(event.created_at).toLocaleString()} ·{" "}
                    {event.severity}
                  </p>
                  <h3 className="mt-1 font-black">{event.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {event.details}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No worker events yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
