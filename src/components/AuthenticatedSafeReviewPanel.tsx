import {
  addAuthenticatedObservationAction,
  addRoleComparisonAction,
  createAuthenticatedReviewContextAction,
  runAuthenticatedSafeReviewAction,
  updateAuthChecklistItemAction,
} from "@/app/authenticated-review/actions";

type Context = {
  id: string;
  context_name: string;
  target_url: string;
  login_url?: string | null;
  test_account_label: string;
  role_names: string[];
  authorization_status: string;
  credential_storage_status: string;
  scope_summary: string;
  safe_boundaries: string;
  allowed_paths: string[];
  excluded_paths: string[];
  review_depth: string;
  created_at: string;
};

type ReviewRun = {
  id: string;
  target_url: string;
  run_status: string;
  review_mode: string;
  total_pages_reviewed: number;
  account_surface_count: number;
  role_comparison_count: number;
  cookie_review_count: number;
  sensitive_page_signal_count: number;
  developer_action_count: number;
  needs_expert_review_count: number;
  coverage_score: number;
  auth_risk_score: number;
  safe_summary: string;
  developer_summary: string;
  client_safe_summary: string;
  created_at: string;
};

type Observation = {
  id: string;
  page_url: string;
  page_type: string;
  role_name?: string | null;
  contains_sensitive_data_signal: boolean;
  contains_account_action_signal: boolean;
  contains_payment_signal: boolean;
  contains_file_upload_signal: boolean;
  evidence_summary: string;
  developer_note: string;
  client_safe_note: string;
  blocked_claim: string;
  observation_quality: string;
  validation_status: string;
};

type Comparison = {
  id: string;
  comparison_name: string;
  page_url: string;
  role_a: string;
  role_b: string;
  expected_difference: string;
  observed_difference: string;
  access_control_signal: string;
  severity: string;
  evidence_summary: string;
  developer_note: string;
  client_safe_note: string;
  blocked_claim: string;
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

function badgeClass(value: string) {
  if (
    [
      "pass",
      "validated",
      "approved",
      "completed",
      "expected-difference",
    ].includes(value)
  )
    return "bg-emerald-100 text-emerald-950";
  if (
    [
      "needs-fix",
      "needs-review",
      "unexpected-same-access",
      "unexpected-extra-access",
    ].includes(value)
  )
    return "bg-red-100 text-red-950";
  if (["not-checked", "manual-observed", "pending"].includes(value))
    return "bg-amber-100 text-amber-950";
  return "bg-slate-100 text-slate-700";
}

export function AuthenticatedSafeReviewPanel({
  scanId,
  targetUrl,
  contexts,
  selectedContext,
  runs,
  selectedRun,
  observations,
  comparisons,
  checklist,
  events,
  message,
}: {
  scanId: string;
  targetUrl: string;
  contexts: Context[];
  selectedContext?: Context | null;
  runs: ReviewRun[];
  selectedRun?: ReviewRun | null;
  observations: Observation[];
  comparisons: Comparison[];
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
          Authenticated Safe Review v2
        </p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Authorized Login-Area Review
        </h1>
        <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
          {targetUrl}
        </p>
        <p className="mt-4 max-w-3xl leading-8 text-blue-900">
          Review login/account/customer-data areas using approved test-account
          scope metadata. No passwords are stored and no destructive actions are
          performed.
        </p>
      </div>

      <form
        action={createAuthenticatedReviewContextAction}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <input type="hidden" name="scanId" value={scanId} />
        <input type="hidden" name="targetUrl" value={targetUrl} />
        <h2 className="text-2xl font-black">
          Create authenticated review context
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Store only scope metadata. Do not paste passwords, session cookies,
          OTPs or private data.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input
            name="loginUrl"
            placeholder="Login URL"
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />
          <input
            name="testAccountLabel"
            placeholder="Test account label, e.g. client-test-customer"
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />
          <textarea
            name="roleNames"
            placeholder="Roles, comma or line separated: customer, staff, admin"
            className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3"
          />
          <textarea
            name="allowedPaths"
            placeholder="Allowed paths, e.g. /account, /dashboard"
            className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3"
          />
          <textarea
            name="excludedPaths"
            placeholder="Excluded paths, e.g. /payment/submit, /delete"
            className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3"
          />
          <textarea
            name="scopeSummary"
            placeholder="Scope summary"
            className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3"
          />
          <textarea
            name="safeBoundaries"
            placeholder="Safe boundaries"
            className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3"
          />
          <label className="font-bold">
            Review depth
            <select
              name="reviewDepth"
              defaultValue="safe-standard"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="safe-light">Safe Light</option>
              <option value="safe-standard">Safe Standard</option>
              <option value="safe-deep">Safe Deep</option>
            </select>
          </label>
        </div>

        <label className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
          <input
            type="checkbox"
            name="authorizationAccepted"
            value="yes"
            required
          />
          I confirm this is an authorized test account review and I will not
          store passwords/secrets here.
        </label>

        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
          Create context
        </button>
      </form>

      {selectedContext ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black text-slate-500">
                Selected context
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {selectedContext.context_name}
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                {selectedContext.scope_summary}
              </p>
              <p className="mt-2 leading-7 text-slate-600">
                {selectedContext.safe_boundaries}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Account label:{" "}
                {selectedContext.test_account_label || "not added"} · Roles:{" "}
                {(selectedContext.role_names || []).join(", ") || "none"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(selectedContext.authorization_status)}`}
              >
                {selectedContext.authorization_status}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                {selectedContext.credential_storage_status}
              </span>
            </div>
          </div>

          <form action={runAuthenticatedSafeReviewAction} className="mt-6">
            <input type="hidden" name="scanId" value={scanId} />
            <input type="hidden" name="contextId" value={selectedContext.id} />
            <button className="rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
              Create safe review run
            </button>
          </form>
        </div>
      ) : null}

      {selectedRun ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat
              label="Coverage"
              value={`${selectedRun.coverage_score}/100`}
              helper={selectedRun.review_mode}
            />
            <Stat
              label="Auth risk"
              value={`${selectedRun.auth_risk_score}/100`}
              helper="Safe signal score"
            />
            <Stat
              label="Pages reviewed"
              value={selectedRun.total_pages_reviewed}
              helper={`${selectedRun.sensitive_page_signal_count} sensitive signals`}
            />
            <Stat
              label="Role checks"
              value={selectedRun.role_comparison_count}
              helper={`${selectedRun.needs_expert_review_count} need review`}
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

          <div className="grid gap-6 lg:grid-cols-2">
            <form
              action={addAuthenticatedObservationAction}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <input type="hidden" name="scanId" value={scanId} />
              <input
                type="hidden"
                name="contextId"
                value={selectedContext?.id || ""}
              />
              <input type="hidden" name="runId" value={selectedRun.id} />
              <h2 className="text-2xl font-black">Add page observation</h2>
              <div className="mt-5 grid gap-3">
                <input
                  name="pageUrl"
                  required
                  placeholder="Authenticated page URL"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
                <input
                  name="title"
                  placeholder="Page title"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
                <input
                  name="roleName"
                  placeholder="Role name used"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
                <textarea
                  name="notes"
                  placeholder="Manual safe observation notes. Do not paste private data."
                  className="min-h-28 rounded-2xl border border-slate-300 px-4 py-3"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["hasPasswordField", "Password field"],
                    ["hasCustomerDataField", "Customer data"],
                    ["hasPaymentSignal", "Payment signal"],
                    ["hasFileUploadSignal", "File upload"],
                    ["hasAdminSignal", "Admin signal"],
                  ].map(([name, label]) => (
                    <label
                      key={name}
                      className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold"
                    >
                      <input type="checkbox" name={name} value="yes" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <button className="mt-5 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
                Add observation
              </button>
            </form>

            <form
              action={addRoleComparisonAction}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <input type="hidden" name="scanId" value={scanId} />
              <input
                type="hidden"
                name="contextId"
                value={selectedContext?.id || ""}
              />
              <input type="hidden" name="runId" value={selectedRun.id} />
              <h2 className="text-2xl font-black">Add role comparison</h2>
              <div className="mt-5 grid gap-3">
                <input
                  name="pageUrl"
                  required
                  placeholder="Page URL compared"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    name="roleA"
                    placeholder="Role A, e.g. customer"
                    className="rounded-2xl border border-slate-300 px-4 py-3"
                  />
                  <input
                    name="roleB"
                    placeholder="Role B, e.g. admin"
                    className="rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </div>
                <textarea
                  name="expectedDifference"
                  placeholder="Expected difference"
                  className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3"
                />
                <textarea
                  name="observedDifference"
                  placeholder="Observed difference, no private data"
                  className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3"
                />
              </div>
              <button className="mt-5 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
                Add comparison
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">
              Authenticated page observations
            </h2>
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
                          {obs.page_type} · role {obs.role_name || "not set"} ·{" "}
                          {obs.observation_quality}
                        </p>
                        <h3 className="mt-2 break-all text-xl font-black">
                          {obs.page_url}
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(obs.validation_status)}`}
                      >
                        {obs.validation_status}
                      </span>
                    </div>
                    <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                      {obs.evidence_summary}
                    </p>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Sensitive:{" "}
                        {obs.contains_sensitive_data_signal ? "yes" : "no"}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Account action:{" "}
                        {obs.contains_account_action_signal ? "yes" : "no"}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Payment: {obs.contains_payment_signal ? "yes" : "no"}
                      </div>
                    </div>
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
                  No observations yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Role comparisons</h2>
            <div className="mt-6 grid gap-5">
              {comparisons.length ? (
                comparisons.map((comparison) => (
                  <div
                    key={comparison.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {comparison.role_a} vs {comparison.role_b}
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          {comparison.comparison_name}
                        </h3>
                        <p className="mt-2 break-all text-sm font-bold text-slate-600">
                          {comparison.page_url}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(comparison.access_control_signal)}`}
                      >
                        {comparison.access_control_signal}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-white p-4 text-sm leading-6">
                        <span className="font-black">Expected:</span>{" "}
                        {comparison.expected_difference}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm leading-6">
                        <span className="font-black">Observed:</span>{" "}
                        {comparison.observed_difference}
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                      Blocked claim: {comparison.blocked_claim}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No role comparisons yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">
              Authenticated review checklist
            </h2>
            <div className="mt-6 grid gap-4">
              {checklist.map((item) => (
                <form
                  key={item.id}
                  action={updateAuthChecklistItemAction}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <input type="hidden" name="scanId" value={scanId} />
                  <input
                    type="hidden"
                    name="contextId"
                    value={selectedContext?.id || ""}
                  />
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
          <h2 className="text-2xl font-black">Contexts and runs</h2>
          <div className="mt-6 grid gap-4">
            {contexts.map((context) => (
              <a
                key={context.id}
                href={`/report/${scanId}/authenticated-safe-review?context=${context.id}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
              >
                <p className="font-black">{context.context_name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {context.test_account_label || "no label"} ·{" "}
                  {context.review_depth}
                </p>
              </a>
            ))}
            {runs.map((run) => (
              <a
                key={run.id}
                href={`/report/${scanId}/authenticated-safe-review?context=${selectedContext?.id || ""}&run=${run.id}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
              >
                <p className="font-black">
                  Run · coverage {run.coverage_score}/100
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {run.total_pages_reviewed} pages · risk {run.auth_risk_score}
                  /100
                </p>
              </a>
            ))}
            {!contexts.length && !runs.length ? (
              <p className="text-slate-600">No context or run yet.</p>
            ) : null}
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
