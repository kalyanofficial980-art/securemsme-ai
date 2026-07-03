import { updateBugLifecycleStatusAction } from "@/app/reviews/actions";
import {
  reviewStatusLabels,
  reviewStatusOrder,
  type ReviewItemStatus,
} from "@/lib/security-review-workspace-engine";

type BugItem = {
  id: string;
  item_type: string;
  title: string;
  severity: string;
  priority: string;
  lifecycle_status: string;
  owner_type: string;
  assigned_to?: string | null;
  affected_url: string;
  evidence_summary: string;
  business_impact: string;
  customer_data_risk: string;
  developer_fix: string;
  retest_steps: string;
  reviewer_note?: string | null;
  client_safe_note?: string | null;
  updated_at: string;
};

function severityClass(severity: string) {
  if (severity === "Critical") return "bg-red-700 text-white";
  if (severity === "High") return "bg-red-100 text-red-950";
  if (severity === "Medium") return "bg-amber-100 text-amber-950";
  if (severity === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

function BugCard({
  workspaceId,
  item,
}: {
  workspaceId: string;
  item: BugItem;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(item.severity)}`}
        >
          {item.severity}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
          {item.item_type}
        </span>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">
          owner: {item.owner_type}
        </span>
      </div>

      <h4 className="mt-4 text-lg font-black text-slate-950">{item.title}</h4>
      <p className="mt-2 break-all text-xs font-bold text-slate-500">
        {item.affected_url}
      </p>

      <details className="mt-4 rounded-2xl bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-black">
          Evidence + fix details
        </summary>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
          <p>
            <span className="font-black">Evidence:</span>{" "}
            {item.evidence_summary || "No evidence summary yet."}
          </p>
          <p>
            <span className="font-black">Business impact:</span>{" "}
            {item.business_impact || "Needs review."}
          </p>
          <p>
            <span className="font-black">Customer data risk:</span>{" "}
            {item.customer_data_risk || "Needs review."}
          </p>
          <p>
            <span className="font-black">Developer fix:</span>{" "}
            {item.developer_fix || "Needs review."}
          </p>
          <p>
            <span className="font-black">Retest:</span>{" "}
            {item.retest_steps || "Retest after fix."}
          </p>
        </div>
      </details>

      <form
        action={updateBugLifecycleStatusAction}
        className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="itemId" value={item.id} />

        <select
          name="lifecycleStatus"
          defaultValue={item.lifecycle_status}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
        >
          {reviewStatusOrder.map((status) => (
            <option key={status} value={status}>
              {reviewStatusLabels[status]}
            </option>
          ))}
        </select>

        <textarea
          name="reviewerNote"
          defaultValue={item.reviewer_note || ""}
          placeholder="Reviewer note / developer update / retest note"
          className="min-h-20 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
        />

        <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          Update lifecycle
        </button>
      </form>
    </div>
  );
}

export function BugLifecycleDashboard({
  workspaceId,
  items,
}: {
  workspaceId: string;
  items: BugItem[];
}) {
  const grouped = reviewStatusOrder.map((status) => ({
    status,
    items: items.filter((item) => item.lifecycle_status === status),
  }));

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8">
      <div>
        <p className="text-sm font-black text-slate-500">Bug lifecycle board</p>
        <h2 className="mt-2 text-3xl font-black">
          Track every finding until verified fixed
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          This board replaces normal freelancer follow-up. Every bug has
          evidence, developer fix, retest steps and lifecycle status.
        </p>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-3">
        {grouped.map((group) => (
          <div
            key={group.status}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black">
                {reviewStatusLabels[group.status as ReviewItemStatus]}
              </h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                {group.items.length}
              </span>
            </div>

            <div className="mt-4 grid gap-4">
              {group.items.length ? (
                group.items.map((item) => (
                  <BugCard
                    key={item.id}
                    workspaceId={workspaceId}
                    item={item}
                  />
                ))
              ) : (
                <p className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                  No items.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
