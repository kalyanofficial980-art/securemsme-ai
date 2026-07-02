import {
  cancelWorkerJob,
  enqueueMonitoringWorkerJob,
  runDueWorkerJob,
} from "@/app/report/[id]/queue/actions";
import { buildSchedulerSummary } from "@/lib/background-job-queue";

export type QueueJob = {
  id: string;
  job_type: string;
  job_status: string;
  priority: number;
  run_after: string;
  attempts: number;
  max_attempts: number;
  locked_at?: string | null;
  locked_by?: string | null;
  last_error?: string | null;
  result?: Record<string, unknown> | null;
  worker_version: string;
  created_at: string;
};

type QueueAttempt = {
  id: string;
  worker_job_id: string;
  attempt_number: number;
  attempt_status: string;
  worker_id: string;
  started_at: string;
  completed_at?: string | null;
  error_message?: string | null;
};

type QueueEvent = {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  details: string;
  created_at: string;
};

function statusClass(status: string) {
  if (status === "completed")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (["failed", "cancelled"].includes(status))
    return "border-red-200 bg-red-50 text-red-900";
  if (["running", "locked", "retrying"].includes(status))
    return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function severityClass(value: string) {
  if (["Critical", "High"].includes(value)) return "bg-red-50 text-red-900";
  if (value === "Medium") return "bg-amber-50 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}

export function BackgroundQueuePanel({
  scanId,
  websiteUrl,
  monitoringReady,
  jobs,
  attempts,
  events,
  message,
}: {
  scanId: string;
  websiteUrl: string;
  monitoringReady: boolean;
  jobs: QueueJob[];
  attempts: QueueAttempt[];
  events: QueueEvent[];
  message?: string;
}) {
  const summary = buildSchedulerSummary(jobs as never);
  const dueJob = jobs.find((job) =>
    ["queued", "retrying"].includes(job.job_status),
  );

  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black text-slate-500">
              Background Job Queue + Worker Scheduler
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Queue, lock, run and retry monitoring worker jobs
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              This foundation creates worker jobs, picks due work, locks jobs,
              stores attempts, handles failures and prepares automatic cron.
            </p>
          </div>

          <span className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black">
            Worker {summary.workerVersion}
          </span>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="break-all font-black">{websiteUrl}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Development mode: manual worker run. Next layer can connect this to
            scheduled cron.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <form action={enqueueMonitoringWorkerJob}>
            <input type="hidden" name="scanId" value={scanId} />
            <button
              disabled={!monitoringReady}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Enqueue monitoring worker job
            </button>
          </form>

          <form action={runDueWorkerJob}>
            <input type="hidden" name="scanId" value={scanId} />
            <button className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-black text-white hover:bg-emerald-800">
              Run next due worker job
            </button>
          </form>
        </div>

        {!monitoringReady ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            Enable Continuous Monitoring first, then enqueue queue worker job.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <StatCard label="Due" value={summary.dueCount} />
        <StatCard label="Queued" value={summary.queuedCount} />
        <StatCard label="Running" value={summary.runningCount} />
        <StatCard label="Retrying" value={summary.retryingCount} />
        <StatCard label="Failed" value={summary.failedCount} />
        <StatCard label="Completed" value={summary.completedCount} />
      </div>

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <h3 className="text-2xl font-black text-blue-950">Scheduler summary</h3>
        <p className="mt-3 max-w-3xl leading-7 text-blue-900">
          {summary.nextAction}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {summary.safetyBoundary.map((item) => (
            <div
              key={item}
              className="rounded-2xl bg-white/80 p-4 text-sm font-bold text-blue-900"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Queue jobs</h3>
        <div className="mt-6 grid gap-4">
          {jobs.length ? (
            jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="font-black">{job.job_type}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Priority {job.priority} · Attempts {job.attempts}/
                      {job.max_attempts} · Run after{" "}
                      {new Date(job.run_after).toLocaleString()}
                    </p>
                    {job.last_error ? (
                      <p className="mt-2 text-sm font-bold text-red-700">
                        {job.last_error}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(job.job_status)}`}
                    >
                      {job.job_status}
                    </span>
                    {!["completed", "running", "locked", "cancelled"].includes(
                      job.job_status,
                    ) ? (
                      <form action={cancelWorkerJob}>
                        <input type="hidden" name="scanId" value={scanId} />
                        <input type="hidden" name="jobId" value={job.id} />
                        <button className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-700 hover:bg-red-50">
                          Cancel
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No background worker jobs yet.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Worker attempts</h3>
        <div className="mt-6 grid gap-4">
          {attempts.length ? (
            attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="font-black">
                      Attempt #{attempt.attempt_number}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {attempt.worker_id} ·{" "}
                      {new Date(attempt.started_at).toLocaleString()}
                    </p>
                    {attempt.error_message ? (
                      <p className="mt-2 text-sm font-bold text-red-700">
                        {attempt.error_message}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(attempt.attempt_status)}`}
                  >
                    {attempt.attempt_status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No worker attempts yet.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Worker events</h3>
        <div className="mt-6 grid gap-4">
          {events.length ? (
            events.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {event.event_type} ·{" "}
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                    <h4 className="mt-1 font-black">{event.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {event.details}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(event.severity)}`}
                  >
                    {event.severity}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No worker events yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
