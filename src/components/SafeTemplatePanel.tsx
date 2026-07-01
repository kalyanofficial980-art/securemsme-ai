import { runSafeTemplatesForScan } from "@/app/report/[id]/safe-templates/actions";
import type {
  SafeTemplateEngineReport,
  SafeTemplateFinding,
} from "@/lib/safe-template-engine";

type SavedTemplateJob = {
  id: string;
  status: string;
  tool_mode: string;
  result_summary?: Record<string, unknown> | null;
  created_at: string;
};

function severityClass(severity: SafeTemplateFinding["severity"]) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-900";
  if (severity === "Low") return "bg-slate-100 text-slate-700";

  return "bg-emerald-50 text-emerald-800";
}

function statusClass(status: SafeTemplateFinding["status"]) {
  if (status === "matched")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "manual-review")
    return "border-purple-200 bg-purple-50 text-purple-900";
  if (status === "blocked") return "border-red-200 bg-red-50 text-red-900";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function SafeTemplatePanel({
  scanId,
  report,
  savedJobs,
  message,
}: {
  scanId: string;
  report: SafeTemplateEngineReport;
  savedJobs: SavedTemplateJob[];
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
              Safe Nuclei-style template engine
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Template-based security checks
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              {report.summary}
            </p>
          </div>

          <form action={runSafeTemplatesForScan}>
            <input type="hidden" name="scanId" value={scanId} />
            <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Run safe templates
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-600">Templates</p>
            <p className="mt-2 text-4xl font-black">{report.totalTemplates}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-bold text-blue-700">Executed</p>
            <p className="mt-2 text-4xl font-black text-blue-950">
              {report.executedTemplates}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-bold text-emerald-700">Matched</p>
            <p className="mt-2 text-4xl font-black text-emerald-950">
              {report.matchedTemplates}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-700">Blocked</p>
            <p className="mt-2 text-4xl font-black text-red-950">
              {report.blockedTemplates}
            </p>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <p className="text-sm font-bold text-purple-700">Manual review</p>
            <p className="mt-2 text-4xl font-black text-purple-950">
              {report.manualReviewTemplates}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-black">
            Verified scope: {report.verifiedScope ? "Yes" : "No"}
          </p>
          <p className="mt-2 break-all text-sm leading-6 text-slate-600">
            Website: {report.websiteUrl}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h3 className="text-2xl font-black text-red-950">
          Unsafe templates blocked
        </h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {report.safeBoundary.map((item) => (
            <div
              key={item}
              className="rounded-2xl bg-white/70 p-4 font-bold text-red-900"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Template findings</h3>
        <div className="mt-6 grid gap-5">
          {report.findings.length ? (
            report.findings.map((finding) => (
              <div
                key={`${finding.templateId}-${finding.status}`}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {finding.templateId} · {finding.category} ·{" "}
                      {finding.scope}
                    </p>
                    <h4 className="mt-1 text-xl font-black">
                      {finding.templateName}
                    </h4>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(
                        finding.severity,
                      )}`}
                    >
                      {finding.severity}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                        finding.status,
                      )}`}
                    >
                      {finding.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      FP {finding.falsePositiveRisk}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-700">
                  <p>
                    <span className="font-black text-slate-950">
                      Customer impact:
                    </span>{" "}
                    {finding.customerImpact}
                  </p>
                  <p>
                    <span className="font-black text-slate-950">
                      Developer fix:
                    </span>{" "}
                    {finding.developerFix}
                  </p>

                  <div>
                    <p className="font-black text-slate-950">Evidence</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {finding.evidence.map((evidence) => (
                        <li key={evidence} className="break-all">
                          {evidence}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">
                      Can claim: {finding.canClaim}
                    </div>
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-900">
                      Cannot claim: {finding.cannotClaim}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No safe template findings matched this report.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Saved safe template jobs</h3>
        <div className="mt-6 grid gap-4">
          {savedJobs.length ? (
            savedJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <p className="font-black">Job {job.id.slice(0, 8)}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {new Date(job.created_at).toLocaleString()} · {job.tool_mode}{" "}
                  · {job.status}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No saved safe template jobs yet. Run safe templates to store
              evidence in Supabase.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
