import { requestAuthenticatedScan } from "@/app/report/[id]/authenticated-scan/actions";
import {
  AUTHENTICATED_SCAN_BLOCKED_ACTIONS,
  getAuthenticatedScanSafetyChecklist,
} from "@/lib/authenticated-scan-foundation";

type AuthenticatedRequest = {
  id: string;
  login_url: string;
  auth_method: string;
  test_account_role: string;
  credential_handling_mode: string;
  requested_intensity: string;
  status: string;
  admin_review_status: string;
  allowed_paths: string[];
  blocked_paths: string[];
  blocked_actions: string[];
  customer_notes?: string | null;
  created_at: string;
  expires_at: string;
};

function statusClass(status: string) {
  if (status === "approved")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-900";
  if (status === "needs-info")
    return "border-amber-200 bg-amber-50 text-amber-900";

  return "border-blue-200 bg-blue-50 text-blue-900";
}

export function AuthenticatedScanPanel({
  scanId,
  targetUrl,
  verifiedScope,
  requests,
  message,
}: {
  scanId: string;
  targetUrl: string;
  verifiedScope: boolean;
  requests: AuthenticatedRequest[];
  message?: string;
}) {
  const checklist = getAuthenticatedScanSafetyChecklist();

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
              Authenticated customer scan foundation
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Request safe login-protected page review
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              This creates a safe request and session plan for future
              authenticated scanning. It does not store passwords and does not
              run login testing yet.
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
            Use only a low-privilege test account. Do not provide real admin,
            customer, payment, or production user credentials.
          </p>
        </div>

        <form
          action={requestAuthenticatedScan}
          className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6"
        >
          <input type="hidden" name="scanId" value={scanId} />

          <div>
            <label htmlFor="loginUrl" className="font-black">
              Login URL
            </label>
            <input
              id="loginUrl"
              name="loginUrl"
              type="url"
              required
              placeholder="https://example.com/login"
              defaultValue={targetUrl}
              className="mt-3 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Auth method</span>
              <select
                name="authMethod"
                className="mt-3 w-full rounded-xl border border-slate-300 p-3 font-bold"
                defaultValue="test-account"
              >
                <option value="test-account">Test account</option>
                <option value="staging-test-account">
                  Staging test account
                </option>
                <option value="magic-link-test-account">
                  Magic-link test account
                </option>
              </select>
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Intensity</span>
              <select
                name="requestedIntensity"
                className="mt-3 w-full rounded-xl border border-slate-300 p-3 font-bold"
                defaultValue="standard"
              >
                <option value="light">Light</option>
                <option value="standard">Standard</option>
                <option value="deep">Deep</option>
              </select>
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Test account role</span>
              <input
                name="testAccountRole"
                placeholder="low-privilege-test-user"
                defaultValue="low-privilege-test-user"
                className="mt-3 w-full rounded-xl border border-slate-300 p-3 font-bold"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="font-black">Allowed paths</span>
              <textarea
                name="allowedPaths"
                rows={6}
                placeholder="/dashboard&#10;/profile&#10;/orders"
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
              />
              <p className="mt-2 text-xs font-bold text-slate-500">
                One path per line. Keep it safe and low-risk.
              </p>
            </label>

            <label>
              <span className="font-black">Extra blocked paths</span>
              <textarea
                name="blockedPaths"
                rows={6}
                placeholder="/checkout&#10;/payment&#10;/delete"
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
              />
              <p className="mt-2 text-xs font-bold text-slate-500">
                Dangerous paths are blocked by default. Add more if needed.
              </p>
            </label>
          </div>

          <label>
            <span className="font-black">Customer notes</span>
            <textarea
              name="customerNotes"
              rows={4}
              placeholder="Explain what login area should be reviewed and what must not be touched."
              className="mt-3 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
            />
          </label>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="font-black text-amber-950">Required attestations</h3>
            <div className="mt-4 grid gap-3">
              {[
                [
                  "permissionAccepted",
                  "I own or am authorized to test this website.",
                ],
                [
                  "lowPrivilegeAccepted",
                  "I will use only a low-privilege test account, not an admin/customer account.",
                ],
                [
                  "noRealDataAccepted",
                  "I will not use real customer, payment, or sensitive data.",
                ],
                [
                  "noMutationAccepted",
                  "I understand payment, order, delete, edit, publish, upload, and account-change actions are blocked.",
                ],
              ].map(([name, text]) => (
                <label
                  key={name}
                  className="flex gap-3 rounded-2xl bg-white/70 p-4 text-sm font-bold text-amber-950"
                >
                  <input type="checkbox" name={name} className="mt-1" />
                  <span>{text}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            disabled={!verifiedScope}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Request authenticated scan
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h3 className="text-2xl font-black text-red-950">Always blocked</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {AUTHENTICATED_SCAN_BLOCKED_ACTIONS.map((item) => (
            <div
              key={item}
              className="rounded-2xl bg-white/70 p-4 font-bold text-red-900"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <h3 className="text-2xl font-black text-blue-950">
          Test account safety checklist
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

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">
          Saved authenticated scan requests
        </h3>
        <div className="mt-6 grid gap-4">
          {requests.length ? (
            requests.map((request) => (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="break-all font-black">{request.login_url}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {request.auth_method} · {request.requested_intensity} ·{" "}
                      {request.test_account_role}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Created {new Date(request.created_at).toLocaleString()} ·
                      expires{" "}
                      {new Date(request.expires_at).toLocaleDateString()}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(request.admin_review_status)}`}
                  >
                    {request.admin_review_status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-black">Allowed paths</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {(request.allowed_paths || []).slice(0, 10).join(", ") ||
                        "Default safe paths"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-black">Credential handling</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {request.credential_handling_mode}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No authenticated scan requests yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
