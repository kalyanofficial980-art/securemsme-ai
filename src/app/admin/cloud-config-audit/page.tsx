import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["pass", "Info", "Low", "active", "done", "present"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["warning", "Medium", "manual-review", "open", "weak"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["fail", "High", "Critical", "missing"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminCloudConfigAuditPage() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login as admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    redirect("/dashboard?message=Admin access required");

  const { data: projects } = await supabase
    .from("cloud_config_projects_v2")
    .select(
      "id, project_name, production_domain, latest_risk_score, latest_risk_level, latest_summary, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: runs } = await supabase
    .from("cloud_config_audit_runs_v2")
    .select(
      "id, risk_score, risk_level, passed_count, warning_count, failed_count, manual_review_count, summary, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: tasks } = await supabase
    .from("cloud_config_remediation_tasks_v2")
    .select(
      "id, task_title, task_status, priority, owner_role, safe_steps, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: events } = await supabase
    .from("cloud_config_admin_events_v2")
    .select("id, event_type, severity, title, details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Cloud Config Audit Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor Supabase, Vercel, DNS and production cloud readiness audits.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Projects</h2>
          <div className="mt-6 grid gap-4">
            {projects?.length ? (
              projects.map((project: any) => (
                <div
                  key={project.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{project.project_name}</p>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        {project.production_domain}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {project.latest_summary || "No audit yet"}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(project.latest_risk_level)}`}
                    >
                      {project.latest_risk_level} · {project.latest_risk_score}
                      /100
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No cloud config projects yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Recent audits</h2>
            <div className="mt-6 grid gap-3">
              {runs?.length ? (
                runs.map((run: any) => (
                  <div key={run.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(run.risk_level)}`}
                    >
                      {run.risk_level}
                    </span>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {run.summary}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No audits yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Tasks</h2>
            <div className="mt-6 grid gap-3">
              {tasks?.length ? (
                tasks.map((task: any) => (
                  <div key={task.id} className="rounded-2xl bg-slate-50 p-4">
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
                    <p className="mt-3 font-black">{task.task_title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {task.safe_steps}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No tasks yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Events</h2>
          <div className="mt-6 grid gap-3">
            {events?.length ? (
              events.map((event: any) => (
                <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(event.severity)}`}
                  >
                    {event.severity}
                  </span>
                  <p className="mt-3 font-black">{event.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {event.details}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No events yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
