import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSecurityReviewWorkspacesPage() {
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

  const { data: workspaces } = await supabase
    .from("security_review_workspaces")
    .select(
      "id, title, client_name, target_url, status, priority, review_stage, overall_risk, progress_percent, total_items, open_items, verified_fixed_items, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  const { data: items } = await supabase
    .from("security_review_bug_items")
    .select(
      "id, title, severity, lifecycle_status, owner_type, affected_url, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Security Review Workspace Admin
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Internal overview of all client security review workspaces and bug
          lifecycle items.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent workspaces</h2>
          <div className="mt-6 grid gap-4">
            {workspaces?.length ? (
              workspaces.map((workspace: any) => (
                <div
                  key={workspace.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-xs font-black uppercase text-slate-500">
                    {workspace.status} · {workspace.priority} ·{" "}
                    {workspace.review_stage}
                  </p>
                  <h3 className="mt-1 font-black">{workspace.title}</h3>
                  <p className="mt-2 break-all text-sm text-slate-600">
                    {workspace.target_url}
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    {workspace.progress_percent}% · {workspace.overall_risk} ·{" "}
                    {workspace.total_items} items
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No workspaces yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent bug lifecycle items</h2>
          <div className="mt-6 grid gap-4">
            {items?.length ? (
              items.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-xs font-black uppercase text-slate-500">
                    {item.severity} · {item.lifecycle_status} · owner{" "}
                    {item.owner_type}
                  </p>
                  <h3 className="mt-1 font-black">{item.title}</h3>
                  <p className="mt-2 break-all text-sm text-slate-600">
                    {item.affected_url}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No bug items yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
