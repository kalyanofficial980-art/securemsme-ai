import type {
  EvidenceCalibrationReport,
  EvidenceSeverity,
  EvidenceStatus,
  FalsePositiveRisk,
} from "@/lib/evidence-calibration";

function statusClass(status: EvidenceStatus) {
  if (status === "confirmed")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "probable")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "manual-review")
    return "border-purple-200 bg-purple-50 text-purple-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function severityClass(severity: EvidenceSeverity) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-800";
  if (severity === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

function falsePositiveClass(risk: FalsePositiveRisk) {
  if (risk === "Low") return "bg-emerald-50 text-emerald-900";
  if (risk === "Medium") return "bg-amber-50 text-amber-900";
  return "bg-red-50 text-red-900";
}

export function EvidenceCalibrationPanel({
  calibration,
}: {
  calibration: EvidenceCalibrationReport;
}) {
  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-black text-slate-500">
          Evidence calibration and false-positive guard
        </p>

        <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-3xl font-black">Report trust calibration</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              {calibration.falsePositiveGuardSummary}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-sm text-slate-300">Report quality score</p>
            <p className="mt-1 text-5xl font-black">
              {calibration.reportQualityScore}
            </p>
            <p className="mt-2 font-bold">{calibration.trustLevel}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-bold text-emerald-700">Confirmed</p>
            <p className="mt-2 text-3xl font-black text-emerald-950">
              {calibration.confirmedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-bold text-amber-700">Probable</p>
            <p className="mt-2 text-3xl font-black text-amber-950">
              {calibration.probableCount}
            </p>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <p className="text-sm font-bold text-purple-700">Manual review</p>
            <p className="mt-2 text-3xl font-black text-purple-950">
              {calibration.manualReviewCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-600">Informational</p>
            <p className="mt-2 text-3xl font-black">
              {calibration.informationalCount}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
        <h3 className="text-2xl font-black text-emerald-950">
          Safe customer claim
        </h3>
        <p className="mt-3 text-lg font-bold leading-8 text-emerald-900">
          {calibration.safeCustomerClaim}
        </p>
      </div>

      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h3 className="text-2xl font-black text-red-950">Blocked claims</h3>
        <div className="mt-5 grid gap-3">
          {calibration.blockedClaims.map((claim) => (
            <div
              key={claim}
              className="rounded-2xl bg-white/70 p-4 font-bold text-red-900"
            >
              ✕ {claim}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Calibrated evidence records</h3>
        <div className="mt-6 grid gap-5">
          {calibration.items.length ? (
            calibration.items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {item.id} · {item.source} · {item.category}
                    </p>
                    <h4 className="mt-1 text-xl font-black">{item.title}</h4>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(item.severity)}`}
                    >
                      {item.severity}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(item.status)}`}
                    >
                      {item.status}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${falsePositiveClass(item.falsePositiveRisk)}`}
                    >
                      FP {item.falsePositiveRisk}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-700">
                  <div>
                    <p className="font-black text-slate-950">Evidence</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {item.evidence.map((evidence) => (
                        <li key={evidence} className="break-all">
                          {evidence}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p>
                    <span className="font-black text-slate-950">
                      Why this is real:
                    </span>{" "}
                    {item.whyThisIsReal}
                  </p>

                  <p>
                    <span className="font-black text-slate-950">
                      Customer impact:
                    </span>{" "}
                    {item.customerImpact}
                  </p>

                  <p>
                    <span className="font-black text-slate-950">
                      Developer fix:
                    </span>{" "}
                    {item.developerFix}
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">
                      Can claim: {item.whatCanBeClaimed}
                    </div>
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-900">
                      Cannot claim: {item.whatCannotBeClaimed}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-600">
              No evidence items were available for calibration.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Priority validation</h3>
        <div className="mt-5 grid gap-3">
          {calibration.priorityValidation.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Calibration rules</h3>
        <ul className="mt-5 space-y-3">
          {calibration.calibrationRules.map((rule) => (
            <li key={rule} className="font-bold text-slate-700">
              • {rule}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
