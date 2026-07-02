import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { RetestClientPortalProPanel } from "@/components/RetestClientPortalProPanel";
import { createClient } from "@/lib/supabase/server";

export default async function ReportRetestClientPortalProPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run?: string; message?: string }>;
}) {
  const { id } = await params;
  const { run: selectedRunId, message } = await searchParams;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect("/login?message=Please login to view Retest + Client Portal Pro");
  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!scan) redirect("/dashboard?message=Scan not found");
  const { data: runs } = await supabase
    .from("retest_runs_v2")
    .select(
      "id, run_status, total_items, passed_items, failed_items, needs_review_items, blocked_items, pending_items, progress_score, pass_rate, proof_strength_score, client_readiness_score, executive_summary, client_safe_summary, created_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const selectedRun = selectedRunId
    ? runs?.find((item: any) => item.id === selectedRunId) || runs?.[0]
    : runs?.[0];
  const { data: items } = selectedRun?.id
    ? await supabase
        .from("retest_items_v2")
        .select(
          "id, title, status, priority, confidence, affected_area, before_evidence, fix_summary, safe_retest_steps, after_evidence, verification_note, client_result, blocked_claim, proof_fingerprint",
        )
        .eq("run_id", selectedRun.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] };
  const { data: links } = await supabase
    .from("client_portal_pro_links_v2")
    .select(
      "id, share_token, status, executive_score, report_readiness_score, fix_progress_score, retest_pass_rate, client_readiness_score",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const { data: events } = selectedRun?.id
    ? await supabase
        .from("retest_client_portal_events_v2")
        .select("id, title, details, created_at")
        .eq("run_id", selectedRun.id)
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
            href="/retest-client-portal-pro"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Retest + Portal info
          </Link>
        </div>
        <RetestClientPortalProPanel
          scanId={scan.id}
          targetUrl={scan.website_url}
          runs={runs || []}
          selectedRun={selectedRun}
          items={items || []}
          links={links || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
