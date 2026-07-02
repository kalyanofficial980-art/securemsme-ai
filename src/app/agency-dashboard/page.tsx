import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { buildAgencyDashboardSummary } from "@/lib/organization-engine";
import { createClient } from "@/lib/supabase/server";
function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-black text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-black">{value}</p>
    </div>
  );
}
export default async function AgencyDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to view agency dashboard");
  const { data: memberships } = await supabase
    .from("organization_members")
    .select(
      "role, organization_id, organizations(id, name, slug, organization_type, status)",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  const organizations = ((memberships || []) as any[])
    .map((m) => m.organizations)
    .filter(Boolean)
    .flat();
  const ids = organizations.map((o: any) => o.id);
  const counts = ids.length
    ? await Promise.all([
        supabase
          .from("websites")
          .select("id", { count: "exact", head: true })
          .in("organization_id", ids),
        supabase
          .from("scans")
          .select("id", { count: "exact", head: true })
          .in("organization_id", ids),
        supabase
          .from("monitoring_jobs")
          .select("id", { count: "exact", head: true })
          .in("organization_id", ids),
        supabase
          .from("security_alert_notifications")
          .select("id", { count: "exact", head: true })
          .in("organization_id", ids),
        supabase
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .in("organization_id", ids),
        supabase
          .from("organization_invites")
          .select("id", { count: "exact", head: true })
          .in("organization_id", ids)
          .eq("status", "pending"),
      ])
    : [
        { count: 0 },
        { count: 0 },
        { count: 0 },
        { count: 0 },
        { count: 0 },
        { count: 0 },
      ];
  const summary = buildAgencyDashboardSummary({
    websites: counts[0].count || 0,
    scans: counts[1].count || 0,
    monitoringJobs: counts[2].count || 0,
    alerts: counts[3].count || 0,
    members: counts[4].count || 0,
    invites: counts[5].count || 0,
  });
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-slate-500">
              Agency dashboard
            </p>
            <h1 className="mt-2 text-4xl font-black">
              Client workspace operations
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Multi-organization summary for websites, scans, monitoring,
              alerts, members and pending invites.
            </p>
          </div>
          <Link
            href="/organizations"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Manage organizations
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Card title="Readiness" value={summary.readinessScore} />
          <Card title="Organizations" value={organizations.length} />
          <Card title="Members" value={counts[4].count || 0} />
          <Card title="Websites" value={counts[0].count || 0} />
          <Card title="Scans" value={counts[1].count || 0} />
          <Card title="Monitoring" value={counts[2].count || 0} />
          <Card title="Alerts" value={counts[3].count || 0} />
          <Card title="Invites" value={counts[5].count || 0} />
          <Card title="Stage" value={summary.stage} />
        </div>
        <div className="mt-10 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-2xl font-black text-blue-950">
            {summary.headline}
          </h2>
          {summary.nextActions.map((a) => (
            <div
              key={a}
              className="mt-4 rounded-2xl bg-white/80 p-4 text-sm font-bold text-blue-900"
            >
              {a}
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Organizations</h2>
          <div className="mt-6 grid gap-4">
            {organizations.length ? (
              organizations.map((o: any) => (
                <Link
                  key={o.id}
                  href={`/organizations?organization=${o.id}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="font-black">{o.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {o.organization_type} · {o.status}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                No organizations yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
