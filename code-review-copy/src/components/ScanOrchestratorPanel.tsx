import {
  createScanPipelineAction,
  retryFailedEnginesAction,
  runAllQueuedEnginesAction,
  runNextEngineAction,
} from "@/app/orchestrator/actions";

type Job = {
  id: string;
  target_url: string;
  job_name: string;
  job_status: string;
  scan_mode: string;
  authorization_status: string;
  total_engines: number;
  completed_engines: number;
  failed_engines: number;
  blocked_engines: number;
  skipped_engines: number;
  coverage_percent: number;
  weighted_coverage_percent: number;
  progress_message: string;
  safe_summary: string;
  developer_summary: string;
  created_at: string;
};

type EngineRun = {
  id: string;
  engine_key: string;
  engine_name: string;
  engine_group: string;
  engine_type: string;
  run_order: number;
  run_status: string;
  retry_count: number;
  coverage_weight: number;
  duration_ms?: number | null;
  status_message: string;
  safe_summary: string;
  evidence_summary: string;
  observations_count: number;
  findings_created_count: number;
  potential_findings_count: number;
  confirmed_findings_count: number;
};

type Event = {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  details: string;
  created_at: string;
};

function statusClass(status: string) {
  if (status === "completed") return "bg-emerald-100 text-emerald-950";
  if (status === "completed-with-warnings")
    return "bg-amber-100 text-amber-950";
  if (status === "running") return "bg-blue-100 text-blue-950";
  if (status === "failed" || status === "blocked")
    return "bg-red-100 text-red-950";
  if (status === "skipped") return "bg-slate-100 text-slate-700";
  return "bg-slate-50 text-slate-700";
}

function Stat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-black text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-black text-slate-950">{value}</p>
      {helper ? (
        <p className="mt-2 text-sm font-bold text-slate-600">{helper}</p>
      ) : null}
    </div>
  );
}

export function ScanOrchestratorPanel({
  scanId,
  targetUrl,
  jobs,
  selectedJob,
  engineRuns,
  events,
  message,
}: {
  scanId: string;
  targetUrl: string;
  jobs: Job[];
  selectedJob?: Job | null;
  engineRuns: EngineRun[];
  events: Event[];
  message?: string;
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <p className="text-sm font-black text-blue-700">Scan Orchestrator v2</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Engine Execution Pipeline
        </h1>
        <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
          {targetUrl}
        </p>
        <p className="mt-4 max-w-3xl leading-8 text-blue-900">
          Run security engines as a controlled pipeline: authorization gate,
          recon, crawler, browser security, bug finder, API discovery, accuracy
          review, reporting and monitoring setup.
        </p>
      </div>

      <form
        action={createScanPipelineAction}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <input type="hidden" name="scanId" value={scanId} />
        <h2 className="text-2xl font-black">Create new pipeline</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Select scan mode. Engines are planned with safe method limits, scope
          checks, coverage weights and blocked-action rules.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="font-bold">
            Scan mode
            <select
              name="scanMode"
              defaultValue="safe-standard"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="safe-light">Safe Light</option>
              <option value="safe-standard">Safe Standard</option>
              <option value="safe-deep">Safe Deep</option>
              <option value="authenticated-safe">Authenticated Safe</option>
            </select>
          </label>

          <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              name="permissionAccepted"
              value="yes"
              required
            />
            I confirm this website is authorized for safe security review.
          </label>

          <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              name="authenticatedContextApproved"
              value="yes"
            />
            Authenticated safe context approved.
          </label>
        </div>

        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
          Create pipeline
        </button>
      </form>

      {selectedJob ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat
              label="Pipeline coverage"
              value={`${selectedJob.coverage_percent}%`}
              helper={selectedJob.job_status}
            />
            <Stat
              label="Weighted coverage"
              value={`${selectedJob.weighted_coverage_percent}%`}
              helper="Engine importance adjusted"
            />
            <Stat
              label="Completed engines"
              value={`${selectedJob.completed_engines}/${selectedJob.total_engines}`}
              helper={selectedJob.scan_mode}
            />
            <Stat
              label="Warnings"
              value={selectedJob.failed_engines + selectedJob.blocked_engines}
              helper="Failed/blocked engines"
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black text-slate-500">
                  Selected pipeline
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {selectedJob.job_name}
                </h2>
                <p className="mt-3 leading-7 text-slate-600">
                  {selectedJob.progress_message}
                </p>
                <p className="mt-2 leading-7 text-slate-600">
                  {selectedJob.safe_summary}
                </p>
              </div>
              <span
                className={`rounded-full px-4 py-2 text-sm font-black ${statusClass(selectedJob.job_status)}`}
              >
                {selectedJob.job_status}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <form action={runNextEngineAction}>
                <input type="hidden" name="jobId" value={selectedJob.id} />
                <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                  Run next engine
                </button>
              </form>

              <form action={runAllQueuedEnginesAction}>
                <input type="hidden" name="jobId" value={selectedJob.id} />
                <button className="rounded-full bg-blue-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-900">
                  Run all queued engines
                </button>
              </form>

              <form action={retryFailedEnginesAction}>
                <input type="hidden" name="jobId" value={selectedJob.id} />
                <button className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100">
                  Retry warnings
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Engine execution pipeline</h2>
            <div className="mt-6 grid gap-4">
              {engineRuns.length ? (
                engineRuns.map((engine) => (
                  <div
                    key={engine.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          #{engine.run_order} · {engine.engine_group} ·{" "}
                          {engine.engine_type}
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          {engine.engine_name}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {engine.status_message || engine.safe_summary}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(engine.run_status)}`}
                        >
                          {engine.run_status}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                          weight {engine.coverage_weight}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Observations: {engine.observations_count}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Findings: {engine.findings_created_count}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Potential: {engine.potential_findings_count}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Confirmed: {engine.confirmed_findings_count}
                      </div>
                    </div>

                    {engine.evidence_summary ? (
                      <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                        {engine.evidence_summary}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No engine runs yet. Create a pipeline first.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent pipelines</h2>
          <div className="mt-6 grid gap-4">
            {jobs.length ? (
              jobs.map((job) => (
                <a
                  key={job.id}
                  href={`/report/${scanId}/scan-orchestrator?job=${job.id}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-black">{job.job_name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {job.scan_mode} · {job.completed_engines}/
                        {job.total_engines} engines
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(job.job_status)}`}
                    >
                      {job.job_status}
                    </span>
                  </div>
                </a>
              ))
            ) : (
              <p className="text-slate-600">No pipelines yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Pipeline events</h2>
          <div className="mt-6 grid gap-3">
            {events.length ? (
              events.map((event) => (
                <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black">{event.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {event.details}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No events yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
