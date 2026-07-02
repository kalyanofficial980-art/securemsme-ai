import { runAccessControlReview } from "@/app/report/[id]/access-control/actions";

type AccessControlRun = {
  id: string;
  target_url: string;
  review_status: string;
  comparison_mode: string;
  summary?: { customerSummary?: string } | null;
  route_review_count: number;
  comparison_count: number;
  sensitive_route_signal_count: number;
  admin_route_signal_count: number;
  object_id_signal_count: number;
  unexpected_access_signal_count: number;
  blocked_route_count: number;
  private_evidence_block_count: number;
  high_risk_count: number;
  created_at: string;
};

type RouteComparison = {
  id: string;
  url: string;
  path: string;
  expected_access: string;
  low_role_status?: number | null;
  high_role_status?: number | null;
  comparison_result: string;
  risk_level: string;
  risk_signals: string[];
  object_id_signals: string[];
  route_sensitivity: string;
  private_body_stored: boolean;
};

type AccessFinding = {
  id: string;
  category: string;
  title: string;
  severity: string;
  confidence: string;
  affected_url: string;
  observed_value?: string | null;
  expected_value?: string | null;
  risk_signals: string[];
  evidence_summary: string;
  business_impact: string;
  developer_fix: string;
  safe_claim: string;
  blocked_claim: string;
};

type AuthRequest = {
  id: string;
  admin_review_status?: string | null;
  status?: string | null;
  allowed_paths?: string[] | null;
  blocked_paths?: string[] | null;
  expires_at?: string | null;
};

function statusClass(value: string) {
  if (value === "potential-bac-signal")
    return "border-red-200 bg-red-50 text-red-900";
  if (value === "needs-review")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (value === "blocked")
    return "border-slate-300 bg-slate-100 text-slate-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function riskClass(value: string) {
  if (value === "Critical") return "bg-red-100 text-red-950";
  if (value === "High") return "bg-red-50 text-red-800";
  if (value === "Medium") return "bg-amber-50 text-amber-900";
  if (value === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}

export function AccessControlPanel({
  scanId,
  targetUrl,
  verifiedScope,
  approvedRequest,
  latestRequest,
  runs,
  comparisons,
  findings,
  message,
}: {
  scanId: string;
  targetUrl: string;
  verifiedScope: boolean;
  approvedRequest: boolean;
  latestRequest?: AuthRequest | null;
  runs: AccessControlRun[];
  comparisons: RouteComparison[];
  findings: AccessFinding[];
  message?: string;
}) {
  const latest = runs[0];

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
              Broken Access Control Signal Engine
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Metadata-only role, route and object authorization signals
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Reviews privileged-route expectations, low-role access metadata,
              optional dual-role differences and object identifier signals.
            </p>
          </div>

          <div
            className={
              verifiedScope && approvedRequest
                ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-950"
                : "rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-950"
            }
          >
            {verifiedScope && approvedRequest ? "Ready" : "Locked"}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="break-all font-black">{targetUrl}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Verified scope: {verifiedScope ? "yes" : "no"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="font-black">Authenticated request status</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Admin review: {latestRequest?.admin_review_status || "none"} ·
              status: {latestRequest?.status || "none"}
            </p>
          </div>
        </div>

        <form
          action={runAccessControlReview}
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
                    ? "Small route review."
                    : intensity === "deep"
                      ? "Larger route and role-boundary review."
                      : "Balanced access-control review."}
                </p>
              </label>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <label className="font-black">Comparison mode</label>
            <select
              name="comparisonMode"
              defaultValue="low-privilege-metadata"
              className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
            >
              <option value="low-privilege-metadata">
                Low-privilege metadata review
              </option>
              <option value="dual-role-metadata">
                Dual-role metadata comparison
              </option>
            </select>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Dual-role mode is optional. Both session values are used in memory
              only and never saved.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <label className="font-black">Low-role session mode</label>
              <select
                name="lowRoleSessionMode"
                defaultValue="none"
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
              >
                <option value="none">No session header</option>
                <option value="cookie">Cookie header, in memory only</option>
                <option value="authorization">
                  Authorization/Bearer, in memory only
                </option>
              </select>
              <textarea
                name="lowRoleSessionValue"
                rows={3}
                placeholder="Optional low-privilege test session. Never use admin/customer real session."
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <label className="font-black">High-role session mode</label>
              <select
                name="highRoleSessionMode"
                defaultValue="none"
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
              >
                <option value="none">No session header</option>
                <option value="cookie">Cookie header, in memory only</option>
                <option value="authorization">
                  Authorization/Bearer, in memory only
                </option>
              </select>
              <textarea
                name="highRoleSessionValue"
                rows={3}
                placeholder="Optional high-role test session for dual-role mode only. Never use real production admin."
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <label className="font-black">Expected privileged paths</label>
            <textarea
              name="expectedPrivilegedPaths"
              rows={5}
              defaultValue={
                "/admin\n/admin/users\n/settings\n/billing\n/orders"
              }
              className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
            <p className="mt-2 text-sm leading-6 text-slate-600">
              One path per line. These routes should not be accessible to
              low-privilege users unless intentionally allowed.
            </p>
          </div>

          <label className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
            <input type="checkbox" name="permissionAccepted" className="mt-1" />
            <span>
              I confirm this is authorized, only test-role sessions are used, no
              forms/mutations/exploit payloads are allowed, and session
              values/private response bodies must not be stored.
            </span>
          </label>

          <button
            disabled={!verifiedScope || !approvedRequest}
            className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Run access-control signal review
          </button>
        </form>
      </div>

      {latest ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard
              label="Routes reviewed"
              value={latest.route_review_count}
            />
            <StatCard label="Comparisons" value={latest.comparison_count} />
            <StatCard
              label="Sensitive"
              value={latest.sensitive_route_signal_count}
            />
            <StatCard label="Admin" value={latest.admin_route_signal_count} />
            <StatCard
              label="Object IDs"
              value={latest.object_id_signal_count}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Potential signals"
              value={latest.unexpected_access_signal_count}
            />
            <StatCard label="Blocked" value={latest.blocked_route_count} />
            <StatCard
              label="Private body blocked"
              value={latest.private_evidence_block_count}
            />
            <StatCard label="High risk" value={latest.high_risk_count} />
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
            <h3 className="text-2xl font-black text-blue-950">
              Latest access-control summary
            </h3>
            <p className="mt-3 max-w-3xl leading-7 text-blue-900">
              {latest.summary?.customerSummary ||
                "Access-control review saved."}
            </p>
            <p className="mt-3 text-sm font-bold text-blue-800">
              Mode: {latest.comparison_mode} · Created{" "}
              {new Date(latest.created_at).toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
            <h3 className="text-2xl font-black text-red-950">
              Safety boundary
            </h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                "GET-only metadata",
                "No form submission",
                "No POST/PUT/PATCH/DELETE",
                "No IDOR exploitation",
                "No session storage",
                "No private body storage",
                "Allowed paths only",
                "Blocked paths enforced",
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
            <h3 className="text-2xl font-black">Route comparisons</h3>
            <div className="mt-6 grid gap-4">
              {comparisons.length ? (
                comparisons.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="break-all font-black">{item.url}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          expected: {item.expected_access} · low status:{" "}
                          {item.low_role_status || "N/A"} · high status:{" "}
                          {item.high_role_status || "N/A"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Private body stored:{" "}
                          {item.private_body_stored ? "yes" : "no"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.comparison_result)}`}
                        >
                          {item.comparison_result}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${riskClass(item.risk_level)}`}
                        >
                          {item.risk_level}
                        </span>
                      </div>
                    </div>

                    {item.risk_signals?.length ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                        Signals: {item.risk_signals.join(", ")}
                      </p>
                    ) : null}

                    {item.object_id_signals?.length ? (
                      <p className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-900">
                        Object ID signals: {item.object_id_signals.join(", ")}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No route comparisons saved yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Access-control findings</h3>
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
                        className={`rounded-full px-3 py-1 text-xs font-black ${riskClass(finding.severity)}`}
                      >
                        {finding.severity}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {finding.evidence_summary}
                    </p>

                    <p className="mt-3 text-sm font-bold text-slate-800">
                      Developer fix: {finding.developer_fix}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No access-control findings saved yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Saved access-control runs</h3>
            <div className="mt-6 grid gap-4">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="break-all font-black">{run.target_url}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(run.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">
                      {run.review_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">No access-control review yet</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Run review to detect low-privilege, privileged-route and object ID
            access-control signals safely.
          </p>
        </div>
      )}
    </section>
  );
}
