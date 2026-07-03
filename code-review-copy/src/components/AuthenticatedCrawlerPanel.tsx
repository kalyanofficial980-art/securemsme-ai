import { runAuthenticatedCrawler } from "@/app/report/[id]/authenticated-crawler/actions";

type AuthRun = {
  id: string;
  target_url: string;
  run_status: string;
  execution_mode: string;
  summary?: { customerSummary?: string } | null;
  authenticated_route_count: number;
  blocked_route_count: number;
  form_count: number;
  input_count: number;
  auth_signal_count: number;
  sensitive_route_count: number;
  private_evidence_block_count: number;
  high_risk_count: number;
  created_at: string;
};

type RouteObservation = {
  id: string;
  url: string;
  path: string;
  method: string;
  status_code?: number | null;
  content_type?: string | null;
  title?: string | null;
  route_type: string;
  auth_signal?: string | null;
  sensitivity: string;
  forms_metadata?: Array<{
    action: string;
    method: string;
    inputNames: string[];
    inputTypes: string[];
    submitted: false;
  }> | null;
  links_discovered: number;
  blocked_reason?: string | null;
  private_body_stored: boolean;
};

type AuthRequest = {
  id: string;
  admin_review_status?: string | null;
  status?: string | null;
  allowed_paths?: string[] | null;
  blocked_paths?: string[] | null;
  expires_at?: string | null;
};

function sensitivityClass(sensitivity: string) {
  if (sensitivity === "high") return "bg-red-50 text-red-900";
  if (sensitivity === "medium") return "bg-amber-50 text-amber-900";
  return "bg-emerald-50 text-emerald-800";
}

function routeTypeClass(routeType: string) {
  if (routeType === "blocked-route")
    return "border-red-200 bg-red-50 text-red-900";
  if (routeType === "sensitive-route")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (routeType === "auth-signal")
    return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}

export function AuthenticatedCrawlerPanel({
  scanId,
  targetUrl,
  verifiedScope,
  approvedRequest,
  latestRequest,
  runs,
  observations,
  message,
}: {
  scanId: string;
  targetUrl: string;
  verifiedScope: boolean;
  approvedRequest: boolean;
  latestRequest?: AuthRequest | null;
  runs: AuthRun[];
  observations: RouteObservation[];
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
              Authenticated Session-Safe Crawler Execution
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Approved allowed-path route inventory with private evidence
              protection
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Crawls only approved authenticated paths with GET requests and
              stores metadata only. Session/cookie/token values are never saved.
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

        {latestRequest ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-black text-emerald-950">Allowed paths</p>
              <p className="mt-2 text-sm font-bold text-emerald-900">
                {(latestRequest.allowed_paths || []).join(", ") ||
                  "Default allowed paths"}
              </p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="font-black text-red-950">Blocked paths</p>
              <p className="mt-2 text-sm font-bold text-red-900">
                {(latestRequest.blocked_paths || []).join(", ") ||
                  "Default blocked paths"}
              </p>
            </div>
          </div>
        ) : null}

        <form
          action={runAuthenticatedCrawler}
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
                    ? "Small allowed-path sample."
                    : intensity === "deep"
                      ? "Larger allowed-path crawl."
                      : "Balanced authenticated route inventory."}
                </p>
              </label>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <label className="font-black">Execution mode</label>
            <select
              name="executionMode"
              defaultValue="metadata-only"
              className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
            >
              <option value="metadata-only">
                Metadata-only, no session header
              </option>
              <option value="short-lived-cookie-in-memory">
                Short-lived Cookie header, in memory only
              </option>
              <option value="short-lived-authorization-in-memory">
                Short-lived Authorization/Bearer header, in memory only
              </option>
            </select>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Session header is optional and never saved. Use only a temporary
              low-privilege test account session.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <label className="font-black">
              Temporary test-account session header
            </label>
            <textarea
              name="sessionHeaderValue"
              rows={4}
              placeholder="Optional. Paste Cookie value or Bearer token only for short-lived in-memory mode. Never use real admin account."
              className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
            <p className="mt-2 text-sm font-bold text-red-700">
              Not saved to database. Not displayed later. Use staging/test
              account only.
            </p>
          </div>

          <label className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
            <input type="checkbox" name="permissionAccepted" className="mt-1" />
            <span>
              I confirm this is my authorized app, the authenticated request is
              approved, only a low-privilege test account/session is used, and
              no forms, mutations, password storage, session storage or private
              body storage are allowed.
            </span>
          </label>

          <button
            disabled={!verifiedScope || !approvedRequest}
            className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Run authenticated safe crawler
          </button>
        </form>
      </div>

      {latest ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard
              label="Auth routes"
              value={latest.authenticated_route_count}
            />
            <StatCard label="Blocked" value={latest.blocked_route_count} />
            <StatCard label="Forms" value={latest.form_count} />
            <StatCard label="Inputs" value={latest.input_count} />
            <StatCard label="Auth signals" value={latest.auth_signal_count} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Sensitive routes"
              value={latest.sensitive_route_count}
            />
            <StatCard
              label="Private evidence blocked"
              value={latest.private_evidence_block_count}
            />
            <StatCard label="High risk" value={latest.high_risk_count} />
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
            <h3 className="text-2xl font-black text-blue-950">
              Latest authenticated crawler summary
            </h3>
            <p className="mt-3 max-w-3xl leading-7 text-blue-900">
              {latest.summary?.customerSummary ||
                "Authenticated crawler inventory saved."}
            </p>
            <p className="mt-3 text-sm font-bold text-blue-800">
              Mode: {latest.execution_mode} · Created{" "}
              {new Date(latest.created_at).toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
            <h3 className="text-2xl font-black text-red-950">
              Safety boundary
            </h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                "Allowed paths only",
                "Blocked paths enforced",
                "GET-only",
                "No form submission",
                "No POST/PUT/PATCH/DELETE",
                "No password/session storage",
                "No private body storage",
                "Low-privilege test account only",
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
            <h3 className="text-2xl font-black">
              Authenticated route observations
            </h3>
            <div className="mt-6 grid gap-4">
              {observations.length ? (
                observations.map((observation) => (
                  <div
                    key={observation.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="break-all font-black">
                          {observation.url}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {observation.method} ·{" "}
                          {observation.status_code || "N/A"} ·{" "}
                          {observation.content_type || "content-type unknown"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Private body stored:{" "}
                          {observation.private_body_stored ? "yes" : "no"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${routeTypeClass(observation.route_type)}`}
                        >
                          {observation.route_type}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${sensitivityClass(observation.sensitivity)}`}
                        >
                          {observation.sensitivity}
                        </span>
                      </div>
                    </div>

                    {observation.auth_signal ? (
                      <p className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-900">
                        Auth signal: {observation.auth_signal}
                      </p>
                    ) : null}

                    {observation.blocked_reason ? (
                      <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900">
                        Blocked: {observation.blocked_reason}
                      </p>
                    ) : null}

                    {observation.forms_metadata?.length ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                        Forms observed: {observation.forms_metadata.length} ·
                        submitted: no
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No authenticated route observations saved yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">
              Saved authenticated crawler runs
            </h3>
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
                      {run.run_status}
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
            No authenticated crawler run yet
          </h3>
          <p className="mt-3 leading-7 text-slate-600">
            Create and approve an authenticated scan request first, then run the
            crawler to inventory allowed authenticated routes safely.
          </p>
        </div>
      )}
    </section>
  );
}
