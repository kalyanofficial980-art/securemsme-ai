import {
  addDeveloperCommentAction,
  addDeveloperTaskAction,
  createDeveloperPortalAction,
  syncDeveloperTasksAction,
  updateDeveloperTaskStatusAction,
} from "@/app/developer-portal/actions";

type Portal = {
  id: string;
  portal_title: string;
  target_url: string;
  portal_status: string;
  access_level: string;
  share_token: string;
  total_task_count: number;
  open_task_count: number;
  in_progress_task_count: number;
  fixed_task_count: number;
  retest_requested_count: number;
  verified_fixed_count: number;
  blocked_task_count: number;
  fix_progress_score: number;
  developer_readiness_score: number;
  retest_readiness_score: number;
  developer_summary: string;
  client_safe_summary: string;
  retest_summary: string;
  created_at: string;
};

type Task = {
  id: string;
  source_type: string;
  task_title: string;
  task_status: string;
  priority: string;
  confidence_level: string;
  affected_area: string;
  developer_fix: string;
  safe_retest_steps: string;
  evidence_summary: string;
  client_safe_note: string;
  blocked_claim: string;
  owner_name: string;
  owner_email: string;
  estimated_effort: string;
};

type Comment = {
  id: string;
  task_id?: string | null;
  comment_type: string;
  visibility: string;
  comment_body: string;
  safe_comment: boolean;
  blocked_reason: string;
  created_at: string;
};

type Retest = {
  id: string;
  task_id?: string | null;
  request_status: string;
  request_reason: string;
  safe_retest_scope: string;
  created_at: string;
};

type Event = {
  id: string;
  title: string;
  details: string;
  created_at: string;
};

function badgeClass(value: string) {
  if (
    [
      "verified-fixed",
      "completed",
      "active",
      "Confirmed",
      "High",
      "passed",
    ].includes(value)
  )
    return "bg-emerald-100 text-emerald-950";
  if (
    [
      "fixed",
      "retest-requested",
      "in-progress",
      "Medium",
      "requested",
    ].includes(value)
  )
    return "bg-amber-100 text-amber-950";
  if (["blocked", "Critical", "failed"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

function ScoreCard({
  label,
  score,
  helper,
}: {
  label: string;
  score: number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-black text-slate-500">{label}</p>
      <p className="mt-3 text-5xl font-black text-slate-950">{score}</p>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-950"
          style={{ width: `${Math.max(3, Math.min(100, score))}%` }}
        />
      </div>
      {helper ? (
        <p className="mt-3 text-sm font-bold text-slate-600">{helper}</p>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

export function DeveloperPortalPanel({
  scanId,
  targetUrl,
  portals,
  selectedPortal,
  tasks,
  comments,
  retests,
  events,
  message,
}: {
  scanId: string;
  targetUrl: string;
  portals: Portal[];
  selectedPortal?: Portal | null;
  tasks: Task[];
  comments: Comment[];
  retests: Retest[];
  events: Event[];
  message?: string;
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <p className="text-sm font-black text-blue-700">Developer Portal v2</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Fix Collaboration Workspace
        </h1>
        <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
          {targetUrl}
        </p>
        <p className="mt-4 max-w-3xl leading-8 text-blue-900">
          Convert findings into developer tasks, track fix progress, collect
          safe comments and request retests.
        </p>
      </div>

      <form
        action={createDeveloperPortalAction}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <input type="hidden" name="scanId" value={scanId} />
        <h2 className="text-2xl font-black">Create Developer Fix Portal</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Creates a remediation board for developers. Do not share passwords,
          tokens, session cookies or exploit payloads.
        </p>
        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
          Create Portal
        </button>
      </form>

      {selectedPortal ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <ScoreCard
              label="Fix Progress"
              score={selectedPortal.fix_progress_score}
              helper={selectedPortal.portal_status}
            />
            <ScoreCard
              label="Developer Readiness"
              score={selectedPortal.developer_readiness_score}
              helper="Fix execution"
            />
            <ScoreCard
              label="Retest Readiness"
              score={selectedPortal.retest_readiness_score}
              helper="Ready for safe retest"
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black text-slate-500">
                  Selected portal
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {selectedPortal.portal_title}
                </h2>
                <p className="mt-4 max-w-4xl leading-8 text-slate-700">
                  {selectedPortal.developer_summary}
                </p>
                <p className="mt-2 max-w-4xl leading-7 text-slate-600">
                  {selectedPortal.client_safe_summary}
                </p>
              </div>
              <span
                className={`h-fit rounded-full px-4 py-2 text-sm font-black ${badgeClass(selectedPortal.portal_status)}`}
              >
                {selectedPortal.portal_status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-7">
              <MiniStat label="Total" value={selectedPortal.total_task_count} />
              <MiniStat label="Open" value={selectedPortal.open_task_count} />
              <MiniStat
                label="Progress"
                value={selectedPortal.in_progress_task_count}
              />
              <MiniStat label="Fixed" value={selectedPortal.fixed_task_count} />
              <MiniStat
                label="Retest"
                value={selectedPortal.retest_requested_count}
              />
              <MiniStat
                label="Verified"
                value={selectedPortal.verified_fixed_count}
              />
              <MiniStat
                label="Blocked"
                value={selectedPortal.blocked_task_count}
              />
            </div>

            <form action={syncDeveloperTasksAction} className="mt-6">
              <input type="hidden" name="scanId" value={scanId} />
              <input type="hidden" name="portalId" value={selectedPortal.id} />
              <button className="rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
                Sync tasks from findings
              </button>
            </form>
          </div>

          <form
            action={addDeveloperTaskAction}
            className="rounded-3xl border border-slate-200 bg-white p-8"
          >
            <input type="hidden" name="scanId" value={scanId} />
            <input type="hidden" name="portalId" value={selectedPortal.id} />
            <h2 className="text-2xl font-black">Add manual developer task</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                name="taskTitle"
                required
                placeholder="Task title"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <input
                name="affectedArea"
                placeholder="Affected area / URL / endpoint"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <select
                name="priority"
                defaultValue="Medium"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              >
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
                <option>Info</option>
              </select>
              <select
                name="confidence"
                defaultValue="Medium"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              >
                <option>Confirmed</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
                <option>Needs manual review</option>
              </select>
              <textarea
                name="evidenceSummary"
                placeholder="Evidence summary, no private data"
                className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3"
              />
              <textarea
                name="developerFix"
                placeholder="Developer fix guidance"
                className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3"
              />
              <textarea
                name="safeRetestSteps"
                placeholder="Safe retest steps"
                className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3"
              />
              <textarea
                name="clientSafeNote"
                placeholder="Client-safe note"
                className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3"
              />
            </div>
            <button className="mt-5 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Add Task
            </button>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Developer task board</h2>
            <div className="mt-6 grid gap-5">
              {tasks.length ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {task.source_type} · {task.confidence_level} · effort{" "}
                          {task.estimated_effort}
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          {task.task_title}
                        </h3>
                        <p className="mt-2 break-all text-sm font-bold text-slate-600">
                          {task.affected_area}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(task.task_status)}`}
                        >
                          {task.task_status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                        <p className="font-black">Evidence</p>
                        <p className="mt-2">{task.evidence_summary}</p>
                      </div>
                      <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                        <p className="font-black">Fix</p>
                        <p className="mt-2">{task.developer_fix}</p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                        <p className="font-black">Safe retest</p>
                        <p className="mt-2">{task.safe_retest_steps}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                      Blocked claim: {task.blocked_claim}
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <form
                        action={updateDeveloperTaskStatusAction}
                        className="flex flex-wrap gap-3"
                      >
                        <input type="hidden" name="scanId" value={scanId} />
                        <input
                          type="hidden"
                          name="portalId"
                          value={selectedPortal.id}
                        />
                        <input type="hidden" name="taskId" value={task.id} />
                        <select
                          name="taskStatus"
                          defaultValue={task.task_status}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black"
                        >
                          <option value="open">Open</option>
                          <option value="in-progress">In progress</option>
                          <option value="fixed">Fixed</option>
                          <option value="retest-requested">
                            Retest requested
                          </option>
                          <option value="verified-fixed">Verified fixed</option>
                          <option value="blocked">Blocked</option>
                          <option value="accepted-risk">Accepted risk</option>
                        </select>
                        <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                          Update
                        </button>
                      </form>

                      <form
                        action={addDeveloperCommentAction}
                        className="flex gap-3"
                      >
                        <input type="hidden" name="scanId" value={scanId} />
                        <input
                          type="hidden"
                          name="portalId"
                          value={selectedPortal.id}
                        />
                        <input type="hidden" name="taskId" value={task.id} />
                        <input
                          name="commentBody"
                          placeholder="Safe developer comment"
                          className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        />
                        <button className="rounded-full bg-white px-5 py-3 text-sm font-black ring-1 ring-slate-300 hover:bg-slate-100">
                          Comment
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No developer tasks yet. Sync or add a task.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Portals / Comments / Retests</h2>
          <div className="mt-6 grid gap-4">
            {portals.map((portal) => (
              <a
                key={portal.id}
                href={`/report/${scanId}/developer-portal?portal=${portal.id}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
              >
                <p className="font-black">{portal.portal_title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  progress {portal.fix_progress_score}/100 · tasks{" "}
                  {portal.total_task_count}
                </p>
              </a>
            ))}
            {comments.slice(0, 5).map((comment) => (
              <div key={comment.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-500">
                  {comment.comment_type} ·{" "}
                  {comment.safe_comment ? "safe" : "sanitized"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {comment.comment_body}
                </p>
              </div>
            ))}
            {retests.slice(0, 5).map((retest) => (
              <div
                key={retest.id}
                className="rounded-2xl bg-blue-50 p-4 text-blue-950"
              >
                <p className="font-black">Retest: {retest.request_status}</p>
                <p className="mt-1 text-sm leading-6">
                  {retest.safe_retest_scope}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Events</h2>
          <div className="mt-6 grid gap-3">
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
              <p className="text-slate-600">No events yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
