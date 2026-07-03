import {
  createFixTasksForScan,
  updateFixItemStatus,
} from "@/app/report/[id]/customer-value/actions";
import type {
  CustomerFixTask,
  CustomerValueReport,
} from "@/lib/customer-value";

function severityClass(severity: CustomerFixTask["severity"]) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-900";
  if (severity === "Low") return "bg-slate-100 text-slate-700";

  return "bg-emerald-50 text-emerald-800";
}

function statusClass(status: CustomerFixTask["status"]) {
  if (status === "fixed")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "in_progress")
    return "border-blue-200 bg-blue-50 text-blue-900";
  if (status === "needs_review")
    return "border-purple-200 bg-purple-50 text-purple-900";
  if (status === "accepted_risk")
    return "border-slate-300 bg-slate-100 text-slate-800";

  return "border-red-200 bg-red-50 text-red-900";
}

function statusLabel(status: CustomerFixTask["status"]) {
  if (status === "in_progress") return "In progress";
  if (status === "needs_review") return "Needs review";
  if (status === "accepted_risk") return "Accepted risk";
  if (status === "fixed") return "Fixed";

  return "Open";
}

export function CustomerValuePanel({
  scanId,
  report,
  hasSavedWorkflow,
  message,
}: {
  scanId: string;
  report: CustomerValueReport;
  hasSavedWorkflow: boolean;
  message?: string;
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black text-slate-500">
              Customer value layer
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Before / After fix tracking
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              {report.customerMessage}
            </p>
          </div>

          <form action={createFixTasksForScan}>
            <input type="hidden" name="scanId" value={scanId} />
            <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              {hasSavedWorkflow
                ? "Refresh fix workflow"
                : "Create fix workflow"}
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-600">Current score</p>
            <p className="mt-2 text-4xl font-black">{report.currentScore}</p>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {report.currentRiskLevel}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-600">Previous score</p>
            <p className="mt-2 text-4xl font-black">
              {report.previousScore ?? "—"}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {report.previousRiskLevel ?? "No previous scan"}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-bold text-emerald-700">Improvement</p>
            <p className="mt-2 text-2xl font-black text-emerald-950">
              {report.improvementLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-bold text-blue-700">Fix completion</p>
            <p className="mt-2 text-4xl font-black text-blue-950">
              {report.completionPercent}%
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-black text-red-700">Open</p>
            <p className="mt-1 text-3xl font-black text-red-950">
              {report.openTasks}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-black text-blue-700">In progress</p>
            <p className="mt-1 text-3xl font-black text-blue-950">
              {report.inProgressTasks}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-black text-emerald-700">Fixed</p>
            <p className="mt-1 text-3xl font-black text-emerald-950">
              {report.fixedTasks}
            </p>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
            <p className="text-xs font-black text-purple-700">Needs review</p>
            <p className="mt-1 text-3xl font-black text-purple-950">
              {report.needsReviewTasks}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black text-slate-600">Accepted risk</p>
            <p className="mt-1 text-3xl font-black">
              {report.acceptedRiskTasks}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">Owner action plan</h3>
          <div className="mt-5 space-y-3">
            {report.ownerActionPlan.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
          <h3 className="text-2xl font-black text-emerald-950">
            Proof-of-fix summary
          </h3>
          <p className="mt-4 leading-7 text-emerald-900">
            {report.proofOfFixSummary}
          </p>
          <p className="mt-4 font-bold leading-7 text-emerald-950">
            {report.retestRecommendation}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-slate-500">
              Developer checklist
            </p>
            <h3 className="mt-2 text-2xl font-black">
              Fix tasks from this report
            </h3>
          </div>
          <p className="text-sm font-bold text-slate-500">
            {report.totalTasks} tracked item(s)
          </p>
        </div>

        <div className="mt-6 grid gap-5">
          {report.developerChecklist.length ? (
            report.developerChecklist.map((task) => (
              <div
                key={task.id || task.fingerprint}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {task.source} · {task.category}
                    </p>
                    <h4 className="mt-1 text-xl font-black">{task.title}</h4>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(
                        task.severity,
                      )}`}
                    >
                      {task.severity}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                        task.status,
                      )}`}
                    >
                      {statusLabel(task.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-700">
                  <p>
                    <span className="font-black text-slate-950">
                      Customer impact:
                    </span>{" "}
                    {task.customerImpact}
                  </p>
                  <p>
                    <span className="font-black text-slate-950">
                      Developer fix:
                    </span>{" "}
                    {task.developerFix}
                  </p>
                  <p>
                    <span className="font-black text-slate-950">
                      Owner action:
                    </span>{" "}
                    {task.ownerAction}
                  </p>
                  <p>
                    <span className="font-black text-slate-950">
                      Proof hint:
                    </span>{" "}
                    {task.proofHint}
                  </p>

                  {task.evidence.length ? (
                    <div>
                      <p className="font-black text-slate-950">Evidence</p>
                      <ul className="mt-2 list-inside list-disc space-y-1">
                        {task.evidence.map((evidence) => (
                          <li key={evidence} className="break-all">
                            {evidence}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {task.id ? (
                  <form
                    action={updateFixItemStatus}
                    className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <input type="hidden" name="scanId" value={scanId} />
                    <input type="hidden" name="itemId" value={task.id} />

                    <label className="text-sm font-black text-slate-700">
                      Update status
                    </label>
                    <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr_auto]">
                      <select
                        name="status"
                        defaultValue={task.status}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-3 font-bold"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="fixed">Fixed</option>
                        <option value="needs_review">Needs review</option>
                        <option value="accepted_risk">Accepted risk</option>
                      </select>

                      <input
                        name="notes"
                        defaultValue={task.notes || ""}
                        placeholder="Optional note for developer/customer"
                        className="rounded-xl border border-slate-300 px-3 py-3"
                      />

                      <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-800">
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
                    Create fix workflow to save status and notes for this item.
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
              No actionable fix tasks were found in this report.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
