import {
  createMonitoringJob,
  pauseMonitoringJob,
  runMonitoringEvaluation,
} from "@/app/report/[id]/monitoring/actions";

type MonitoringJob = {
  id: string;
  website_url: string;
  job_status: string;
  cadence: string;
  risk_threshold: string;
  score_drop_threshold: number;
  latest_run_at?: string | null;
  next_run_at?: string | null;
  run_count: number;
  created_at: string;
};

type MonitoringRun = {
  id: string;
  website_url: string;
  run_status: string;
  worker_version: string;
  score_before?: number | null;
  score_current: number;
  score_delta?: number | null;
  risk_before?: string | null;
  risk_current?: string | null;
  risk_transition: string;
  drift_status: string;
  regression_detected: boolean;
  regression_reasons?: Array<{
    title: string;
    severity: string;
    details: string;
  }> | null;
  run_summary?: {
    customerSummary?: string;
    developerSummary?: string;
    nextAction?: string;
    canClaim?: string[];
    cannotClaim?: string[];
  } | null;
  evidence_snapshot?: {
    evidenceQuality?: string;
    findingSignals?: number;
    currentScanDate?: string | null;
    previousScanDate?: string | null;
  } | null;
  created_at: string;
};

type MonitoringEvent = {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  details: string;
  acknowledged: boolean;
  created_at: string;
};

function statusClass(value: string) {
  if (value === "risk-increased" || value === "score-dropped")
    return "border-red-200 bg-red-50 text-red-900";
  if (value === "needs-review")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (value === "score-improved")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function severityClass(value: string) {
  if (value === "Critical") return "bg-red-100 text-red-950";
  if (value === "High") return "bg-red-50 text-red-800";
  if (value === "Medium") return "bg-amber-50 text-amber-900";
  if (value === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

function deltaText(delta?: number | null) {
  if (delta === null || delta === undefined) return "N/A";
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}

export function MonitoringPanel({
  scanId,
  websiteUrl,
  currentScore,
  currentRisk,
  jobs,
  runs,
  events,
  message,
}: {
  scanId: string;
  websiteUrl: string;
  currentScore: number;
  currentRisk: string;
  jobs: MonitoringJob[];
  runs: MonitoringRun[];
  events: MonitoringEvent[];
  message?: string;
}) {
  const activeJob = jobs.find((job) => job.job_status === "active") || jobs[0];
  const latestRun = runs[0];

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
              Continuous Monitoring Worker Foundation
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Track score drift, risk regression and monitoring events
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              This foundation compares scan snapshots, creates monitoring events
              and prepares your SaaS for background queue/cron automation.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black">
            {currentScore}/100 · {currentRisk}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="break-all font-black">{websiteUrl}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Foundation mode: manual evaluation now. Scheduled background worker
            comes in next layer.
          </p>
        </div>

        <form
          action={createMonitoringJob}
          className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6"
        >
          <input type="hidden" name="scanId" value={scanId} />

          <div className="grid gap-4 md:grid-cols-3">
            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Cadence</span>
              <select
                name="cadence"
                defaultValue={activeJob?.cadence || "daily"}
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="manual">Manual</option>
              </select>
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Score drop alert</span>
              <input
                name="scoreDropThreshold"
                type="number"
                min="1"
                max="100"
                defaultValue={activeJob?.score_drop_threshold || 10}
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              />
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Risk threshold</span>
              <select
                name="riskThreshold"
                defaultValue={activeJob?.risk_threshold || "Medium risk"}
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
              >
                <option value="Low risk">Low risk</option>
                <option value="Medium risk">Medium risk</option>
                <option value="High risk">High risk</option>
                <option value="Critical risk">Critical risk</option>
              </select>
            </label>
          </div>

          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Enable / update monitoring
          </button>
        </form>

        {activeJob ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={runMonitoringEvaluation}>
              <input type="hidden" name="scanId" value={scanId} />
              <button className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-black text-white hover:bg-emerald-800">
                Run monitoring evaluation
              </button>
            </form>

            <form action={pauseMonitoringJob}>
              <input type="hidden" name="scanId" value={scanId} />
              <input type="hidden" name="jobId" value={activeJob.id} />
              <button className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black hover:bg-slate-100">
                Pause monitoring
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {activeJob ? (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h3 className="text-2xl font-black text-blue-950">
            Monitoring job active
          </h3>
          <p className="mt-3 leading-7 text-blue-900">
            Cadence: {activeJob.cadence} · Score drop alert:{" "}
            {activeJob.score_drop_threshold}+ · Risk threshold:{" "}
            {activeJob.risk_threshold}
          </p>
          <p className="mt-2 text-sm font-bold text-blue-800">
            Next run:{" "}
            {activeJob.next_run_at
              ? new Date(activeJob.next_run_at).toLocaleString()
              : "not scheduled yet"}
          </p>
        </div>
      ) : null}

      {latestRun ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard label="Current" value={latestRun.score_current} />
            <StatCard label="Before" value={latestRun.score_before ?? "N/A"} />
            <StatCard label="Delta" value={deltaText(latestRun.score_delta)} />
            <StatCard
              label="Evidence"
              value={latestRun.evidence_snapshot?.evidenceQuality || "N/A"}
            />
            <StatCard
              label="Signals"
              value={latestRun.evidence_snapshot?.findingSignals ?? 0}
            />
          </div>

          <div
            className={`rounded-3xl border p-8 ${statusClass(latestRun.drift_status)}`}
          >
            <h3 className="text-2xl font-black">Latest monitoring run</h3>
            <p className="mt-3 max-w-3xl leading-7">
              {latestRun.run_summary?.customerSummary}
            </p>
            <p className="mt-3 text-sm font-bold">
              Drift: {latestRun.drift_status} · Risk transition:{" "}
              {latestRun.risk_transition} · Worker {latestRun.worker_version}
            </p>
          </div>

          {latestRun.regression_reasons?.length ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-black">Regression reasons</h3>
              <div className="mt-6 grid gap-4">
                {latestRun.regression_reasons.map((reason) => (
                  <div
                    key={reason.title}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-black text-amber-950">
                          {reason.title}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-amber-900">
                          {reason.details}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(reason.severity)}`}
                      >
                        {reason.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
              <h3 className="text-2xl font-black text-emerald-950">
                Can claim
              </h3>
              <div className="mt-5 grid gap-3">
                {(latestRun.run_summary?.canClaim || []).map((claim) => (
                  <div
                    key={claim}
                    className="rounded-2xl bg-white/80 p-4 text-sm font-bold text-emerald-900"
                  >
                    {claim}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
              <h3 className="text-2xl font-black text-red-950">Cannot claim</h3>
              <div className="mt-5 grid gap-3">
                {(latestRun.run_summary?.cannotClaim || []).map((claim) => (
                  <div
                    key={claim}
                    className="rounded-2xl bg-white/80 p-4 text-sm font-bold text-red-900"
                  >
                    {claim}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">No monitoring run yet</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Enable monitoring, then run evaluation to create baseline and
            monitoring event.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Monitoring events</h3>
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
              No monitoring events yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
