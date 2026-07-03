import { saveKnownRiskReview } from "@/app/report/[id]/known-risks/actions";
import type { CveInsight, CveIntelligenceReport } from "@/lib/cve-intelligence";

type SavedRiskRecord = {
  id: string;
  technology_name: string;
  risk_title: string;
  severity: string;
  confidence: string;
  created_at: string;
};

function severityClass(severity: CveInsight["severity"] | string) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-900";
  if (severity === "Low") return "bg-slate-100 text-slate-700";

  return "bg-emerald-50 text-emerald-800";
}

function statusClass(status: CveInsight["status"]) {
  if (status === "known-risk-review")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "version-review-needed")
    return "border-purple-200 bg-purple-50 text-purple-900";
  if (status === "technology-risk-signal")
    return "border-blue-200 bg-blue-50 text-blue-900";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function KnownRisksPanel({
  scanId,
  report,
  savedRecords,
  message,
}: {
  scanId: string;
  report: CveIntelligenceReport;
  savedRecords: SavedRiskRecord[];
  message?: string;
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black text-slate-500">
              Known technology risks
            </p>
            <h2 className="mt-2 text-3xl font-black">
              CVE-aware review without overclaiming
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              {report.customerSummary}
            </p>
          </div>

          <form action={saveKnownRiskReview}>
            <input type="hidden" name="scanId" value={scanId} />
            <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Save known risk review
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-600">Technologies</p>
            <p className="mt-2 text-4xl font-black">
              {report.totalTechnologies}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-bold text-emerald-700">Version known</p>
            <p className="mt-2 text-4xl font-black text-emerald-950">
              {report.versionKnownCount}
            </p>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <p className="text-sm font-bold text-purple-700">Version unknown</p>
            <p className="mt-2 text-4xl font-black text-purple-950">
              {report.versionUnknownCount}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-700">High priority</p>
            <p className="mt-2 text-4xl font-black text-red-950">
              {report.highPriorityCount}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
        <h3 className="text-2xl font-black text-amber-950">
          CVE certainty rules
        </h3>
        <div className="mt-5 grid gap-3">
          {report.certaintyRules.map((rule) => (
            <div
              key={rule}
              className="rounded-2xl bg-white/70 p-4 font-bold text-amber-900"
            >
              {rule}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Detected technologies</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {report.detectedTechnologies.length ? (
            report.detectedTechnologies.map((tech) => (
              <div
                key={tech.name}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="font-black">{tech.name}</p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {tech.category} · Version: {tech.version || "Not visible"}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Confidence: {tech.confidence}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No technology signals were detected in this report.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Known risk insights</h3>
        <div className="mt-6 grid gap-5">
          {report.insights.length ? (
            report.insights.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {item.technologyFamily} · {item.riskCategory}
                    </p>
                    <h4 className="mt-1 text-xl font-black">
                      {item.riskTitle}
                    </h4>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(item.severity)}`}
                    >
                      {item.severity}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.status)}`}
                    >
                      {item.status.replaceAll("-", " ")}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-700">
                  <p>
                    <span className="font-black text-slate-950">
                      Detected version:
                    </span>{" "}
                    {item.detectedVersion || "Not visible"}
                  </p>
                  <p>
                    <span className="font-black text-slate-950">
                      Customer explanation:
                    </span>{" "}
                    {item.customerExplanation}
                  </p>
                  <p>
                    <span className="font-black text-slate-950">
                      Developer recommendation:
                    </span>{" "}
                    {item.developerRecommendation}
                  </p>
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
                    {item.cveCertaintyRule}
                  </p>

                  <div>
                    <p className="font-black text-slate-950">Evidence</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {item.evidence.map((evidence) => (
                        <li key={evidence} className="break-all">
                          {evidence}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">
                      Can claim: {item.safeClaim}
                    </div>
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-900">
                      Cannot claim: {item.blockedClaim}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No known technology risk insights were generated for this report.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <h3 className="text-2xl font-black text-blue-950">
          Developer upgrade checklist
        </h3>
        <div className="mt-5 grid gap-3">
          {report.developerActions.map((action) => (
            <div
              key={action}
              className="rounded-2xl bg-white/70 p-4 font-bold text-blue-900"
            >
              {action}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Saved known risk records</h3>
        <div className="mt-6 grid gap-4">
          {savedRecords.length ? (
            savedRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <p className="font-black">{record.risk_title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {record.technology_name} · {record.severity} ·{" "}
                  {record.confidence} ·{" "}
                  {new Date(record.created_at).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No saved known risk review yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
