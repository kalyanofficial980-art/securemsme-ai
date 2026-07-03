import { runApiSecurityScan } from "@/app/report/[id]/api-security/actions";

type ApiInventory = {
  id: string;
  target_url: string;
  scanner_status: string;
  scanner_policy?: Record<string, unknown> | null;
  openapi_documents?: Array<{
    url: string;
    statusCode: number | null;
    documentType: string;
    parsed: boolean;
    pathCount: number;
    methodCount: number;
  }> | null;
  summary?: { customerSummary?: string } | null;
  document_count: number;
  endpoint_count: number;
  get_endpoint_count: number;
  mutation_method_count: number;
  auth_unknown_count: number;
  sensitive_path_count: number;
  api_risk_signal_count: number;
  blocked_execution_count: number;
  created_at: string;
};

type ApiEndpoint = {
  id: string;
  endpoint_url: string;
  path: string;
  method: string;
  source: string;
  auth_requirement: string;
  risk_level: string;
  risk_signals: string[];
  parameters: string[];
  response_metadata?: Record<string, unknown> | null;
  api_top10_mapping: string[];
  safe_testing_notes: string;
};

function riskClass(risk: string) {
  if (risk === "Critical") return "bg-red-100 text-red-950";
  if (risk === "High") return "bg-red-50 text-red-800";
  if (risk === "Medium") return "bg-amber-50 text-amber-900";
  if (risk === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

function methodClass(method: string) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method))
    return "border-red-200 bg-red-50 text-red-900";
  if (method === "GET")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
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

export function ApiSecurityPanel({
  scanId,
  targetUrl,
  verifiedScope,
  inventories,
  endpoints,
  message,
}: {
  scanId: string;
  targetUrl: string;
  verifiedScope: boolean;
  inventories: ApiInventory[];
  endpoints: ApiEndpoint[];
  message?: string;
}) {
  const latest = inventories[0];
  const documents = latest?.openapi_documents || [];

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
              API Discovery + OpenAPI Security Scanner
            </p>
            <h2 className="mt-2 text-3xl font-black">
              OpenAPI/Swagger discovery, endpoint inventory and API Top 10
              mapping
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Finds API documentation and endpoint definitions safely. Mutation
              methods are inventoried but never executed.
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
            GET-only docs discovery. No API POST/PUT/PATCH/DELETE execution. No
            private response body storage.
          </p>
        </div>

        <form
          action={runApiSecurityScan}
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
                    ? "Limited API inventory."
                    : intensity === "deep"
                      ? "Larger endpoint inventory limit."
                      : "Balanced API discovery."}
                </p>
              </label>
            ))}
          </div>

          <label className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
            <input type="checkbox" name="permissionAccepted" className="mt-1" />
            <span>
              I confirm I own or am authorized to test this website/API. I allow
              safe API documentation discovery and endpoint inventory only.
              Mutation methods must not be executed.
            </span>
          </label>

          <button
            disabled={!verifiedScope}
            className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Run API security scanner
          </button>
        </form>
      </div>

      {latest ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard label="API docs" value={latest.document_count} />
            <StatCard label="Endpoints" value={latest.endpoint_count} />
            <StatCard label="GET endpoints" value={latest.get_endpoint_count} />
            <StatCard
              label="Mutation methods"
              value={latest.mutation_method_count}
            />
            <StatCard
              label="Risk signals"
              value={latest.api_risk_signal_count}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Auth unknown" value={latest.auth_unknown_count} />
            <StatCard
              label="Sensitive paths"
              value={latest.sensitive_path_count}
            />
            <StatCard
              label="Blocked execution"
              value={latest.blocked_execution_count}
            />
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
            <h3 className="text-2xl font-black text-blue-950">
              Latest API scanner summary
            </h3>
            <p className="mt-3 max-w-3xl leading-7 text-blue-900">
              {latest.summary?.customerSummary || "API inventory saved."}
            </p>
            <p className="mt-3 text-sm font-bold text-blue-800">
              Created {new Date(latest.created_at).toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
            <h3 className="text-2xl font-black text-red-950">
              API safety boundary
            </h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                "OpenAPI/Swagger GET-only discovery",
                "Endpoint inventory only",
                "No POST/PUT/PATCH/DELETE execution",
                "No authentication bypass testing",
                "No private response body storage",
                "No credential/session storage",
                "No destructive API calls",
                "No data extraction",
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
            <h3 className="text-2xl font-black">Discovered API documents</h3>
            <div className="mt-6 grid gap-4">
              {documents.length ? (
                documents.map((doc) => (
                  <div
                    key={doc.url}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="break-all font-black">{doc.url}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {doc.documentType} · status {doc.statusCode || "N/A"}{" "}
                          · parsed {doc.parsed ? "yes" : "no"}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                        {doc.methodCount} methods
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No API documents saved yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">API endpoint inventory</h3>
            <div className="mt-6 grid gap-4">
              {endpoints.length ? (
                endpoints.map((endpoint) => (
                  <div
                    key={endpoint.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="break-all font-black">
                          {endpoint.endpoint_url}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {endpoint.source} · auth {endpoint.auth_requirement} ·
                          API Top 10{" "}
                          {(endpoint.api_top10_mapping || []).join(", ") ||
                            "N/A"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${methodClass(endpoint.method)}`}
                        >
                          {endpoint.method}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${riskClass(endpoint.risk_level)}`}
                        >
                          {endpoint.risk_level}
                        </span>
                      </div>
                    </div>

                    {endpoint.risk_signals?.length ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                        {endpoint.risk_signals.join(", ")}
                      </p>
                    ) : null}

                    <p className="mt-3 text-sm font-bold text-slate-700">
                      {endpoint.safe_testing_notes}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No API endpoints saved yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Saved API scanner runs</h3>
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
                      {inventory.scanner_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">No API security scan yet</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Run API scanner to discover OpenAPI/Swagger/GraphQL signals and
            create safe endpoint inventory with API Top 10 mapping.
          </p>
        </div>
      )}
    </section>
  );
}
