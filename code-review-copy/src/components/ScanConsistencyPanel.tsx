import { generateScanConsistencyReport } from "@/app/report/[id]/scan-consistency/actions";

type ConsistencyReport = {
  id: string;
  website_url: string;
  engine_version: string;
  current_score: number;
  previous_score?: number | null;
  score_delta?: number | null;
  current_risk?: string | null;
  previous_risk?: string | null;
  risk_transition: string;
  confidence_level: string;
  score_explanation?: {
    simpleReason?: string;
    whatThisScoreMeans?: string;
    whyItMayDifferFromOldScans?: string[];
    canClaim?: string[];
    cannotClaim?: string[];
  } | null;
  score_breakdown?: {
    totalFindings?: number;
    criticalCount?: number;
    highCount?: number;
    mediumCount?: number;
    lowInfoCount?: number;
    categoryScores?: Array<{
      category: string;
      score: number;
      grade: string;
      impact: string;
    }>;
    explanationItems?: Array<{
      label: string;
      value: string | number;
      impact: string;
      explanation: string;
    }>;
  } | null;
  delta_analysis?: {
    scoreDirection?: string;
    scoreDeltaText?: string;
    likelyReasons?: string[];
    previousScanDate?: string | null;
    currentScanDate?: string | null;
  } | null;
  consistency_warnings?: Array<{
    title: string;
    severity: string;
    message: string;
    fix: string;
  }> | null;
  latest_scan_badge?: {
    label?: string;
    isLatestKnownScan?: boolean;
    scanDate?: string | null;
  } | null;
  customer_summary: string;
  created_at: string;
};

function deltaClass(delta?: number | null) {
  if (delta === null || delta === undefined || delta === 0)
    return "text-slate-700";
  if (delta > 0) return "text-emerald-700";
  return "text-red-700";
}

function riskClass(risk?: string | null) {
  const lower = (risk || "").toLowerCase();
  if (lower.includes("critical") || lower.includes("high"))
    return "bg-red-50 text-red-900";
  if (lower.includes("medium")) return "bg-amber-50 text-amber-900";
  if (lower.includes("low")) return "bg-emerald-50 text-emerald-900";
  return "bg-slate-100 text-slate-700";
}

function warningClass(severity: string) {
  if (severity === "High") return "border-red-200 bg-red-50 text-red-950";
  if (severity === "Medium")
    return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-blue-200 bg-blue-50 text-blue-950";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}

export function ScanConsistencyPanel({
  scanId,
  websiteUrl,
  currentScore,
  currentRisk,
  createdAt,
  reports,
  message,
}: {
  scanId: string;
  websiteUrl: string;
  currentScore: number;
  currentRisk: string;
  createdAt?: string | null;
  reports: ConsistencyReport[];
  message?: string;
}) {
  const latest = reports[0];

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
              Scan Consistency + Score Explanation Engine
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Explain score, latest scan status and previous-scan differences
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Solves customer confusion when old and new scans show different
              scores. It explains what this score means and why it changed.
            </p>
          </div>

          <span className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-950">
            Current score: {currentScore}
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="break-all font-black">{websiteUrl}</p>
            <p className="mt-2 text-sm text-slate-600">Current scan URL</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="font-black">
              {createdAt ? new Date(createdAt).toLocaleString() : "Unknown"}
            </p>
            <p className="mt-2 text-sm text-slate-600">Scan date</p>
          </div>

          <div
            className={`rounded-2xl p-5 font-black ${riskClass(currentRisk)}`}
          >
            {currentRisk}
          </div>
        </div>

        <form action={generateScanConsistencyReport} className="mt-8">
          <input type="hidden" name="scanId" value={scanId} />
          <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Generate score explanation
          </button>
        </form>
      </div>

      {latest ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard label="Current" value={latest.current_score} />
            <StatCard label="Previous" value={latest.previous_score ?? "N/A"} />
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold text-slate-600">Delta</p>
              <p
                className={`mt-2 text-4xl font-black ${deltaClass(latest.score_delta)}`}
              >
                {latest.score_delta === null || latest.score_delta === undefined
                  ? "N/A"
                  : latest.score_delta > 0
                    ? `+${latest.score_delta}`
                    : latest.score_delta}
              </p>
            </div>
            <StatCard label="Confidence" value={latest.confidence_level} />
            <StatCard label="Engine" value={latest.engine_version} />
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h3 className="text-2xl font-black text-blue-950">
                  Customer-safe summary
                </h3>
                <p className="mt-3 max-w-3xl leading-7 text-blue-900">
                  {latest.customer_summary}
                </p>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-blue-900">
                {latest.latest_scan_badge?.label || "Scan"}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Why this score?</h3>
            <p className="mt-3 leading-7 text-slate-600">
              {latest.score_explanation?.simpleReason}
            </p>
            <p className="mt-3 leading-7 text-slate-600">
              {latest.score_explanation?.whatThisScoreMeans}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {(latest.score_breakdown?.explanationItems || []).map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-sm font-black text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-black">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Why score changed?</h3>
            <p className="mt-3 font-black text-slate-800">
              {latest.delta_analysis?.scoreDeltaText}
            </p>

            <div className="mt-5 grid gap-3">
              {(latest.delta_analysis?.likelyReasons || []).map((reason) => (
                <div
                  key={reason}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700"
                >
                  {reason}
                </div>
              ))}
            </div>
          </div>

          {latest.consistency_warnings?.length ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-black">Consistency warnings</h3>
              <div className="mt-6 grid gap-4">
                {latest.consistency_warnings.map((warning) => (
                  <div
                    key={warning.title}
                    className={`rounded-2xl border p-5 ${warningClass(warning.severity)}`}
                  >
                    <h4 className="font-black">{warning.title}</h4>
                    <p className="mt-2 text-sm leading-6">{warning.message}</p>
                    <p className="mt-2 text-sm font-bold">Fix: {warning.fix}</p>
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
                {(latest.score_explanation?.canClaim || []).map((claim) => (
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
                {(latest.score_explanation?.cannotClaim || []).map((claim) => (
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

          {latest.score_breakdown?.categoryScores?.length ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-black">
                Category score explanation
              </h3>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {latest.score_breakdown.categoryScores.map((category) => (
                  <div
                    key={category.category}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex justify-between gap-3">
                      <p className="font-black capitalize">
                        {category.category}
                      </p>
                      <p className="font-black">{category.score}/100</p>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-600">
                      {category.grade}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Saved consistency reports</h3>
            <div className="mt-6 grid gap-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="break-all font-black">
                        {report.website_url}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black">
                      {report.current_score} / delta{" "}
                      {report.score_delta ?? "N/A"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">
            No score explanation generated yet
          </h3>
          <p className="mt-3 leading-7 text-slate-600">
            Click generate to explain this scan score and compare it with the
            previous scan for the same website.
          </p>
        </div>
      )}
    </section>
  );
}
