import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
export default async function AdminOrganizationsPage() {
  const supabase = await createClient();
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
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id,name,slug,organization_type,status,plan_label,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: events } = await supabase
    .from("organization_activity_events")
    .select("id,event_type,severity,title,details,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Organizations observability
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor agency workspaces and activity events.
        </p>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Organizations</h2>
          <div className="mt-6 grid gap-4">
            {organizations?.length ? (
              organizations.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="font-black">{o.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {o.slug} · {o.organization_type} · {o.plan_label} ·{" "}
                    {o.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No organizations yet.</p>
            )}
          </div>
        </div>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Activity</h2>
          <div className="mt-6 grid gap-4">
            {events?.length ? (
              events.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-xs font-black uppercase text-slate-500">
                    {e.event_type}
                  </p>
                  <h3 className="mt-1 font-black">{e.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{e.details}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No organization activity yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
