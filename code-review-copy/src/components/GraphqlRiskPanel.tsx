import { runGraphqlRiskAnalysis } from "@/app/report/[id]/graphql-risk/actions";

type GraphqlInventory = {
  id: string;
  target_url: string;
  analyzer_status: string;
  endpoint_observations?: Array<{
    url: string;
    statusCode: number | null;
    observedSignals: string[];
    ideSignals: string[];
    sensitiveKeywords: string[];
  }> | null;
  summary?: { customerSummary?: string } | null;
  endpoint_count: number;
  ide_signal_count: number;
  introspection_signal_count: number;
  auth_unknown_count: number;
  sensitive_keyword_count: number;
  mutation_signal_count: number;
  graphql_risk_signal_count: number;
  blocked_execution_count: number;
  graphql_risk_score: number;
  created_at: string;
};

type GraphqlFinding = {
  id: string;
  category: string;
  title: string;
  severity: string;
  confidence: string;
  affected_url: string;
  observed_value?: string | null;
  expected_value?: string | null;
  risk_signals: string[];
  api_top10_mapping: string[];
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
  if (score >= 70) return "text-red-700";
  if (score >= 35) return "text-amber-700";
  return "text-emerald-700";
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}

export function GraphqlRiskPanel({
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
  inventories: GraphqlInventory[];
  findings: GraphqlFinding[];
  message?: string;
}) {
  const latest = inventories[0];
  const observations = latest?.endpoint_observations || [];

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
              GraphQL Risk Analyzer
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Endpoint, IDE, introspection, mutation and sensitive schema
              signals
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Reviews GraphQL surface metadata safely. No query, introspection
              query, or mutation is executed.
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
            GET/HEAD metadata-only. No GraphQL operations. No introspection
            query. No mutation. No schema dump. No private body storage.
          </p>
        </div>

        <form
          action={runGraphqlRiskAnalysis}
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
                    ? "Small GraphQL path sample."
                    : intensity === "deep"
                      ? "Larger candidate endpoint review."
                      : "Balanced GraphQL risk review."}
                </p>
              </label>
            ))}
          </div>

          <label className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
            <input type="checkbox" name="permissionAccepted" className="mt-1" />
            <span>
              I confirm I own or am authorized to test this website/API. I allow
              safe GraphQL metadata review only. No query, introspection query,
              mutation, brute force, exploit payload, or private data storage is
              allowed.
            </span>
          </label>

          <button
            disabled={!verifiedScope}
            className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Run GraphQL risk analyzer
          </button>
        </form>
      </div>

      {latest ? (
        <>
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <p className="text-sm font-black text-slate-500">
              GraphQL risk score
            </p>
            <p
              className={`mt-2 text-7xl font-black ${scoreClass(latest.graphql_risk_score)}`}
            >
              {latest.graphql_risk_score}
            </p>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              {latest.summary?.customerSummary ||
                "GraphQL risk inventory saved."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <StatCard label="Endpoints" value={latest.endpoint_count} />
            <StatCard label="IDE signals" value={latest.ide_signal_count} />
            <StatCard
              label="Introspection signals"
              value={latest.introspection_signal_count}
            />
            <StatCard
              label="Sensitive keywords"
              value={latest.sensitive_keyword_count}
            />
            <StatCard
              label="Risk signals"
              value={latest.graphql_risk_signal_count}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Auth unknown" value={latest.auth_unknown_count} />
            <StatCard
              label="Mutation signals"
              value={latest.mutation_signal_count}
            />
            <StatCard
              label="Blocked execution"
              value={latest.blocked_execution_count}
            />
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
            <h3 className="text-2xl font-black text-red-950">
              GraphQL safety boundary
            </h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                "No GraphQL query execution",
                "No introspection query execution",
                "No mutation execution",
                "No schema dumping",
                "No brute force",
                "No exploit payloads",
                "No private body storage",
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
            <h3 className="text-2xl font-black">
              GraphQL endpoint observations
            </h3>
            <div className="mt-6 grid gap-4">
              {observations.length ? (
                observations.map((observation) => (
                  <div
                    key={observation.url}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="break-all font-black">
                          {observation.url}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Status {observation.statusCode || "N/A"}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                        metadata only
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-700">
                      Signals:{" "}
                      {[
                        ...(observation.observedSignals || []),
                        ...(observation.ideSignals || []),
                      ].join(", ") || "path candidate"}
                    </p>
                    {observation.sensitiveKeywords?.length ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                        Sensitive keyword signals:{" "}
                        {observation.sensitiveKeywords.join(", ")}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No GraphQL endpoint observations saved yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">GraphQL risk findings</h3>
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
                          {finding.category} · {finding.confidence} confidence ·
                          API Top 10{" "}
                          {(finding.api_top10_mapping || []).join(", ") ||
                            "N/A"}
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
                  No GraphQL risk findings saved yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Saved GraphQL analyzer runs</h3>
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
          <h3 className="text-2xl font-black">No GraphQL risk analysis yet</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Run analyzer to review GraphQL endpoint, IDE/playground,
            introspection, mutation and sensitive schema signals.
          </p>
        </div>
      )}
    </section>
  );
}
