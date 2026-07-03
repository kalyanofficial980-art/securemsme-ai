import { runRealModulesForScan } from "@/app/report/[id]/real-modules/actions";
import type { PentestIntensity } from "@/lib/authorized-pentest-engine";

type SavedRun = {
  id: string;
  intensity: string;
  status: string;
  total_modules: number;
  completed_modules: number;
  failed_modules: number;
  blocked_modules: number;
  result_summary?: Record<string, unknown> | null;
  created_at: string;
};

type SavedModule = {
  id: string;
  module_name: string;
  module_category: string;
  status: string;
  risk_level: string;
  evidence: string[];
  output_summary?: {
    customerName?: string;
    findings?: Array<{
      title: string;
      severity: string;
      category: string;
      evidence: string[];
      customerImpact: string;
      developerFix: string;
      safeClaim: string;
      blockedClaim: string;
    }>;
    outputSummary?: Record<string, unknown>;
  } | null;
  safe_claim: string;
  blocked_claim: string;
  created_at: string;
};

function statusClass(status: string) {
  if (status === "completed")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "failed") return "border-red-200 bg-red-50 text-red-900";
  if (status === "blocked") return "border-red-300 bg-red-100 text-red-950";
  if (status === "skipped")
    return "border-slate-200 bg-slate-50 text-slate-700";

  return "border-blue-200 bg-blue-50 text-blue-900";
}

function severityClass(severity: string) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-900";
  if (severity === "Low") return "bg-slate-100 text-slate-700";

  return "bg-emerald-50 text-emerald-800";
}

export function RealModulesPanel({
  scanId,
  targetUrl,
  verifiedScope,
  savedRuns,
  savedModules,
  message,
}: {
  scanId: string;
  targetUrl: string;
  verifiedScope: boolean;
  savedRuns: SavedRun[];
  savedModules: SavedModule[];
  message?: string;
}) {
  const latestRun = savedRuns[0];
  const latestSummary = latestRun?.result_summary || {};

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
              Real backend security modules
            </p>
            <h2 className="mt-2 text-3xl font-black">
              HTTP, TLS, DNS and controlled service evidence
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              These modules run only after website verification and permission.
              They collect real non-destructive evidence and block private
              targets, brute force, exploit payloads, and data extraction.
            </p>
          </div>

          <div
            className={
              verifiedScope
                ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-950"
                : "rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-950"
            }
          >
            {verifiedScope ? "Verified scope ready" : "Locked"}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="break-all font-black">{targetUrl}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Real modules: HTTP headers, TLS certificate, DNS/email records, and
            controlled public service discovery.
          </p>
        </div>

        <form
          action={runRealModulesForScan}
          className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6"
        >
          <input type="hidden" name="scanId" value={scanId} />

          <div className="grid gap-4 md:grid-cols-3">
            {(["light", "standard", "deep"] as PentestIntensity[]).map(
              (intensity) => (
                <label
                  key={intensity}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <input
                    type="radio"
                    name="intensity"
                    value={intensity}
                    defaultChecked={intensity === "standard"}
                    className="mr-2"
                  />
                  <span className="font-black capitalize">{intensity}</span>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {intensity === "light"
                      ? "Checks HTTP, TLS, DNS, and only 80/443 services."
                      : intensity === "deep"
                        ? "Adds more controlled service ports. Still no payloads."
                        : "Balanced real module run for most MSME websites."}
                  </p>
                </label>
              ),
            )}
          </div>

          <label className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
            <input type="checkbox" name="permissionAccepted" className="mt-1" />
            <span>
              I confirm I own or am authorized to test this website. I allow
              SecureMSME AI to run only non-destructive HTTP, TLS, DNS, and
              controlled connection checks within verified scope.
            </span>
          </label>

          <button
            disabled={!verifiedScope}
            className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Run real modules
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-bold text-slate-600">Latest modules</p>
          <p className="mt-2 text-4xl font-black">
            {latestRun?.total_modules || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-bold text-emerald-700">Completed</p>
          <p className="mt-2 text-4xl font-black text-emerald-950">
            {latestRun?.completed_modules || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-bold text-red-700">Failed/blocked</p>
          <p className="mt-2 text-4xl font-black text-red-950">
            {(latestRun?.failed_modules || 0) +
              (latestRun?.blocked_modules || 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-700">High priority</p>
          <p className="mt-2 text-4xl font-black text-amber-950">
            {String(latestSummary.highPriorityFindings || 0)}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h3 className="text-2xl font-black text-red-950">Safety boundary</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            "No exploit payloads",
            "No brute force",
            "No login bypass",
            "No form submission",
            "No destructive testing",
            "No private data collection",
            "Private/internal targets blocked",
            "Controlled low-rate checks only",
          ].map((item) => (
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
        <h3 className="text-2xl font-black">Latest module evidence</h3>
        <div className="mt-6 grid gap-5">
          {savedModules.length ? (
            savedModules.map((module) => (
              <div
                key={module.id}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {module.module_category} · {module.risk_level}
                    </p>
                    <h4 className="mt-1 text-xl font-black">
                      {module.output_summary?.customerName ||
                        module.module_name}
                    </h4>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(module.status)}`}
                  >
                    {module.status}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="font-black text-slate-950">Evidence</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-slate-600">
                    {(module.evidence || []).slice(0, 8).map((item) => (
                      <li key={item} className="break-all">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {module.output_summary?.findings?.length ? (
                  <div className="mt-5 grid gap-3">
                    {module.output_summary.findings.map((finding) => (
                      <div
                        key={finding.title}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                          <p className="font-black">{finding.title}</p>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(finding.severity)}`}
                          >
                            {finding.severity}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {finding.customerImpact}
                        </p>
                        <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
                          Developer fix: {finding.developerFix}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                    Can claim: {module.safe_claim}
                  </div>
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
                    Cannot claim: {module.blocked_claim}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No real module evidence saved yet.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Saved real module runs</h3>
        <div className="mt-6 grid gap-4">
          {savedRuns.length ? (
            savedRuns.map((run) => (
              <div
                key={run.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="font-black">Run {run.id.slice(0, 8)}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {new Date(run.created_at).toLocaleString()} ·{" "}
                      {run.intensity}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(run.status)}`}
                  >
                    {run.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No real module runs yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
