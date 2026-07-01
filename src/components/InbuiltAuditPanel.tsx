import type {
  InbuiltAdvancedAudit,
  InbuiltAuditStatus,
} from "@/lib/inbuilt-advanced-audit";

function statusClass(status: InbuiltAuditStatus) {
  if (status === "pass")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "warning")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "fail") return "border-red-200 bg-red-50 text-red-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatusPill({ status }: { status: InbuiltAuditStatus }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(
        status,
      )}`}
    >
      {status}
    </span>
  );
}

export function InbuiltAuditPanel({ audit }: { audit: InbuiltAdvancedAudit }) {
  const failed = audit.evidence.filter((item) => item.status === "fail").length;
  const warnings = audit.evidence.filter(
    (item) => item.status === "warning",
  ).length;

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-bold text-slate-500">
          Inbuilt advanced audit engine
        </p>

        <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-3xl font-black">
              Customer-ready automated security audit
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              {audit.customerSummary}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-sm text-slate-300">Inbuilt audit score</p>
            <p className="mt-1 text-5xl font-black">{audit.overallScore}</p>
            <p className="mt-2 font-bold">{audit.maturityLevel}</p>
            <p className="text-sm text-slate-300">{audit.businessReadiness}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-700">Failed checks</p>
            <p className="mt-2 text-3xl font-black text-red-950">{failed}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-bold text-amber-700">Warnings</p>
            <p className="mt-2 text-3xl font-black text-amber-950">
              {warnings}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-600">Evidence records</p>
            <p className="mt-2 text-3xl font-black">{audit.evidence.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Audit modules</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {audit.modules.map((module) => (
            <div
              key={module.id}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-500">
                    {module.id}
                  </p>
                  <h4 className="mt-1 font-black">{module.name}</h4>
                </div>
                <StatusPill status={module.status} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {module.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                  Score {module.score}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                  Evidence {module.evidenceCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Priority fixes</h3>
        <div className="mt-5 grid gap-3">
          {audit.priorityFixes.map((fix) => (
            <div
              key={fix}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold"
            >
              {fix}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Evidence records</h3>
        <div className="mt-6 grid gap-4">
          {audit.evidence.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-black text-slate-500">
                    {item.id} · {item.module}
                  </p>
                  <h4 className="mt-1 text-lg font-black">{item.title}</h4>
                  <p className="mt-2 break-all text-xs font-bold text-slate-500">
                    {item.url}
                  </p>
                </div>
                <StatusPill status={item.status} />
              </div>

              <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
                <p>
                  <span className="font-black text-slate-950">Evidence:</span>{" "}
                  {item.evidence}
                </p>
                <p>
                  <span className="font-black text-slate-950">
                    Customer impact:
                  </span>{" "}
                  {item.customerImpact}
                </p>
                <p>
                  <span className="font-black text-slate-950">Fix:</span>{" "}
                  {item.fix}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
        <h3 className="text-2xl font-black text-emerald-950">
          Customer-side SaaS model
        </h3>
        <ul className="mt-5 space-y-3">
          {audit.safeTestingNotice.map((item) => (
            <li key={item} className="font-bold text-emerald-900">
              ✓ {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
