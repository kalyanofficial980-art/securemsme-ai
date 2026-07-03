import type {
  AdvancedSecurityAudit,
  AuditStatus,
} from "@/lib/advanced-security-audit";

function statusClasses(status: AuditStatus) {
  if (status === "pass")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "warning")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "fail") return "border-red-200 bg-red-50 text-red-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatusPill({ status }: { status: AuditStatus }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses(
        status,
      )}`}
    >
      {status}
    </span>
  );
}

export function AdvancedAuditPanel({
  audit,
}: {
  audit: AdvancedSecurityAudit;
}) {
  const failedControls = [
    ...audit.owaspTop10,
    ...audit.asvsControls,
    ...audit.complianceSignals,
  ].filter((control) => control.status === "fail").length;

  const warningControls = [
    ...audit.owaspTop10,
    ...audit.asvsControls,
    ...audit.complianceSignals,
  ].filter((control) => control.status === "warning").length;

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-bold text-slate-500">
          Advanced audit engine
        </p>
        <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-3xl font-black">Security maturity audit</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              {audit.riskNarrative}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-sm text-slate-300">Maturity score</p>
            <p className="mt-1 text-5xl font-black">{audit.maturityScore}</p>
            <p className="mt-2 font-bold">{audit.maturityLevel}</p>
            <p className="text-sm text-slate-300">{audit.startupGrade}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-700">Failed controls</p>
            <p className="mt-2 text-3xl font-black text-red-950">
              {failedControls}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-bold text-amber-700">Warning controls</p>
            <p className="mt-2 text-3xl font-black text-amber-950">
              {warningControls}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-600">Evidence records</p>
            <p className="mt-2 text-3xl font-black">
              {audit.evidenceRecords.length}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Executive actions</h3>
        <div className="mt-5 grid gap-3">
          {audit.executiveActions.map((action) => (
            <div
              key={action}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold"
            >
              {action}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">OWASP-style control mapping</h3>
        <div className="mt-6 grid gap-4">
          {audit.owaspTop10.map((control) => (
            <div
              key={control.id}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-black text-slate-500">
                    {control.id}
                  </p>
                  <h4 className="mt-1 text-lg font-black">{control.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {control.businessRisk}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <StatusPill status={control.status} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                    {control.score}/100
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm font-bold text-slate-800">
                Fix: {control.recommendation}
              </p>
              <p className="mt-2 text-xs font-bold text-slate-500">
                Testing depth: {control.testingDepth}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">ASVS-style audit areas</h3>
          <div className="mt-6 space-y-4">
            {audit.asvsControls.map((control) => (
              <div
                key={control.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-500">
                      {control.id}
                    </p>
                    <h4 className="mt-1 font-black">{control.title}</h4>
                  </div>
                  <StatusPill status={control.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {control.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">Trust and compliance signals</h3>
          <div className="mt-6 space-y-4">
            {audit.complianceSignals.map((control) => (
              <div
                key={control.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-500">
                      {control.id}
                    </p>
                    <h4 className="mt-1 font-black">{control.title}</h4>
                  </div>
                  <StatusPill status={control.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {control.businessRisk}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Evidence records</h3>
        <div className="mt-6 grid gap-4">
          {audit.evidenceRecords.length ? (
            audit.evidenceRecords.slice(0, 12).map((evidence) => (
              <div
                key={evidence.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black text-slate-500">
                      {evidence.id}
                    </p>
                    <h4 className="mt-1 font-black">{evidence.findingName}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {evidence.riskStatement}
                    </p>
                  </div>
                  <StatusPill status={evidence.observedStatus} />
                </div>
                <p className="mt-3 text-sm font-bold">
                  Recommendation: {evidence.recommendedAction}
                </p>
              </div>
            ))
          ) : (
            <p className="text-slate-600">
              No evidence records were generated.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
          <h3 className="text-2xl font-black text-emerald-950">
            Safe testing model
          </h3>
          <ul className="mt-5 space-y-3">
            {audit.safeTestingModel.map((item) => (
              <li key={item} className="font-bold text-emerald-900">
                ✓ {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h3 className="text-2xl font-black text-amber-950">Limitations</h3>
          <ul className="mt-5 space-y-3">
            {audit.limitations.map((item) => (
              <li key={item} className="font-bold text-amber-900">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
