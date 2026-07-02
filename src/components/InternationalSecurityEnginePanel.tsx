import { createInternationalSecurityEngineJob } from "@/app/report/[id]/security-engine/actions";

type EngineJob = {
  id: string;
  target_url: string;
  status: string;
  intensity: string;
  verified_scope: boolean;
  app_classification?: {
    siteType?: string;
    confidence?: string;
    detectedSignals?: string[];
    coverageNeeds?: string[];
  } | null;
  standards_summary?: {
    owaspWstg?: string[];
    owaspAsvs?: string[];
    owaspApiTop10?: string[];
    nistSsdf?: string[];
  } | null;
  blocked_modules?: Array<{
    moduleId: string;
    moduleName: string;
    blockedReason: string;
  }> | null;
  coverage_score: number;
  evidence_count: number;
  vulnerability_count: number;
  created_at: string;
};

type EngineModule = {
  id: string;
  module_name: string;
  category: string;
  stage: string;
  status: string;
  required_scope: string;
  safe_methods: string[];
  can_claim: string;
  cannot_claim: string;
};

type EvidenceRow = {
  id: string;
  title: string;
  severity: string;
  confidence: string;
  asset_type: string;
  proof_type: string;
  evidence_summary: string;
  developer_fix: string;
};

type VulnerabilityRow = {
  id: string;
  title: string;
  category: string;
  severity: string;
  confidence: string;
  exploitability_score: number;
  business_impact_score: number;
  priority_score: number;
  lifecycle_status: string;
  business_impact: string;
  verification_guidance: string;
};

type EventRow = {
  id: string;
  event_type: string;
  title: string;
  details?: string | null;
  created_at: string;
};

function statusClass(status: string) {
  if (status === "completed")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "blocked" || status === "failed")
    return "border-red-200 bg-red-50 text-red-900";
  if (status === "running") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function severityClass(severity: string) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-900";
  if (severity === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

function ScoreCard({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">
        {value}
        {suffix}
      </p>
    </div>
  );
}

export function InternationalSecurityEnginePanel({
  scanId,
  targetUrl,
  verifiedScope,
  jobs,
  modules,
  evidence,
  vulnerabilities,
  events,
  message,
}: {
  scanId: string;
  targetUrl: string;
  verifiedScope: boolean;
  jobs: EngineJob[];
  modules: EngineModule[];
  evidence: EvidenceRow[];
  vulnerabilities: VulnerabilityRow[];
  events: EventRow[];
  message?: string;
}) {
  const latestJob = jobs[0];
  const classification = latestJob?.app_classification;
  const standards = latestJob?.standards_summary;
  const blockedModules = latestJob?.blocked_modules || [];

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
              International security engine core
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Job orchestration, module pipeline, evidence warehouse
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Creates a standards-aware scan job with module selection, coverage
              matrix, normalized evidence, and vulnerability lifecycle seeds.
            </p>
          </div>
          <div
            className={
              verifiedScope
                ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-950"
                : "rounded-2xl border border-amber-200 bg-amber-50 p-4 font-black text-amber-950"
            }
          >
            {verifiedScope ? "Verified scope ready" : "Public-safe only"}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="break-all font-black">{targetUrl}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Verified and authenticated modules stay blocked until correct scope
            exists.
          </p>
        </div>

        <form
          action={createInternationalSecurityEngineJob}
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
                  Engine job planning and module readiness.
                </p>
              </label>
            ))}
          </div>
          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Create international engine job
          </button>
        </form>
      </div>

      {latestJob ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <ScoreCard
              label="Coverage"
              value={latestJob.coverage_score}
              suffix="%"
            />
            <ScoreCard label="Modules" value={modules.length} />
            <ScoreCard label="Blocked" value={blockedModules.length} />
            <ScoreCard label="Evidence" value={latestJob.evidence_count} />
            <ScoreCard
              label="Vulnerabilities"
              value={latestJob.vulnerability_count}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h3 className="text-2xl font-black">Latest engine job</h3>
                <p className="mt-2 text-slate-600">
                  Application type: {classification?.siteType || "unknown"} ·
                  Confidence: {classification?.confidence || "N/A"}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(latestJob.status)}`}
              >
                {latestJob.status}
              </span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="font-black">Detected signals</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {(classification?.detectedSignals || []).join(", ") ||
                    "No signals saved"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="font-black">Coverage needs</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {(classification?.coverageNeeds || []).join(", ") ||
                    "No coverage needs saved"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
            <h3 className="text-2xl font-black text-blue-950">
              Standards coverage
            </h3>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white/70 p-4">
                <p className="font-black">OWASP WSTG</p>
                <p className="mt-2 text-sm text-blue-900">
                  {(standards?.owaspWstg || []).join(", ") || "None"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/70 p-4">
                <p className="font-black">OWASP ASVS</p>
                <p className="mt-2 text-sm text-blue-900">
                  {(standards?.owaspAsvs || []).join(", ") || "None"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/70 p-4">
                <p className="font-black">API Top 10</p>
                <p className="mt-2 text-sm text-blue-900">
                  {(standards?.owaspApiTop10 || []).join(", ") || "None"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/70 p-4">
                <p className="font-black">NIST SSDF</p>
                <p className="mt-2 text-sm text-blue-900">
                  {(standards?.nistSsdf || []).join(", ") || "None"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Selected module pipeline</h3>
            <div className="mt-6 grid gap-4">
              {modules.length ? (
                modules.map((module) => (
                  <div
                    key={module.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {module.category} · {module.stage} ·{" "}
                          {module.required_scope}
                        </p>
                        <h4 className="mt-1 font-black">
                          {module.module_name}
                        </h4>
                        <p className="mt-2 text-sm text-slate-600">
                          Safe methods: {(module.safe_methods || []).join(", ")}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(module.status)}`}
                      >
                        {module.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                        Can claim: {module.can_claim}
                      </div>
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
                        Cannot claim: {module.cannot_claim}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No module rows saved yet.
                </p>
              )}
            </div>
          </div>

          {blockedModules.length ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
              <h3 className="text-2xl font-black text-amber-950">
                Blocked advanced modules
              </h3>
              <div className="mt-6 grid gap-4">
                {blockedModules.map((module) => (
                  <div
                    key={module.moduleId}
                    className="rounded-2xl bg-white/70 p-5"
                  >
                    <p className="font-black">{module.moduleName}</p>
                    <p className="mt-2 text-sm font-bold text-amber-900">
                      {module.blockedReason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">
              Normalized evidence warehouse
            </h3>
            <div className="mt-6 grid gap-4">
              {evidence.length ? (
                evidence.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {item.asset_type} · {item.proof_type} ·{" "}
                          {item.confidence}
                        </p>
                        <h4 className="mt-1 font-black">{item.title}</h4>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(item.severity)}`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.evidence_summary}
                    </p>
                    <p className="mt-3 text-sm font-bold text-slate-800">
                      Developer fix: {item.developer_fix}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No normalized evidence saved yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">
              Vulnerability lifecycle seeds
            </h3>
            <div className="mt-6 grid gap-4">
              {vulnerabilities.length ? (
                vulnerabilities.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {item.category} · {item.lifecycle_status} ·{" "}
                          {item.confidence}
                        </p>
                        <h4 className="mt-1 font-black">{item.title}</h4>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(item.severity)}`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-bold text-slate-600">
                          Exploitability
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {item.exploitability_score}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-bold text-slate-600">
                          Business impact
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {item.business_impact_score}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-bold text-slate-600">
                          Priority
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {item.priority_score}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {item.business_impact}
                    </p>
                    <p className="mt-3 text-sm font-bold text-slate-800">
                      Verification: {item.verification_guidance}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No vulnerability lifecycle seeds saved yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Engine events</h3>
            <div className="mt-6 grid gap-3">
              {events.length ? (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-black">{event.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {event.event_type} ·{" "}
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                    {event.details ? (
                      <p className="mt-2 text-sm text-slate-600">
                        {event.details}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No engine events saved yet.
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">No engine job yet</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Create the first international security engine job.
          </p>
        </div>
      )}
    </section>
  );
}
