import { runCmsWordPressScannerForScan } from "@/app/report/[id]/cms-wordpress/actions";
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

type CmsFinding = {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  confidence: string;
  evidence: string[];
  customerImpact: string;
  developerFix: string;
  safeClaim: string;
  blockedClaim: string;
};

type CmsObservation = {
  url: string;
  path: string;
  method: string;
  status: number | null;
  contentType: string | null;
  contentLength: string | null;
  headerSample: string[];
  bodySampleStored: boolean;
  bodySampleLength: number;
  errorMessage?: string;
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
    findings?: CmsFinding[];
    observations?: CmsObservation[];
    pluginSignals?: string[];
    themeSignals?: string[];
    versionSignals?: string[];
    developerHardeningChecklist?: string[];
    outputSummary?: Record<string, unknown>;
  } | null;
  safe_claim: string;
  blocked_claim: string;
  created_at: string;
};

function statusClass(status: string) {
  if (status === "completed" || status === "detected")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "manual-review")
    return "border-purple-200 bg-purple-50 text-purple-900";
  if (status === "blocked") return "border-red-200 bg-red-50 text-red-900";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function severityClass(severity: string) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-900";
  if (severity === "Low") return "bg-slate-100 text-slate-700";

  return "bg-emerald-50 text-emerald-800";
}

export function CmsWordPressPanel({
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
  const latestModule = savedModules[0];
  const findings = latestModule?.output_summary?.findings || [];
  const observations = latestModule?.output_summary?.observations || [];
  const pluginSignals = latestModule?.output_summary?.pluginSignals || [];
  const themeSignals = latestModule?.output_summary?.themeSignals || [];
  const versionSignals = latestModule?.output_summary?.versionSignals || [];
  const checklist =
    latestModule?.output_summary?.developerHardeningChecklist || [];

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
              CMS/WordPress deep risk scanner
            </p>
            <h2 className="mt-2 text-3xl font-black">
              WordPress, WooCommerce, plugin and admin-surface review
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Runs safe public WordPress/CMS checks after verification. No
              passwords, brute force, login bypass, exploit payloads, or private
              data collection.
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
            Checks wp-json, wp-login, wp-admin, XML-RPC HEAD-only, public
            plugin/theme signals, WooCommerce signals, default files, and user
            endpoint status without storing user data.
          </p>
        </div>

        <form
          action={runCmsWordPressScannerForScan}
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
                      ? "Main page and WordPress REST signal checks."
                      : intensity === "deep"
                        ? "Adds WooCommerce and user endpoint status review."
                        : "Adds login/admin/XML-RPC/default file review."}
                  </p>
                </label>
              ),
            )}
          </div>

          <label className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
            <input type="checkbox" name="permissionAccepted" className="mt-1" />
            <span>
              I confirm I own or am authorized to test this website. I allow
              SecureMSME AI to run safe WordPress/CMS GET/HEAD checks only
              within verified scope.
            </span>
          </label>

          <button
            disabled={!verifiedScope}
            className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Run CMS/WordPress scanner
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-bold text-slate-600">WordPress</p>
          <p className="mt-2 text-3xl font-black">
            {latestSummary.wordpressDetected ? "Detected" : "Unknown"}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-bold text-emerald-700">WooCommerce</p>
          <p className="mt-2 text-3xl font-black text-emerald-950">
            {latestSummary.woocommerceDetected ? "Detected" : "Unknown"}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-700">Findings</p>
          <p className="mt-2 text-4xl font-black text-amber-950">
            {String(latestSummary.findings || findings.length)}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-bold text-blue-700">Plugin signals</p>
          <p className="mt-2 text-4xl font-black text-blue-950">
            {String(latestSummary.pluginSignals || pluginSignals.length)}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h3 className="text-2xl font-black text-red-950">Safety boundary</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            "Only GET and HEAD requests",
            "No password guessing",
            "No brute force",
            "No login bypass",
            "No XML-RPC POST calls",
            "No exploit payloads",
            "User endpoint bodies are not stored",
            "Sensitive-path bodies are not stored",
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

      {pluginSignals.length || themeSignals.length || versionSignals.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">Detected public signals</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-black">Plugins</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {pluginSignals.slice(0, 20).join(", ") ||
                  "No plugin signals saved"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-black">Themes</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {themeSignals.slice(0, 10).join(", ") ||
                  "No theme signals saved"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-black">Version-like signals</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {versionSignals.slice(0, 8).join(" | ") ||
                  "No version signals saved"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">CMS findings</h3>
        <div className="mt-6 grid gap-5">
          {findings.length ? (
            findings.map((finding) => (
              <div
                key={finding.id}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {finding.category} · {finding.confidence}
                    </p>
                    <h4 className="mt-1 text-xl font-black">{finding.title}</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(finding.severity)}`}
                    >
                      {finding.severity}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(finding.status)}`}
                    >
                      {finding.status}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {finding.customerImpact}
                </p>
                <p className="mt-3 text-sm font-bold leading-6 text-slate-800">
                  Developer fix: {finding.developerFix}
                </p>

                <ul className="mt-4 list-inside list-disc space-y-1 text-sm leading-6 text-slate-600">
                  {finding.evidence.slice(0, 8).map((item) => (
                    <li key={item} className="break-all">
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                    Can claim: {finding.safeClaim}
                  </div>
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
                    Cannot claim: {finding.blockedClaim}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No CMS findings saved yet.
            </p>
          )}
        </div>
      </div>

      {checklist.length ? (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h3 className="text-2xl font-black text-blue-950">
            WordPress developer hardening checklist
          </h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {checklist.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white/70 p-4 font-bold text-blue-900"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Path observations</h3>
        <div className="mt-6 grid gap-4">
          {observations.length ? (
            observations.map((observation) => (
              <div
                key={`${observation.method}-${observation.url}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                  <p className="break-all font-black">
                    {observation.method} {observation.url}
                  </p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                    {observation.status || "failed"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Content-Type: {observation.contentType || "not observed"} ·
                  Content-Length: {observation.contentLength || "not observed"}{" "}
                  · Body sample stored:{" "}
                  {observation.bodySampleStored ? "yes" : "no"}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No path observations saved yet.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Saved CMS scanner runs</h3>
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
              No CMS scanner runs yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
