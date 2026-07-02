import { createAgencySocSnapshotAction } from "@/app/monitoring-pro/actions";

type Snapshot = {
  id: string;
  total_client_count: number;
  active_monitoring_count: number;
  open_alert_count: number;
  critical_alert_count: number;
  high_alert_count: number;
  regression_count: number;
  verified_fixed_count: number;
  agency_health_score: number;
  agency_risk_score: number;
  agency_response_score: number;
  executive_summary: string;
  operations_summary: string;
  client_safe_summary: string;
  created_at: string;
};

type Risk = {
  id: string;
  client_name: string;
  target_url: string;
  risk_level: string;
  risk_score: number;
  health_score: number;
  open_alert_count: number;
  regression_count: number;
  top_issue: string;
  recommended_action: string;
  client_safe_note: string;
};

function badgeClass(value: string) {
  if (["Low", "Info"].includes(value)) return "bg-emerald-100 text-emerald-950";
  if (["Medium"].includes(value)) return "bg-amber-100 text-amber-950";
  if (["Critical", "High"].includes(value)) return "bg-red-100 text-red-950";
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

export function AgencySocPanel({
  snapshots,
  selectedSnapshot,
  risks,
  message,
}: {
  snapshots: Snapshot[];
  selectedSnapshot?: Snapshot | null;
  risks: Risk[];
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
          Agency SOC Dashboard
        </h1>
        <p className="mt-4 max-w-3xl leading-8 text-blue-900">
          Multi-client security operations overview for monitoring alerts,
          regressions, client risk ranking and response priority.
        </p>
      </div>

      <form
        action={createAgencySocSnapshotAction}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <h2 className="text-2xl font-black">Create Agency SOC snapshot</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Aggregates Monitoring Pro targets into a safe agency-level dashboard.
          This is an internal prioritization view.
        </p>
        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
          Create SOC Snapshot
        </button>
      </form>

      {selectedSnapshot ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <ScoreCard
              label="Agency Health"
              score={selectedSnapshot.agency_health_score}
              helper="Average posture"
            />
            <ScoreCard
              label="Agency Risk"
              score={selectedSnapshot.agency_risk_score}
              helper="Lower is better"
            />
            <ScoreCard
              label="Response Score"
              score={selectedSnapshot.agency_response_score}
              helper="Ops response"
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-3xl font-black">SOC snapshot</h2>
            <p className="mt-4 max-w-4xl leading-8 text-slate-700">
              {selectedSnapshot.executive_summary}
            </p>
            <p className="mt-2 max-w-4xl leading-7 text-slate-600">
              {selectedSnapshot.operations_summary}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-7">
              <MiniStat
                label="Clients"
                value={selectedSnapshot.total_client_count}
              />
              <MiniStat
                label="Active"
                value={selectedSnapshot.active_monitoring_count}
              />
              <MiniStat
                label="Open alerts"
                value={selectedSnapshot.open_alert_count}
              />
              <MiniStat
                label="Critical"
                value={selectedSnapshot.critical_alert_count}
              />
              <MiniStat
                label="High"
                value={selectedSnapshot.high_alert_count}
              />
              <MiniStat
                label="Regression"
                value={selectedSnapshot.regression_count}
              />
              <MiniStat
                label="Verified"
                value={selectedSnapshot.verified_fixed_count}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Client risk watchlist</h2>
            <div className="mt-6 grid gap-5">
              {risks.length ? (
                risks.map((risk) => (
                  <div
                    key={risk.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {risk.client_name}
                        </p>
                        <h3 className="mt-2 break-all text-xl font-black">
                          {risk.target_url}
                        </h3>
                        <p className="mt-2 text-sm font-bold text-slate-600">
                          {risk.top_issue}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(risk.risk_level)}`}
                      >
                        {risk.risk_level}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                      <MiniStat label="Risk" value={`${risk.risk_score}/100`} />
                      <MiniStat
                        label="Health"
                        value={`${risk.health_score}/100`}
                      />
                      <MiniStat label="Alerts" value={risk.open_alert_count} />
                      <MiniStat
                        label="Regression"
                        value={risk.regression_count}
                      />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                        <p className="font-black">Recommended action</p>
                        <p className="mt-2">{risk.recommended_action}</p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                        <p className="font-black">Client-safe note</p>
                        <p className="mt-2">{risk.client_safe_note}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No client risk rows yet.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">Recent SOC snapshots</h2>
        <div className="mt-6 grid gap-4">
          {snapshots.length ? (
            snapshots.map((snapshot) => (
              <a
                key={snapshot.id}
                href={`/agency-soc?snapshot=${snapshot.id}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
              >
                <p className="font-black">
                  Health {snapshot.agency_health_score}/100 · risk{" "}
                  {snapshot.agency_risk_score}/100
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  clients {snapshot.total_client_count} · alerts{" "}
                  {snapshot.open_alert_count}
                </p>
              </a>
            ))
          ) : (
            <p className="text-slate-600">No SOC snapshots yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
