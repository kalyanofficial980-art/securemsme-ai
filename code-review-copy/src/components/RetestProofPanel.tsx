import { generateRetestProof } from "@/app/report/[id]/retest-proof/actions";

type ScanOption = {
  id: string;
  website_url: string;
  score: number | null;
  risk_level?: string | null;
  created_at: string;
};

type ProofReportRow = {
  id: string;
  proof_status: string;
  score_before: number | null;
  score_after: number | null;
  score_change: number;
  fixed_count: number;
  improved_count: number;
  still_open_count: number;
  new_issue_count: number;
  high_priority_count: number;
  evidence_diff?: {
    fixedItems?: Array<DiffItem>;
    improvedItems?: Array<DiffItem>;
    stillOpenItems?: Array<DiffItem>;
    newIssues?: Array<DiffItem>;
  } | null;
  proof_summary?: {
    customerSummary?: string;
    proofStatements?: string[];
    safeClaim?: string;
    blockedClaim?: string;
  } | null;
  developer_next_actions?: string[] | null;
  created_at: string;
};

type DiffItem = {
  title: string;
  category: string;
  severity: string;
  status: string;
  proofNote: string;
  developerFix: string;
  evidence?: string[];
  beforeEvidence?: string[];
  afterEvidence?: string[];
};

function statusClass(status: string) {
  if (status === "verified-improvement")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "regression-risk")
    return "border-red-200 bg-red-50 text-red-900";
  if (status === "no-change")
    return "border-slate-200 bg-slate-50 text-slate-700";

  return "border-amber-200 bg-amber-50 text-amber-900";
}

function severityClass(severity: string) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-900";
  if (severity === "Low") return "bg-slate-100 text-slate-700";

  return "bg-emerald-50 text-emerald-800";
}

function DiffList({ title, items }: { title: string; items: DiffItem[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8">
      <h3 className="text-2xl font-black">{title}</h3>
      <div className="mt-6 grid gap-4">
        {items.length ? (
          items.slice(0, 12).map((item) => (
            <div
              key={`${item.status}-${item.category}-${item.title}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">
                    {item.category} · {item.status}
                  </p>
                  <h4 className="mt-1 font-black">{item.title}</h4>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(item.severity)}`}
                >
                  {item.severity}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.proofNote}
              </p>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-800">
                Developer action: {item.developerFix}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
            No items in this section.
          </p>
        )}
      </div>
    </div>
  );
}

export function RetestProofPanel({
  afterScanId,
  currentScan,
  previousScans,
  proofReports,
  message,
}: {
  afterScanId: string;
  currentScan: ScanOption;
  previousScans: ScanOption[];
  proofReports: ProofReportRow[];
  message?: string;
}) {
  const latest = proofReports[0];
  const diff = latest?.evidence_diff || {};
  const fixedItems = diff.fixedItems || [];
  const improvedItems = diff.improvedItems || [];
  const stillOpenItems = diff.stillOpenItems || [];
  const newIssues = diff.newIssues || [];

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
              Retest proof automation
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Before/after evidence comparison
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Compare an older scan with this retest to show what was fixed,
              improved, still open, or newly observed.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-600">Current retest</p>
            <p className="mt-1 font-black">
              Score {currentScan.score ?? "N/A"}
            </p>
            <p className="text-sm text-slate-500">
              {new Date(currentScan.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <form
          action={generateRetestProof}
          className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6"
        >
          <input type="hidden" name="afterScanId" value={afterScanId} />

          <label className="font-black" htmlFor="beforeScanId">
            Choose previous scan as “before”
          </label>
          <select
            id="beforeScanId"
            name="beforeScanId"
            className="mt-3 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
            required
          >
            <option value="">Select previous scan</option>
            {previousScans.map((scan) => (
              <option key={scan.id} value={scan.id}>
                {new Date(scan.created_at).toLocaleString()} · Score{" "}
                {scan.score ?? "N/A"} · {scan.risk_level || "Risk unknown"}
              </option>
            ))}
          </select>

          <button
            disabled={!previousScans.length}
            className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Generate retest proof
          </button>

          {!previousScans.length ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
              No previous scan found. Run at least two scans for the same
              website to generate retest proof.
            </p>
          ) : null}
        </form>
      </div>

      {latest ? (
        <>
          <div
            className={`rounded-3xl border p-8 ${statusClass(latest.proof_status)}`}
          >
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black">Latest proof report</p>
                <h3 className="mt-2 text-3xl font-black">
                  {latest.proof_summary?.customerSummary ||
                    "Retest proof generated"}
                </h3>
                <p className="mt-3 text-sm font-bold">
                  Generated {new Date(latest.created_at).toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl bg-white/70 p-5">
                <p className="text-sm font-bold">Score change</p>
                <p className="mt-1 text-5xl font-black">
                  {latest.score_change >= 0 ? "+" : ""}
                  {latest.score_change}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold text-slate-600">Before</p>
              <p className="mt-2 text-4xl font-black">
                {latest.score_before ?? "N/A"}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-bold text-emerald-700">After</p>
              <p className="mt-2 text-4xl font-black text-emerald-950">
                {latest.score_after ?? "N/A"}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-bold text-emerald-700">Fixed</p>
              <p className="mt-2 text-4xl font-black text-emerald-950">
                {latest.fixed_count}
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-bold text-blue-700">Improved</p>
              <p className="mt-2 text-4xl font-black text-blue-950">
                {latest.improved_count}
              </p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-bold text-red-700">Still/New</p>
              <p className="mt-2 text-4xl font-black text-red-950">
                {latest.still_open_count + latest.new_issue_count}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Proof statements</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(latest.proof_summary?.proofStatements || []).map(
                (statement) => (
                  <div
                    key={statement}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold"
                  >
                    {statement}
                  </div>
                ),
              )}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                Can claim: {latest.proof_summary?.safeClaim}
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
                Cannot claim: {latest.proof_summary?.blockedClaim}
              </div>
            </div>
          </div>

          <DiffList title="Fixed items" items={fixedItems} />
          <DiffList title="Improved items" items={improvedItems} />
          <DiffList title="Still open items" items={stillOpenItems} />
          <DiffList title="New issues" items={newIssues} />

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
            <h3 className="text-2xl font-black text-blue-950">
              Developer next actions
            </h3>
            <div className="mt-5 grid gap-3">
              {(latest.developer_next_actions || []).map((action) => (
                <div
                  key={action}
                  className="rounded-2xl bg-white/70 p-4 font-bold text-blue-900"
                >
                  {action}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">No proof report yet</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Choose a previous scan and generate proof to show before/after
            changes.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Saved proof history</h3>
        <div className="mt-6 grid gap-4">
          {proofReports.length ? (
            proofReports.map((proof) => (
              <div
                key={proof.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="font-black">
                      {proof.proof_status.replaceAll("-", " ")}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {new Date(proof.created_at).toLocaleString()} · score{" "}
                      {proof.score_before ?? "N/A"} →{" "}
                      {proof.score_after ?? "N/A"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(proof.proof_status)}`}
                  >
                    {proof.score_change >= 0 ? "+" : ""}
                    {proof.score_change}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No saved retest proof yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
