import {
  createMonitoringTargetAction,
  runMonitoringProAction,
  updateMonitoringAlertAction,
} from "@/app/monitoring-pro/actions";

type Target = {
  id: string;
  target_url: string;
  target_name: string;
  monitoring_status: string;
  last_health_score: number;
  last_regression_score: number;
  last_risk_score: number;
  last_client_readiness_score: number;
  open_alert_count: number;
  critical_alert_count: number;
  high_alert_count: number;
  regression_count: number;
  verified_fixed_count: number;
  monitoring_summary: string;
  client_safe_summary: string;
  developer_summary: string;
};

type Run = {
  id: string;
  run_status: string;
  health_score: number;
  regression_score: number;
  risk_score: number;
  client_readiness_score: number;
  run_summary: string;
  regression_summary: string;
  alert_summary: string;
  created_at: string;
};

type Alert = {
  id: string;
  alert_status: string;
  alert_type: string;
  severity: string;
  alert_title: string;
  affected_area: string;
  before_summary: string;
  after_summary: string;
  evidence_summary: string;
  developer_action: string;
  client_safe_note: string;
  blocked_claim: string;
};

type Event = {
  id: string;
  title: string;
  details: string;
  created_at: string;
};

function badgeClass(value: string) {
  if (["active", "completed", "resolved", "Info", "Low"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["open", "acknowledged", "Medium", "needs-review"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["Critical", "High", "failed"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

function ScoreCard({
  label,
  score,
  helper,
}: {
  label: string;
  score: number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-black text-slate-500">{label}</p>
      <p className="mt-3 text-5xl font-black text-slate-950">{score}</p>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-950"
          style={{ width: `${Math.max(3, Math.min(100, score))}%` }}
        />
      </div>
      {helper ? (
        <p className="mt-3 text-sm font-bold text-slate-600">{helper}</p>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

export function MonitoringProPanel({
  scanId,
  targetUrl,
  targets,
  selectedTarget,
  runs,
  alerts,
  events,
  message,
}: {
  scanId: string;
  targetUrl: string;
  targets: Target[];
  selectedTarget?: Target | null;
  runs: Run[];
  alerts: Alert[];
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
        <p className="text-sm font-black text-blue-700">Mega Part 64</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Monitoring Pro
        </h1>
        <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
          {targetUrl}
        </p>
        <p className="mt-4 max-w-3xl leading-8 text-blue-900">
          Watch client readiness, retest proof, developer fix progress and
          regression alerts using passive-safe monitoring signals.
        </p>
      </div>

      <form
        action={createMonitoringTargetAction}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <input type="hidden" name="scanId" value={scanId} />
        <h2 className="text-2xl font-black">Create Monitoring Pro target</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Creates a passive monitoring profile for this scan. Monitoring Pro
          does not run exploit payloads or destructive tests.
        </p>
        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
          Create Monitoring Target
        </button>
      </form>

      {selectedTarget ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <ScoreCard
              label="Health"
              score={selectedTarget.last_health_score}
              helper={selectedTarget.monitoring_status}
            />
            <ScoreCard
              label="Regression"
              score={selectedTarget.last_regression_score}
              helper="Lower is better"
            />
            <ScoreCard
              label="Risk"
              score={selectedTarget.last_risk_score}
              helper="Lower is better"
            />
            <ScoreCard
              label="Client Readiness"
              score={selectedTarget.last_client_readiness_score}
              helper="Share readiness"
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black text-slate-500">
                  Selected monitoring target
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {selectedTarget.target_name}
                </h2>
                <p className="mt-4 max-w-4xl leading-8 text-slate-700">
                  {selectedTarget.monitoring_summary}
                </p>
                <p className="mt-2 max-w-4xl leading-7 text-slate-600">
                  {selectedTarget.client_safe_summary}
                </p>
              </div>
              <span
                className={`h-fit rounded-full px-4 py-2 text-sm font-black ${badgeClass(selectedTarget.monitoring_status)}`}
              >
                {selectedTarget.monitoring_status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <MiniStat
                label="Open alerts"
                value={selectedTarget.open_alert_count}
              />
              <MiniStat
                label="Critical"
                value={selectedTarget.critical_alert_count}
              />
              <MiniStat label="High" value={selectedTarget.high_alert_count} />
              <MiniStat
                label="Regression"
                value={selectedTarget.regression_count}
              />
              <MiniStat
                label="Verified"
                value={selectedTarget.verified_fixed_count}
              />
            </div>

            <form action={runMonitoringProAction} className="mt-6">
              <input type="hidden" name="scanId" value={scanId} />
              <input type="hidden" name="targetId" value={selectedTarget.id} />
              <button className="rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
                Run Monitoring Pro
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Regression alerts</h2>
            <div className="mt-6 grid gap-5">
              {alerts.length ? (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {alert.alert_type} · {alert.alert_status}
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          {alert.alert_title}
                        </h3>
                        <p className="mt-2 break-all text-sm font-bold text-slate-600">
                          {alert.affected_area}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(alert.severity)}`}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                        <p className="font-black">Evidence</p>
                        <p className="mt-2">{alert.evidence_summary}</p>
                      </div>
                      <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                        <p className="font-black">Developer action</p>
                        <p className="mt-2">{alert.developer_action}</p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                        <p className="font-black">Client note</p>
                        <p className="mt-2">{alert.client_safe_note}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                      Blocked claim: {alert.blocked_claim}
                    </div>

                    <form
                      action={updateMonitoringAlertAction}
                      className="mt-5 flex flex-wrap gap-3"
                    >
                      <input type="hidden" name="scanId" value={scanId} />
                      <input
                        type="hidden"
                        name="targetId"
                        value={selectedTarget.id}
                      />
                      <input type="hidden" name="alertId" value={alert.id} />
                      <select
                        name="alertStatus"
                        defaultValue={alert.alert_status}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black"
                      >
                        <option value="acknowledged">Acknowledged</option>
                        <option value="in-progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="accepted-risk">Accepted risk</option>
                      </select>
                      <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                        Update alert
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No monitoring alerts yet.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Monitoring targets and runs</h2>
          <div className="mt-6 grid gap-4">
            {targets.map((target) => (
              <a
                key={target.id}
                href={`/report/${scanId}/monitoring-pro?target=${target.id}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
              >
                <p className="font-black">
                  Health {target.last_health_score}/100 · risk{" "}
                  {target.last_risk_score}/100
                </p>
                <p className="mt-1 break-all text-sm text-slate-600">
                  {target.target_url}
                </p>
              </a>
            ))}
            {runs.map((run) => (
              <div
                key={run.id}
                className="rounded-2xl bg-blue-50 p-5 text-blue-950"
              >
                <p className="font-black">{run.run_summary}</p>
                <p className="mt-1 text-sm leading-6">
                  {run.regression_summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Events</h2>
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
