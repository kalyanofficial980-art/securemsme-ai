import { createToolRunnerJob } from "@/app/report/[id]/tool-runner/actions";
import type { ToolRunStatus, ToolRunnerReport } from "@/lib/tool-runner";

type SavedJob = {
  id: string;
  status: string;
  tool_mode: string;
  total_tools: number;
  completed_tools: number;
  blocked_tools: number;
  result_summary?: Record<string, unknown> | null;
  created_at: string;
};

function statusClass(status: ToolRunStatus | string) {
  if (status === "completed")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "blocked") return "border-red-200 bg-red-50 text-red-900";
  if (status === "queued") return "border-blue-200 bg-blue-50 text-blue-900";
  if (status === "running")
    return "border-purple-200 bg-purple-50 text-purple-900";
  if (status === "failed") return "border-red-300 bg-red-100 text-red-950";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function ToolRunnerPanel({
  scanId,
  report,
  savedJobs,
  message,
}: {
  scanId: string;
  report: ToolRunnerReport;
  savedJobs: SavedJob[];
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
              Built-in security tool runner
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Backend tool architecture
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              {report.customerMessage}
            </p>
          </div>

          <form action={createToolRunnerJob}>
            <input type="hidden" name="scanId" value={scanId} />
            <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Create tool runner job
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-600">Total tools</p>
            <p className="mt-2 text-4xl font-black">{report.totalTools}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-bold text-emerald-700">Completed</p>
            <p className="mt-2 text-4xl font-black text-emerald-950">
              {report.completedTools}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-700">Blocked</p>
            <p className="mt-2 text-4xl font-black text-red-950">
              {report.blockedTools}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-bold text-blue-700">Queued</p>
            <p className="mt-2 text-4xl font-black text-blue-950">
              {report.queuedTools}
            </p>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <p className="text-sm font-bold text-purple-700">
              Normalized evidence
            </p>
            <p className="mt-2 text-4xl font-black text-purple-950">
              {report.normalizedEvidence.length}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-black">Current mode: {report.mode}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Verified scope: {report.verifiedScope ? "Yes" : "No"} · Website:{" "}
            <span className="break-all">{report.websiteUrl}</span>
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h3 className="text-2xl font-black text-red-950">
          Customer-safe boundaries
        </h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {report.safeBoundary.map((item) => (
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
        <h3 className="text-2xl font-black">Tool registry</h3>
        <div className="mt-6 grid gap-5">
          {report.tools.map((tool) => (
            <div
              key={tool.id}
              className="rounded-2xl border border-slate-200 p-6"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">
                    {tool.id} · {tool.category} · {tool.mode}
                  </p>
                  <h4 className="mt-1 text-xl font-black">{tool.name}</h4>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                      tool.runStatus,
                    )}`}
                  >
                    {tool.runStatus}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {tool.availability}
                  </span>
                </div>
              </div>

              <p className="mt-4 leading-7 text-slate-700">
                {tool.customerValue}
              </p>
              <p className="mt-3 text-sm font-bold text-slate-600">
                Output: {tool.output}
              </p>
              <p className="mt-3 text-sm font-bold text-slate-600">
                Reason: {tool.reason}
              </p>
              <p className="mt-3 text-sm font-bold text-slate-600">
                Evidence records: {tool.evidenceCount}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Saved tool jobs</h3>
        <div className="mt-6 grid gap-4">
          {savedJobs.length ? (
            savedJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="font-black">Job {job.id.slice(0, 8)}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {new Date(job.created_at).toLocaleString()} ·{" "}
                      {job.tool_mode}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                      job.status,
                    )}`}
                  >
                    {job.status}
                  </span>
                </div>

                <p className="mt-3 text-sm font-bold text-slate-600">
                  Tools: {job.completed_tools}/{job.total_tools} completed ·
                  Blocked: {job.blocked_tools}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No saved tool runner jobs yet. Create one to store normalized tool
              evidence in Supabase.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Next tool roadmap</h3>
        <div className="mt-5 grid gap-3">
          {report.nextToolRoadmap.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
