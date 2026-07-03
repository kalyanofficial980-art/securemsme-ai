import {
  addManualApiEndpointAction,
  runApiSecurityReviewAction,
  updateApiChecklistItemAction,
} from "@/app/api-security-review/actions";

type ApiRun = {
  id: string;
  target_url: string;
  run_status: string;
  review_mode: string;
  authorization_status: string;
  discovered_spec_count: number;
  endpoint_count: number;
  public_docs_count: number;
  graphql_signal_count: number;
  sensitive_endpoint_count: number;
  mutation_endpoint_count: number;
  auth_required_count: number;
  auth_unclear_count: number;
  checklist_needs_fix_count: number;
  api_coverage_score: number;
  api_risk_score: number;
  safe_summary: string;
  developer_summary: string;
  client_safe_summary: string;
  created_at: string;
};

type Spec = {
  id: string;
  spec_url: string;
  spec_type: string;
  http_status?: number | null;
  title?: string | null;
  version?: string | null;
  endpoint_count: number;
  auth_scheme_count: number;
  sensitive_path_count: number;
  risk_level: string;
  evidence_summary: string;
  developer_note: string;
  client_safe_note: string;
  blocked_claim: string;
  spec_fingerprint: string;
};

type Endpoint = {
  id: string;
  endpoint_path: string;
  full_url?: string | null;
  method: string;
  summary?: string | null;
  endpoint_type: string;
  auth_requirement: string;
  mutation_risk: boolean;
  customer_data_signal: boolean;
  admin_signal: boolean;
  payment_signal: boolean;
  file_signal: boolean;
  sensitive_signal: boolean;
  risk_level: string;
  review_status: string;
  endpoint_fingerprint: string;
  evidence_summary: string;
  developer_note: string;
  client_safe_note: string;
  blocked_claim: string;
};

type Observation = {
  id: string;
  category: string;
  severity: string;
  confidence: string;
  title: string;
  evidence_summary: string;
  developer_note: string;
  client_safe_note: string;
  blocked_claim: string;
  safe_retest_steps: string;
};

type Checklist = {
  id: string;
  checklist_key: string;
  title: string;
  category: string;
  status: string;
  severity: string;
  evidence_summary: string;
  developer_note: string;
  client_safe_note: string;
  blocked_claim: string;
};

type Event = {
  id: string;
  title: string;
  details: string;
  created_at: string;
};

function badgeClass(value: string) {
  if (["Low", "Info", "pass", "reviewed", "completed"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["Medium", "not-checked", "needs-review", "unclear"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["High", "Critical", "needs-fix", "none-documented"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

function methodClass(method: string) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method))
    return "bg-red-100 text-red-950";
  if (method === "GET") return "bg-emerald-100 text-emerald-950";
  return "bg-slate-100 text-slate-700";
}

function Stat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-black text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-black text-slate-950">{value}</p>
      {helper ? (
        <p className="mt-2 text-sm font-bold text-slate-600">{helper}</p>
      ) : null}
    </div>
  );
}

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
}

export function ApiSecurityReviewPanel({
  scanId,
  targetUrl,
  runs,
  selectedRun,
  specs,
  endpoints,
  observations,
  checklist,
  events,
  message,
}: {
  scanId: string;
  targetUrl: string;
  runs: ApiRun[];
  selectedRun?: ApiRun | null;
  specs: Spec[];
  endpoints: Endpoint[];
  observations: Observation[];
  checklist: Checklist[];
  events: Event[];
  message?: string;
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <p className="text-sm font-black text-blue-700">
          API Security Review v2
        </p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Safe API Inventory + Review
        </h1>
        <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
          {targetUrl}
        </p>
        <p className="mt-4 max-w-3xl leading-8 text-blue-900">
          Discover API docs/specs, inventory endpoints and flag
          sensitive/mutation/auth-unclear API risks using safe GET-only review.
        </p>
      </div>

      <form
        action={runApiSecurityReviewAction}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <input type="hidden" name="scanId" value={scanId} />
        <h2 className="text-2xl font-black">Run API Security Review</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          No POST/PUT/PATCH/DELETE execution, no fuzzing, no auth bypass and no
          private data extraction.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="font-bold">
            Review mode
            <select
              name="reviewMode"
              defaultValue="safe-standard"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="safe-light">Safe Light</option>
              <option value="safe-standard">Safe Standard</option>
              <option value="safe-deep">Safe Deep</option>
            </select>
          </label>
          <textarea
            name="extraSpecUrls"
            placeholder="Optional spec/doc URLs, one per line. Same-origin only."
            className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3 md:col-span-2"
          />
        </div>

        <label className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
          <input
            type="checkbox"
            name="permissionAccepted"
            value="yes"
            required
          />
          I confirm this target is authorized for safe API review.
        </label>

        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
          Run API Review
        </button>
      </form>

      {selectedRun ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat
              label="API coverage"
              value={`${selectedRun.api_coverage_score}/100`}
              helper={selectedRun.review_mode}
            />
            <Stat
              label="API risk"
              value={`${selectedRun.api_risk_score}/100`}
              helper="Safe signal score"
            />
            <Stat
              label="Endpoints"
              value={selectedRun.endpoint_count}
              helper={`${selectedRun.sensitive_endpoint_count} sensitive`}
            />
            <Stat
              label="Public docs"
              value={selectedRun.public_docs_count}
              helper={`${selectedRun.graphql_signal_count} GraphQL signals`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat
              label="Mutation endpoints"
              value={selectedRun.mutation_endpoint_count}
            />
            <Stat
              label="Auth required"
              value={selectedRun.auth_required_count}
            />
            <Stat
              label="Auth unclear/no docs"
              value={selectedRun.auth_unclear_count}
            />
            <Stat
              label="Checklist needs fix"
              value={selectedRun.checklist_needs_fix_count}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Run summary</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                <p className="font-black">Safe summary</p>
                <p className="mt-2">{selectedRun.safe_summary}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <p className="font-black">Developer summary</p>
                <p className="mt-2">{selectedRun.developer_summary}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                <p className="font-black">Client-safe summary</p>
                <p className="mt-2">{selectedRun.client_safe_summary}</p>
              </div>
            </div>
          </div>

          <form
            action={addManualApiEndpointAction}
            className="rounded-3xl border border-slate-200 bg-white p-8"
          >
            <input type="hidden" name="scanId" value={scanId} />
            <input type="hidden" name="runId" value={selectedRun.id} />
            <h2 className="text-2xl font-black">Add manual API endpoint</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <input
                name="endpointPath"
                required
                placeholder="/api/users/{id}"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <select
                name="method"
                defaultValue="GET"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              >
                <option>GET</option>
                <option>HEAD</option>
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
                <option>DELETE</option>
              </select>
              <select
                name="authRequirement"
                defaultValue="unclear"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="required">Required</option>
                <option value="optional">Optional</option>
                <option value="none-documented">None documented</option>
                <option value="unclear">Unclear</option>
              </select>
              <input
                name="summary"
                placeholder="Endpoint purpose"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
            </div>
            <button className="mt-5 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Add endpoint
            </button>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Discovered API specs/docs</h2>
            <div className="mt-6 grid gap-5">
              {specs.length ? (
                specs.map((spec) => (
                  <div
                    key={spec.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {spec.spec_type} · status{" "}
                          {spec.http_status || "unknown"} · endpoints{" "}
                          {spec.endpoint_count}
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          {spec.title || spec.spec_type}
                        </h3>
                        <p className="mt-2 break-all text-sm font-bold text-slate-600">
                          {spec.spec_url}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(spec.risk_level)}`}
                      >
                        {spec.risk_level}
                      </span>
                    </div>
                    <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                      {spec.evidence_summary}
                    </p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-900">
                        Developer: {spec.developer_note}
                      </div>
                      <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                        Blocked claim: {spec.blocked_claim}
                      </div>
                    </div>
                    <p className="mt-3 break-all text-xs font-bold text-slate-500">
                      fingerprint: {shortHash(spec.spec_fingerprint)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No public API specs/docs discovered yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">API endpoint inventory</h2>
            <div className="mt-6 grid gap-5">
              {endpoints.length ? (
                endpoints.map((endpoint) => (
                  <div
                    key={endpoint.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {endpoint.endpoint_type} · auth{" "}
                          {endpoint.auth_requirement} · {endpoint.review_status}
                        </p>
                        <h3 className="mt-2 break-all text-xl font-black">
                          {endpoint.endpoint_path}
                        </h3>
                        {endpoint.summary ? (
                          <p className="mt-2 text-sm text-slate-600">
                            {endpoint.summary}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${methodClass(endpoint.method)}`}
                        >
                          {endpoint.method}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(endpoint.risk_level)}`}
                        >
                          {endpoint.risk_level}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(endpoint.auth_requirement)}`}
                        >
                          {endpoint.auth_requirement}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-5">
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Mutation: {endpoint.mutation_risk ? "yes" : "no"}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Customer data:{" "}
                        {endpoint.customer_data_signal ? "yes" : "no"}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Admin: {endpoint.admin_signal ? "yes" : "no"}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Payment: {endpoint.payment_signal ? "yes" : "no"}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        File: {endpoint.file_signal ? "yes" : "no"}
                      </div>
                    </div>

                    <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                      {endpoint.evidence_summary}
                    </p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-900">
                        Developer: {endpoint.developer_note}
                      </div>
                      <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                        Blocked claim: {endpoint.blocked_claim}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No endpoints inventoried yet. Add manual endpoint if docs are
                  private.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">API observations</h2>
            <div className="mt-6 grid gap-5">
              {observations.length ? (
                observations.map((obs) => (
                  <div
                    key={obs.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {obs.category} · {obs.confidence}
                        </p>
                        <h3 className="mt-2 text-xl font-black">{obs.title}</h3>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(obs.severity)}`}
                      >
                        {obs.severity}
                      </span>
                    </div>
                    <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                      {obs.evidence_summary}
                    </p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-900">
                        Developer: {obs.developer_note}
                      </div>
                      <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                        Blocked claim: {obs.blocked_claim}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No API observations yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">API review checklist</h2>
            <div className="mt-6 grid gap-4">
              {checklist.map((item) => (
                <form
                  key={item.id}
                  action={updateApiChecklistItemAction}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <input type="hidden" name="scanId" value={scanId} />
                  <input type="hidden" name="runId" value={selectedRun.id} />
                  <input type="hidden" name="checklistId" value={item.id} />

                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        {item.category} · {item.severity}
                      </p>
                      <h3 className="mt-1 font-black">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {item.developer_note}
                      </p>
                    </div>
                    <select
                      name="status"
                      defaultValue={item.status}
                      className={`h-fit rounded-2xl border border-slate-300 px-4 py-3 text-sm font-black ${badgeClass(item.status)}`}
                    >
                      <option value="not-checked">Not checked</option>
                      <option value="pass">Pass</option>
                      <option value="needs-fix">Needs fix</option>
                      <option value="not-applicable">Not applicable</option>
                      <option value="accepted-risk">Accepted risk</option>
                    </select>
                  </div>

                  <textarea
                    name="evidenceSummary"
                    defaultValue={item.evidence_summary}
                    className="mt-4 min-h-20 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  />
                  <button className="mt-3 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                    Save checklist
                  </button>
                </form>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent API review runs</h2>
          <div className="mt-6 grid gap-4">
            {runs.length ? (
              runs.map((run) => (
                <a
                  key={run.id}
                  href={`/report/${scanId}/api-security-review?run=${run.id}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
                >
                  <p className="font-black">
                    {run.endpoint_count} endpoint(s) · risk {run.api_risk_score}
                    /100
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {run.public_docs_count} docs · {run.auth_unclear_count} auth
                    unclear
                  </p>
                </a>
              ))
            ) : (
              <p className="text-slate-600">No API review runs yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Events</h2>
          <div className="mt-6 grid gap-3">
            {events.length ? (
              events.map((event) => (
                <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black">{event.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {event.details}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No events yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
