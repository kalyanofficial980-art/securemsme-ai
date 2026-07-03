import Link from "next/link";
import { redirect } from "next/navigation";
import { DeveloperPortalPanel } from "@/components/DeveloperPortalPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ReportDeveloperPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ portal?: string; message?: string }>;
}) {
  const { id } = await params;
  const { portal: selectedPortalId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to view Developer Portal");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: portals } = await supabase
    .from("developer_fix_portals_v2")
    .select(
      "id, portal_title, target_url, portal_status, access_level, share_token, total_task_count, open_task_count, in_progress_task_count, fixed_task_count, retest_requested_count, verified_fixed_count, blocked_task_count, fix_progress_score, developer_readiness_score, retest_readiness_score, developer_summary, client_safe_summary, retest_summary, created_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const selectedPortal = selectedPortalId
    ? portals?.find((item: any) => item.id === selectedPortalId) || portals?.[0]
    : portals?.[0];

  const { data: tasks } = selectedPortal?.id
    ? await supabase
        .from("developer_fix_tasks_v2")
        .select(
          "id, source_type, task_title, task_status, priority, confidence_level, affected_area, developer_fix, safe_retest_steps, evidence_summary, client_safe_note, blocked_claim, owner_name, owner_email, estimated_effort",
        )
        .eq("portal_id", selectedPortal.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] };

  const { data: comments } = selectedPortal?.id
    ? await supabase
        .from("developer_fix_comments_v2")
        .select(
          "id, task_id, comment_type, visibility, comment_body, safe_comment, blocked_reason, created_at",
        )
        .eq("portal_id", selectedPortal.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const { data: retests } = selectedPortal?.id
    ? await supabase
        .from("developer_retest_requests_v2")
        .select(
          "id, task_id, request_status, request_reason, safe_retest_scope, created_at",
        )
        .eq("portal_id", selectedPortal.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const { data: events } = selectedPortal?.id
    ? await supabase
        .from("developer_portal_events_v2")
        .select("id, title, details, created_at")
        .eq("portal_id", selectedPortal.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}`}
              className="text-sm font-bold text-slate-600"
            >
              Back to report
            </Link>
            <p className="mt-4 break-all text-sm font-bold text-slate-500">
              {scan.website_url}
            </p>
          </div>
          <Link
            href="/developer-portal"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Developer portal info
          </Link>
        </div>

        <DeveloperPortalPanel
          scanId={scan.id}
          targetUrl={scan.website_url}
          portals={portals || []}
          selectedPortal={selectedPortal}
          tasks={tasks || []}
          comments={comments || []}
          retests={retests || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
