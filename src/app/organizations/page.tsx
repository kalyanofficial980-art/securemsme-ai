import Link from "next/link";
import { redirect } from "next/navigation";
import { OrganizationWorkspacePanel } from "@/components/OrganizationWorkspacePanel";
import { Navbar } from "@/components/Navbar";
import type { OrganizationRole } from "@/lib/organization-engine";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ organization?: string; message?: string }>;
}) {
  const { organization, message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to view organizations");
  const { data: memberships } = await supabase
    .from("organization_members")
    .select(
      "role, organization_id, organizations(id, name, slug, organization_type, status, plan_label, website_limit, member_limit, created_at)",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  const organizations = ((memberships || []) as any[])
    .map((m) => m.organizations)
    .filter(Boolean)
    .flat();
  const selectedOrganization =
    organizations.find((o: any) => o.id === organization) ||
    organizations[0] ||
    null;
  const selectedMembership = ((memberships || []) as any[]).find(
    (m) => m.organization_id === selectedOrganization?.id,
  );
  const selectedRole = (selectedMembership?.role ||
    "viewer") as OrganizationRole;
  const { data: members } = selectedOrganization
    ? await supabase
        .from("organization_members")
        .select("id,user_id,role,status,created_at")
        .eq("organization_id", selectedOrganization.id)
        .order("created_at", { ascending: true })
    : { data: [] };
  const { data: invites } = selectedOrganization
    ? await supabase
        .from("organization_invites")
        .select("id,email,role,status,invite_token,expires_at,created_at")
        .eq("organization_id", selectedOrganization.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };
  const { data: activities } = selectedOrganization
    ? await supabase
        .from("organization_activity_events")
        .select("id,event_type,severity,title,details,created_at")
        .eq("organization_id", selectedOrganization.id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };
  const counts = selectedOrganization
    ? await Promise.all([
        supabase
          .from("websites")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", selectedOrganization.id),
        supabase
          .from("scans")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", selectedOrganization.id),
        supabase
          .from("monitoring_jobs")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", selectedOrganization.id),
        supabase
          .from("security_alert_notifications")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", selectedOrganization.id),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }];
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold text-slate-500">Team SaaS</p>
            <h1 className="mt-2 text-4xl font-black">Organizations</h1>
            <p className="mt-3 text-slate-600">
              Team members, roles, invites and organization-scoped assets.
            </p>
          </div>
          <Link
            href="/agency-dashboard"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Agency dashboard
          </Link>
        </div>
        <OrganizationWorkspacePanel
          organizations={organizations}
          selectedOrganization={selectedOrganization}
          selectedRole={selectedRole}
          members={members || []}
          invites={invites || []}
          activities={activities || []}
          metrics={{
            websites: counts[0].count || 0,
            scans: counts[1].count || 0,
            monitoringJobs: counts[2].count || 0,
            alerts: counts[3].count || 0,
          }}
          message={message}
        />
      </section>
    </main>
  );
}
