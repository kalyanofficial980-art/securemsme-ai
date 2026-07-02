import Link from "next/link";
import {
  addManualBugItemAction,
  syncScannerFindingsAction,
  updateWorkspaceSummaryAction,
} from "@/app/reviews/actions";
import { BugLifecycleDashboard } from "@/components/BugLifecycleDashboard";
import { reviewStageLabels } from "@/lib/security-review-workspace-engine";

type Workspace = {
  id: string;
  title: string;
  client_name?: string | null;
  client_email?: string | null;
  target_url: string;
  review_type: string;
  status: string;
  priority: string;
  review_stage: string;
  overall_risk: string;
  progress_percent: number;
  total_items: number;
  open_items: number;
  in_progress_items: number;
  fixed_by_developer_items: number;
  needs_retest_items: number;
  verified_fixed_items: number;
  accepted_risk_items: number;
  false_positive_items: number;
  executive_summary: string;
  scope_summary: string;
  developer_summary: string;
  client_summary: string;
  internal_notes: string;
  scan_id?: string | null;
  updated_at: string;
};

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

type ActivityEvent = {
  id: string;
  event_type: string;
  title: string;
  details: string;
  created_at: string;
};

function StatCard({
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

function StagePill({ stage, active }: { stage: string; active: boolean }) {
  return (
    <span
      className={
        active
          ? "rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
          : "rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-600"
      }
    >
      {stage}
    </span>
  );
}

export function SecurityReviewWorkspacePanel({
  workspace,
  items,
  events,
  message,
}: {
  workspace: Workspace;
  items: BugItem[];
  events: ActivityEvent[];
  message?: string;
}) {
  const stages = [
    "intake",
    "scope-confirmed",
    "scanning",
    "triage",
    "developer-fix",
    "retest",
    "client-approval",
    "completed",
  ];

  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-black text-blue-700">
              Security review workspace
            </p>
            <h1 className="mt-2 text-4xl font-black text-blue-950">
              {workspace.title}
            </h1>
            <p className="mt-3 max-w-3xl break-all leading-7 text-blue-900">
              {workspace.target_url}
            </p>
            <p className="mt-3 max-w-3xl leading-7 text-blue-900">
              Client: {workspace.client_name || "Not added"} · Type:{" "}
              {workspace.review_type} · Status: {workspace.status}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {workspace.scan_id ? (
              <>
                <Link
                  href={`/report/${workspace.scan_id}/vulnerability-scanner`}
                  className="rounded-full bg-blue-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-900"
                >
                  Run Bug Finder
                </Link>
                <Link
                  href={`/report/${workspace.scan_id}`}
                  className="rounded-full border border-blue-300 bg-white px-5 py-3 text-sm font-black text-blue-950 hover:bg-blue-100"
                >
                  Open Report
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {stages.map((stage) => (
            <StagePill
              key={stage}
              stage={reviewStageLabels[stage as keyof typeof reviewStageLabels]}
              active={workspace.review_stage === stage}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Progress"
          value={`${workspace.progress_percent}%`}
          helper={workspace.overall_risk}
        />
        <StatCard
          label="Total items"
          value={workspace.total_items}
          helper="Tracked bugs/risks"
        />
        <StatCard
          label="Open / Progress"
          value={`${workspace.open_items}/${workspace.in_progress_items}`}
          helper="Need action"
        />
        <StatCard
          label="Verified fixed"
          value={workspace.verified_fixed_items}
          helper="Retest passed"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Fixed by dev"
          value={workspace.fixed_by_developer_items}
          helper="Needs verification"
        />
        <StatCard
          label="Needs retest"
          value={workspace.needs_retest_items}
          helper="Run retest proof"
        />
        <StatCard
          label="Accepted risk"
          value={workspace.accepted_risk_items}
          helper="Client accepted"
        />
        <StatCard
          label="False positive"
          value={workspace.false_positive_items}
          helper="Closed as invalid"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          action={syncScannerFindingsAction}
          className="rounded-3xl border border-slate-200 bg-white p-8"
        >
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <h2 className="text-2xl font-black">Sync scanner findings</h2>
          <p className="mt-3 leading-7 text-slate-600">
            After running Vulnerability Scanner + Bug Finder, sync findings into
            this lifecycle board.
          </p>
          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Sync latest scanner findings
          </button>
        </form>

        <form
          action={addManualBugItemAction}
          className="rounded-3xl border border-slate-200 bg-white p-8"
        >
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <h2 className="text-2xl font-black">Add manual bug/risk</h2>

          <div className="mt-5 grid gap-3">
            <input
              name="title"
              required
              placeholder="Bug title"
              className="rounded-2xl border border-slate-300 px-4 py-3"
            />
            <input
              name="affectedUrl"
              placeholder="Affected URL"
              defaultValue={workspace.target_url}
              className="rounded-2xl border border-slate-300 px-4 py-3"
            />
            <div className="grid gap-3 md:grid-cols-3">
              <select
                name="severity"
                defaultValue="Medium"
                className="rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              >
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
                <option>Info</option>
              </select>
              <select
                name="itemType"
                defaultValue="bug"
                className="rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              >
                <option value="bug">Bug</option>
                <option value="risk">Risk</option>
                <option value="misconfiguration">Misconfiguration</option>
                <option value="customer-data-risk">Customer data risk</option>
                <option value="trust-gap">Trust gap</option>
                <option value="manual-task">Manual task</option>
              </select>
              <select
                name="ownerType"
                defaultValue="developer"
                className="rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              >
                <option value="developer">Developer</option>
                <option value="platform">Platform</option>
                <option value="client">Client</option>
                <option value="expert-reviewer">Expert reviewer</option>
              </select>
            </div>
            <textarea
              name="evidenceSummary"
              placeholder="Evidence summary"
              className="min-h-20 rounded-2xl border border-slate-300 px-4 py-3"
            />
            <textarea
              name="businessImpact"
              placeholder="Business impact"
              className="min-h-20 rounded-2xl border border-slate-300 px-4 py-3"
            />
            <textarea
              name="developerFix"
              placeholder="Developer fix"
              className="min-h-20 rounded-2xl border border-slate-300 px-4 py-3"
            />
            <textarea
              name="retestSteps"
              placeholder="Retest steps"
              className="min-h-20 rounded-2xl border border-slate-300 px-4 py-3"
            />
          </div>

          <button className="mt-5 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Add item
          </button>
        </form>
      </div>

      <BugLifecycleDashboard workspaceId={workspace.id} items={items} />

      <form
        action={updateWorkspaceSummaryAction}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <input type="hidden" name="workspaceId" value={workspace.id} />
        <h2 className="text-2xl font-black">Workspace summary</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="font-bold">
            Status
            <select
              name="status"
              defaultValue={workspace.status}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="waiting-for-client">Waiting for client</option>
              <option value="waiting-for-developer">
                Waiting for developer
              </option>
              <option value="retest-needed">Retest needed</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="font-bold">
            Priority
            <select
              name="priority"
              defaultValue={workspace.priority}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="font-bold">
            Stage
            <select
              name="reviewStage"
              defaultValue={workspace.review_stage}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
            >
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {reviewStageLabels[stage as keyof typeof reviewStageLabels]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <textarea
            name="executiveSummary"
            defaultValue={workspace.executive_summary}
            placeholder="Executive summary"
            className="min-h-32 rounded-2xl border border-slate-300 px-4 py-3"
          />
          <textarea
            name="scopeSummary"
            defaultValue={workspace.scope_summary}
            placeholder="Scope summary"
            className="min-h-32 rounded-2xl border border-slate-300 px-4 py-3"
          />
          <textarea
            name="developerSummary"
            defaultValue={workspace.developer_summary}
            placeholder="Developer summary"
            className="min-h-32 rounded-2xl border border-slate-300 px-4 py-3"
          />
          <textarea
            name="clientSummary"
            defaultValue={workspace.client_summary}
            placeholder="Client summary"
            className="min-h-32 rounded-2xl border border-slate-300 px-4 py-3"
          />
        </div>

        <textarea
          name="internalNotes"
          defaultValue={workspace.internal_notes}
          placeholder="Internal notes"
          className="mt-4 min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3"
        />

        <button className="mt-5 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
          Save workspace
        </button>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">Activity timeline</h2>
        <div className="mt-5 grid gap-3">
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
            <p className="text-slate-600">No activity yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
