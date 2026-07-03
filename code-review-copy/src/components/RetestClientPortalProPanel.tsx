import {
  createClientPortalProLinkAction,
  createRetestRunAction,
  updateRetestItemAction,
} from "@/app/retest-client-portal-pro/actions";

type Run = {
  id: string;
  run_status: string;
  total_items: number;
  passed_items: number;
  failed_items: number;
  needs_review_items: number;
  blocked_items: number;
  pending_items: number;
  progress_score: number;
  pass_rate: number;
  proof_strength_score: number;
  client_readiness_score: number;
  executive_summary: string;
  client_safe_summary: string;
  created_at: string;
};
type Item = {
  id: string;
  title: string;
  status: string;
  priority: string;
  confidence: string;
  affected_area: string;
  before_evidence: string;
  fix_summary: string;
  safe_retest_steps: string;
  after_evidence: string;
  verification_note: string;
  client_result: string;
  blocked_claim: string;
  proof_fingerprint: string;
};
type Link = {
  id: string;
  share_token: string;
  status: string;
  executive_score: number;
  report_readiness_score: number;
  fix_progress_score: number;
  retest_pass_rate: number;
  client_readiness_score: number;
};
type Event = { id: string; title: string; details: string; created_at: string };

function badgeClass(value: string) {
  if (["passed", "completed", "active", "Ready"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["pending", "running", "ready", "needs-review"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["failed", "blocked"].includes(value)) return "bg-red-100 text-red-950";
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

export function RetestClientPortalProPanel({
  scanId,
  targetUrl,
  runs,
  selectedRun,
  items,
  links,
  events,
  message,
}: {
  scanId: string;
  targetUrl: string;
  runs: Run[];
  selectedRun?: Run | null;
  items: Item[];
  links: Link[];
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
        <p className="text-sm font-black text-blue-700">Mega Part 63</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Retest + Client Portal Pro
        </h1>
        <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
          {targetUrl}
        </p>
        <p className="mt-4 max-w-3xl leading-8 text-blue-900">
          Create safe retest proof, update verified-fix status and generate a
          shareable client portal.
        </p>
      </div>
      <form
        action={createRetestRunAction}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <input type="hidden" name="scanId" value={scanId} />
        <h2 className="text-2xl font-black">Create safe retest run</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Pulls fixed/retest-requested developer tasks into a safe proof
          workflow.
        </p>
        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
          Create Retest Run
        </button>
      </form>
      {selectedRun ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <ScoreCard
              label="Progress"
              score={selectedRun.progress_score}
              helper={selectedRun.run_status}
            />
            <ScoreCard
              label="Pass Rate"
              score={selectedRun.pass_rate}
              helper="Passed items"
            />
            <ScoreCard
              label="Proof"
              score={selectedRun.proof_strength_score}
              helper="Evidence"
            />
            <ScoreCard
              label="Client"
              score={selectedRun.client_readiness_score}
              helper="Readiness"
            />
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row">
              <div>
                <p className="text-sm font-black text-slate-500">
                  Selected retest run
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Safe Retest Proof Run
                </h2>
                <p className="mt-4 max-w-4xl leading-8 text-slate-700">
                  {selectedRun.executive_summary}
                </p>
                <p className="mt-2 max-w-4xl leading-7 text-slate-600">
                  {selectedRun.client_safe_summary}
                </p>
              </div>
              <span
                className={`h-fit rounded-full px-4 py-2 text-sm font-black ${badgeClass(selectedRun.run_status)}`}
              >
                {selectedRun.run_status}
              </span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-6">
              <MiniStat label="Total" value={selectedRun.total_items} />
              <MiniStat label="Pending" value={selectedRun.pending_items} />
              <MiniStat label="Passed" value={selectedRun.passed_items} />
              <MiniStat label="Failed" value={selectedRun.failed_items} />
              <MiniStat label="Review" value={selectedRun.needs_review_items} />
              <MiniStat label="Blocked" value={selectedRun.blocked_items} />
            </div>
            <form action={createClientPortalProLinkAction} className="mt-6">
              <input type="hidden" name="scanId" value={scanId} />
              <input type="hidden" name="runId" value={selectedRun.id} />
              <button className="rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
                Generate Client Portal Pro Link
              </button>
            </form>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Retest verification items</h2>
            <div className="mt-6 grid gap-5">
              {items.length ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {item.confidence} · {item.proof_fingerprint}
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          {item.title}
                        </h3>
                        <p className="mt-2 break-all text-sm font-bold text-slate-600">
                          {item.affected_area}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.priority)}`}
                        >
                          {item.priority}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                        <p className="font-black">Before</p>
                        <p className="mt-2">{item.before_evidence}</p>
                      </div>
                      <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                        <p className="font-black">Fix</p>
                        <p className="mt-2">{item.fix_summary}</p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                        <p className="font-black">Result</p>
                        <p className="mt-2">{item.client_result}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                      Blocked claim: {item.blocked_claim}
                    </div>
                    <form
                      action={updateRetestItemAction}
                      className="mt-5 grid gap-3 md:grid-cols-[170px_1fr_1fr_auto]"
                    >
                      <input type="hidden" name="scanId" value={scanId} />
                      <input
                        type="hidden"
                        name="runId"
                        value={selectedRun.id}
                      />
                      <input type="hidden" name="itemId" value={item.id} />
                      <select
                        name="status"
                        defaultValue={item.status}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black"
                      >
                        <option value="pending">Pending</option>
                        <option value="running">Running</option>
                        <option value="passed">Passed</option>
                        <option value="failed">Failed</option>
                        <option value="needs-review">Needs review</option>
                        <option value="blocked">Blocked</option>
                      </select>
                      <input
                        name="afterEvidence"
                        placeholder="Post-fix evidence, no private data"
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                      <input
                        name="verificationNote"
                        placeholder="Verification note"
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                      <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                        Update
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No retest items yet.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Runs and Portal Pro links</h2>
          <div className="mt-6 grid gap-4">
            {runs.map((run) => (
              <a
                key={run.id}
                href={`/report/${scanId}/retest-client-portal-pro?run=${run.id}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
              >
                <p className="font-black">
                  Retest pass rate {run.pass_rate}% · readiness{" "}
                  {run.client_readiness_score}/100
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {run.run_status} · items {run.total_items}
                </p>
              </a>
            ))}
            {links.map((link) => (
              <a
                key={link.id}
                href={`/client-portal-pro/${link.share_token}`}
                target="_blank"
                className="rounded-2xl border border-blue-200 bg-blue-50 p-5 hover:bg-blue-100"
              >
                <p className="font-black text-blue-950">
                  Client Portal Pro Link
                </p>
                <p className="mt-1 text-sm text-blue-900">
                  readiness {link.client_readiness_score}/100 · retest{" "}
                  {link.retest_pass_rate}%
                </p>
                <p className="mt-2 break-all text-xs font-bold text-blue-700">
                  /client-portal-pro/{link.share_token}
                </p>
              </a>
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
