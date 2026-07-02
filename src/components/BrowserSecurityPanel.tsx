import { runBrowserSecurityAnalysis } from "@/app/report/[id]/browser-security/actions";

type BrowserInventory = {
  id: string;
  target_url: string;
  analyzer_status: string;
  summary?: { customerSummary?: string } | null;
  browser_security_score: number;
  page_count: number;
  finding_count: number;
  csp_finding_count: number;
  cors_finding_count: number;
  cookie_finding_count: number;
  clickjacking_finding_count: number;
  mixed_content_count: number;
  external_script_count: number;
  high_risk_count: number;
  created_at: string;
};

type BrowserFinding = {
  id: string;
  category: string;
  title: string;
  severity: string;
  confidence: string;
  affected_url: string;
  observed_value?: string | null;
  expected_value?: string | null;
  evidence_summary: string;
  business_impact: string;
  developer_fix: string;
  safe_claim: string;
  blocked_claim: string;
};

function severityClass(severity: string) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-900";
  if (severity === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

function scoreClass(score: number) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  return "text-red-700";
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}

export function BrowserSecurityPanel({
  scanId,
  targetUrl,
  verifiedScope,
  inventories,
  findings,
  message,
}: {
  scanId: string;
  targetUrl: string;
  verifiedScope: boolean;
  inventories: BrowserInventory[];
  findings: BrowserFinding[];
  message?: string;
}) {
  const latest = inventories[0];

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
              Advanced Browser Security Analyzer v2
            </p>
            <h2 className="mt-2 text-3xl font-black">
              CSP, CORS, cookies, clickjacking, HSTS and client-side signals
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Reviews browser-facing security controls using safe GET-only
              observation and stores normalized evidence.
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
            GET-only. No form submission. No exploit payloads. No private body
            storage. No credential/session storage.
          </p>
        </div>

        <form
          action={runBrowserSecurityAnalysis}
          className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6"
        >
          <input type="hidden" name="scanId" value={scanId} />

          <div className="grid gap-4 md:grid-cols-3">
            {["light", "standard", "deep"].map((intensity) => (
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
                    ? "Small page sample."
                    : intensity === "deep"
                      ? "Larger route sample from attack surface inventory."
                      : "Balanced browser security analysis."}
                </p>
              </label>
            ))}
          </div>

          <label className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
            <input type="checkbox" name="permissionAccepted" className="mt-1" />
            <span>
              I confirm I own or am authorized to test this website. I allow
              safe GET-only browser security observation. No forms, exploit
              payloads, or private data storage are allowed.
            </span>
          </label>

          <button
            disabled={!verifiedScope}
            className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Run browser security analyzer
          </button>
        </form>
      </div>

      {latest ? (
        <>
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <p className="text-sm font-black text-slate-500">
              Browser security score
            </p>
            <p
              className={`mt-2 text-7xl font-black ${scoreClass(latest.browser_security_score)}`}
            >
              {latest.browser_security_score}
            </p>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              {latest.summary?.customerSummary ||
                "Browser security inventory saved."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <StatCard label="Pages" value={latest.page_count} />
            <StatCard label="Findings" value={latest.finding_count} />
            <StatCard label="CSP" value={latest.csp_finding_count} />
            <StatCard label="CORS" value={latest.cors_finding_count} />
            <StatCard label="Cookies" value={latest.cookie_finding_count} />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Clickjacking"
              value={latest.clickjacking_finding_count}
            />
            <StatCard
              label="Mixed content"
              value={latest.mixed_content_count}
            />
            <StatCard
              label="External scripts"
              value={latest.external_script_count}
            />
            <StatCard label="High risk" value={latest.high_risk_count} />
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
            <h3 className="text-2xl font-black text-red-950">
              Safety boundary
            </h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                "GET-only observation",
                "No form submission",
                "No POST/PUT/PATCH/DELETE",
                "No exploit payloads",
                "No private body storage",
                "No credential/session storage",
                "No destructive testing",
                "Verified scope required",
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
            <h3 className="text-2xl font-black">Browser security findings</h3>
            <div className="mt-6 grid gap-4">
              {findings.length ? (
                findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {finding.category} · {finding.confidence} confidence
                        </p>
                        <h4 className="mt-1 font-black">{finding.title}</h4>
                        <p className="mt-1 break-all text-sm text-slate-600">
                          {finding.affected_url}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(finding.severity)}`}
                      >
                        {finding.severity}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {finding.evidence_summary}
                    </p>

                    {finding.observed_value ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                        Observed: {finding.observed_value}
                      </p>
                    ) : null}

                    <p className="mt-3 text-sm font-bold text-slate-800">
                      Developer fix: {finding.developer_fix}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No browser security findings saved yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Saved browser security runs</h3>
            <div className="mt-6 grid gap-4">
              {inventories.map((inventory) => (
                <div
                  key={inventory.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="break-all font-black">
                        {inventory.target_url}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(inventory.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">
                      {inventory.analyzer_status}
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
            No browser security analysis yet
          </h3>
          <p className="mt-3 leading-7 text-slate-600">
            Run analyzer to review CSP, CORS, cookies, clickjacking, HSTS,
            Referrer-Policy, Permissions-Policy, mixed content and external
            scripts.
          </p>
        </div>
      )}
    </section>
  );
}
