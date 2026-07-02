import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import { enqueueDueMonitoringJobs, runDueCronWorkerBatch } from "./actions";

export default async function AdminCronWorkerPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
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

  const { data: batches } = await supabase
    .from("cron_worker_batches")
    .select(
      "id, worker_name, trigger_source, batch_status, picked_count, completed_count, failed_count, skipped_count, started_at, completed_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: events } = await supabase
    .from("cron_worker_events")
    .select("id, event_type, severity, title, details, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: queuedJobs } = await supabase
    .from("background_worker_jobs")
    .select(
      "id, job_type, job_status, scheduled_for, attempts_count, max_attempts, last_error, created_at",
    )
    .in("job_status", ["queued", "retrying", "running", "failed"])
    .order("scheduled_for", { ascending: true })
    .limit(30);

  const { data: dueMonitoring } = await supabase
    .from("monitoring_jobs")
    .select("id")
    .eq("job_status", "active")
    .lte("next_run_at", new Date().toISOString());

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Cron worker batch processor
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Pick due monitoring jobs, enqueue background work, process batches,
          track attempts, failures and retries. Real external cron can call
          /api/cron/worker.
        </p>

        {message ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
            {message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-600">Due monitoring</p>
            <p className="mt-2 text-4xl font-black">
              {dueMonitoring?.length || 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-600">Queue visible</p>
            <p className="mt-2 text-4xl font-black">
              {queuedJobs?.length || 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-600">Batches</p>
            <p className="mt-2 text-4xl font-black">{batches?.length || 0}</p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Manual development controls</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={enqueueDueMonitoringJobs}>
              <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
                Enqueue due monitoring jobs
              </button>
            </form>

            <form
              action={runDueCronWorkerBatch}
              className="flex flex-wrap gap-3"
            >
              <input
                name="maxJobs"
                type="number"
                min="1"
                max="50"
                defaultValue="5"
                className="w-28 rounded-full border border-slate-300 px-4 py-3 text-sm font-bold"
              />
              <button className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-black text-white hover:bg-emerald-800">
                Run due batch
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Queue jobs</h2>
          <div className="mt-6 grid gap-4">
            {queuedJobs?.length ? (
              queuedJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{job.job_type}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Due{" "}
                        {job.scheduled_for
                          ? new Date(job.scheduled_for).toLocaleString()
                          : "N/A"}
                      </p>
                      {job.last_error ? (
                        <p className="mt-2 text-sm font-bold text-red-700">
                          {job.last_error}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black">
                      {job.job_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">
                No queued/retrying/running/failed jobs.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent batches</h2>
          <div className="mt-6 grid gap-4">
            {batches?.length ? (
              batches.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{batch.worker_name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {batch.trigger_source} ·{" "}
                        {new Date(batch.created_at).toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-700">
                        picked {batch.picked_count}, completed{" "}
                        {batch.completed_count}, failed {batch.failed_count},
                        skipped {batch.skipped_count}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black">
                      {batch.batch_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No cron batches yet.</p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Cron events</h2>
          <div className="mt-6 grid gap-4">
            {events?.length ? (
              events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-xs font-black uppercase text-slate-500">
                    {event.event_type} · {event.severity} ·{" "}
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                  <h3 className="mt-1 font-black">{event.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {event.details}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No cron worker events yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
