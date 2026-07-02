import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientPortalPanel } from "@/components/ClientPortalPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ReportClientPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to manage client portal");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select(
      "id, user_id, website_id, organization_id, website_url, score, risk_level",
    )
    .eq("id", id);

  if (profile?.role !== "admin") scanQuery = scanQuery.eq("user_id", user.id);

  const { data: scan } = await scanQuery.single();
  if (!scan) redirect("/dashboard?message=Client portal report not found");

  const { data: links } = await supabase
    .from("client_portal_links")
    .select(
      "id, token, title, client_name, client_email, access_level, status, expires_at, view_count, last_viewed_at, created_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", scan.user_id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: events } = await supabase
    .from("client_portal_access_events")
    .select("id, event_type, severity, title, details, created_at")
    .eq("scan_id", scan.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/truth-cleanup`}
              className="text-sm font-bold text-slate-600"
            >
              Back to truth cleanup
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Client Portal
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Create safe shareable report access for clients.
            </p>
          </div>

          <Link
            href="/client-portal"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Portal info
          </Link>
        </div>

        <ClientPortalPanel
          scanId={scan.id}
          websiteUrl={scan.website_url}
          score={scan.score || 0}
          riskLevel={scan.risk_level || "Unknown risk"}
          links={links || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
