import { runPassiveWorkerForScan } from "@/app/report/[id]/passive-worker/actions";
import type {
  PassiveAlert,
  PassiveZapWorkerReport,
} from "@/lib/passive-zap-worker";

type SavedPassiveJob = {
  id: string;
  status: string;
  tool_mode: string;
  result_summary?: Record<string, unknown> | null;
  created_at: string;
};

function severityClass(severity: PassiveAlert["severity"]) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-900";
  if (severity === "Low") return "bg-slate-100 text-slate-700";

  return "bg-emerald-50 text-emerald-800";
}

function statusClass(status: PassiveAlert["status"]) {
  if (status === "observed")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "manual-review")
    return "border-purple-200 bg-purple-50 text-purple-900";
  if (status === "blocked") return "border-red-200 bg-red-50 text-red-900";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function PassiveWorkerPanel({
  scanId,
  report,
  savedJobs,
  message,
}: {
  scanId: string;
  report: PassiveZapWorkerReport;
  savedJobs: SavedPassiveJob[];
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
              Passive ZAP-style worker
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Passive alerts and safe page discovery
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              {report.summary}
            </p>
          </div>

          <form action={runPassiveWorkerForScan}>
            <input type="hidden" name="scanId" value={scanId} />
            <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Run passive worker
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-600">Pages observed</p>
            <p className="mt-2 text-4xl font-black">{report.pagesObserved}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-bold text-blue-700">Links discovered</p>
            <p className="mt-2 text-4xl font-black text-blue-950">
              {report.linksDiscovered}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-bold text-amber-700">Passive alerts</p>
            <p className="mt-2 text-4xl font-black text-amber-950">
              {report.alertsObserved}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-700">Blocked actions</p>
            <p className="mt-2 text-4xl font-black text-red-950">
              {report.blockedActions}
            </p>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <p className="text-sm font-bold text-purple-700">
              Normalized evidence
            </p>
            <p className="mt-2 text-4xl font-black text-purple-950">
              {report.normalizedEvidence.length}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-black">Mode: {report.mode}</p>
          <p className="mt-2 break-all text-sm leading-6 text-slate-600">
            Verified scope: {report.verifiedScope ? "Yes" : "No"} · Website:{" "}
            {report.websiteUrl}
          </p>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Crawl limit: {report.policy.maxPages} pages · Same-origin only:{" "}
            {report.policy.sameOriginOnly ? "Yes" : "No"}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h3 className="text-2xl font-black text-red-950">
          Passive worker safety boundary
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
        <h3 className="text-2xl font-black">Passive alerts</h3>
        <div className="mt-6 grid gap-5">
          {report.alerts.length ? (
            report.alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {alert.id} · {alert.category}
                    </p>
                    <h4 className="mt-1 text-xl font-black">{alert.title}</h4>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(
                        alert.severity,
                      )}`}
                    >
                      {alert.severity}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                        alert.status,
                      )}`}
                    >
                      {alert.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      FP {alert.falsePositiveRisk}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-700">
                  <p>
                    <span className="font-black text-slate-950">
                      Customer impact:
                    </span>{" "}
                    {alert.customerImpact}
                  </p>
                  <p>
                    <span className="font-black text-slate-950">
                      Developer fix:
                    </span>{" "}
                    {alert.developerFix}
                  </p>

                  <div>
                    <p className="font-black text-slate-950">Evidence</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {alert.evidence.map((evidence) => (
                        <li key={evidence} className="break-all">
                          {evidence}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">
                      Can claim: {alert.canClaim}
                    </div>
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-900">
                      Cannot claim: {alert.cannotClaim}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No passive alerts matched this report.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Observed pages</h3>
        <div className="mt-6 grid gap-4">
          {report.observations.map((page) => (
            <div
              key={page.url}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <p className="break-all font-black">{page.url}</p>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Links discovered: {page.discoveredLinks.length}
              </p>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
                {page.signals.slice(0, 5).map((signal) => (
                  <li key={signal} className="break-all">
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Saved passive worker jobs</h3>
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
              No saved passive worker jobs yet. Run passive worker to store
              evidence in Supabase.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
