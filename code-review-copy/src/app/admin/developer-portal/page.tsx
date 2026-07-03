import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["active", "completed", "verified-fixed"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["paused", "in-progress", "retest-requested"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["blocked", "archived"].includes(value)) return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminDeveloperPortalPage() {
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

  const { data: portals } = await supabase
    .from("developer_fix_portals_v2")
    .select(
      "id, target_url, portal_status, total_task_count, open_task_count, fixed_task_count, retest_requested_count, verified_fixed_count, blocked_task_count, fix_progress_score, developer_readiness_score, retest_readiness_score, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: tasks } = await supabase
    .from("developer_fix_tasks_v2")
    .select(
      "id, task_title, task_status, priority, confidence_level, affected_area, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Developer Portal Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor developer collaboration, fix progress, blocked tasks and
          retest readiness.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent developer portals</h2>
          <div className="mt-6 grid gap-4">
            {portals?.length ? (
              portals.map((portal: any) => (
                <div
                  key={portal.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">
                        {portal.target_url}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        tasks {portal.total_task_count} · open{" "}
                        {portal.open_task_count} · fixed{" "}
                        {portal.fixed_task_count} · verified{" "}
                        {portal.verified_fixed_count}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        progress {portal.fix_progress_score}/100 · developer
                        readiness {portal.developer_readiness_score}/100 ·
                        retest {portal.retest_readiness_score}/100
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(portal.portal_status)}`}
                    >
                      {portal.portal_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No developer portals yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent developer tasks</h2>
          <div className="mt-6 grid gap-4">
            {tasks?.length ? (
              tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{task.task_title}</p>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        {task.affected_area}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {task.priority} · {task.confidence_level}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(task.task_status)}`}
                    >
                      {task.task_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No developer tasks yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
