import { generateClientReportV4Action } from "@/app/client-report-v4/actions";

type Snapshot = {
  id: string;
  report_title: string;
  target_url: string;
  report_status: string;
  executive_score: number;
  report_readiness_score: number;
  business_risk_score: number;
  technical_risk_score: number;
  evidence_strength_score: number;
  confirmed_count: number;
  high_confidence_count: number;
  needs_manual_review_count: number;
  open_action_count: number;
  executive_summary: string;
  business_impact_summary: string;
  developer_summary: string;
  client_safe_summary: string;
  limitations_summary: string;
  created_at: string;
};

type Section = {
  id: string;
  section_title: string;
  section_type: string;
  visibility: string;
  confidence_level: string;
  risk_level: string;
  section_body: string;
  evidence_summary: string;
  action_summary: string;
  blocked_claim: string;
};

type Metric = {
  id: string;
  metric_label: string;
  metric_value: string;
  metric_status: string;
  explanation: string;
  evidence_reference: string;
};

type Event = {
  id: string;
  title: string;
  details: string;
  created_at: string;
};

function badgeClass(value: string) {
  if (["ready", "positive", "Low", "Info", "Confirmed", "High"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (
    ["needs-review", "warning", "Medium", "Needs manual review"].includes(value)
  )
    return "bg-amber-100 text-amber-950";
  if (["critical", "High", "Critical"].includes(value))
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

export function ClientReportV4Panel({
  scanId,
  targetUrl,
  snapshots,
  selectedSnapshot,
  sections,
  metrics,
  events,
  message,
}: {
  scanId: string;
  targetUrl: string;
  snapshots: Snapshot[];
  selectedSnapshot?: Snapshot | null;
  sections: Section[];
  metrics: Metric[];
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
        <p className="text-sm font-black text-blue-700">Client Report v4</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Executive Security Dashboard
        </h1>
        <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
          {targetUrl}
        </p>
      </div>

      <form
        action={generateClientReportV4Action}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <input type="hidden" name="scanId" value={scanId} />
        <h2 className="text-2xl font-black">
          Generate Client Report v4 snapshot
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Pulls signals from crawler, API review, authenticated review, evidence
          warehouse, accuracy foundation, clusters and workspace.
        </p>
        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
          Generate Report v4
        </button>
      </form>

      {selectedSnapshot ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <ScoreCard
              label="Executive"
              score={selectedSnapshot.executive_score}
              helper={selectedSnapshot.report_status}
            />
            <ScoreCard
              label="Readiness"
              score={selectedSnapshot.report_readiness_score}
            />
            <ScoreCard
              label="Business Risk"
              score={selectedSnapshot.business_risk_score}
              helper="Lower is better"
            />
            <ScoreCard
              label="Technical Risk"
              score={selectedSnapshot.technical_risk_score}
            />
            <ScoreCard
              label="Evidence"
              score={selectedSnapshot.evidence_strength_score}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black text-slate-500">
                  Executive snapshot
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {selectedSnapshot.report_title}
                </h2>
                <p className="mt-4 max-w-4xl leading-8 text-slate-700">
                  {selectedSnapshot.executive_summary}
                </p>
              </div>
              <span
                className={`h-fit rounded-full px-4 py-2 text-sm font-black ${badgeClass(selectedSnapshot.report_status)}`}
              >
                {selectedSnapshot.report_status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <MiniStat
                label="Confirmed"
                value={selectedSnapshot.confirmed_count}
              />
              <MiniStat
                label="High confidence"
                value={selectedSnapshot.high_confidence_count}
              />
              <MiniStat
                label="Needs review"
                value={selectedSnapshot.needs_manual_review_count}
              />
              <MiniStat
                label="Open actions"
                value={selectedSnapshot.open_action_count}
              />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-blue-50 p-5 text-sm leading-6 text-blue-900">
                <p className="font-black">Business impact</p>
                <p className="mt-2">
                  {selectedSnapshot.business_impact_summary}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                <p className="font-black">Developer summary</p>
                <p className="mt-2">{selectedSnapshot.developer_summary}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
                <p className="font-black">Client-safe summary</p>
                <p className="mt-2">{selectedSnapshot.client_safe_summary}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Executive metrics</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                >
                  <div className="flex justify-between gap-3">
                    <p className="font-black">{metric.metric_label}</p>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(metric.metric_status)}`}
                    >
                      {metric.metric_status}
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-black">
                    {metric.metric_value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {metric.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Report sections</h2>
            <div className="mt-6 grid gap-5">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        {section.section_type} · {section.visibility} ·{" "}
                        {section.confidence_level}
                      </p>
                      <h3 className="mt-2 text-xl font-black">
                        {section.section_title}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(section.risk_level)}`}
                    >
                      {section.risk_level}
                    </span>
                  </div>
                  <p className="mt-4 rounded-2xl bg-white p-4 leading-7 text-slate-700">
                    {section.section_body}
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                      <p className="font-black">Evidence</p>
                      <p className="mt-2">{section.evidence_summary}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                      <p className="font-black">Action</p>
                      <p className="mt-2">{section.action_summary}</p>
                    </div>
                    <div className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-900">
                      <p className="font-black">Blocked claim</p>
                      <p className="mt-2">{section.blocked_claim}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent report snapshots</h2>
          <div className="mt-6 grid gap-4">
            {snapshots.length ? (
              snapshots.map((snapshot) => (
                <a
                  key={snapshot.id}
                  href={`/report/${scanId}/client-report-v4?snapshot=${snapshot.id}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
                >
                  <p className="font-black">
                    Executive {snapshot.executive_score}/100 · readiness{" "}
                    {snapshot.report_readiness_score}/100
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    business risk {snapshot.business_risk_score}/100 ·{" "}
                    {snapshot.report_status}
                  </p>
                </a>
              ))
            ) : (
              <p className="text-slate-600">
                No Client Report v4 snapshot yet.
              </p>
            )}
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
