import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthenticatedSafeReviewPanel } from "@/components/AuthenticatedSafeReviewPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ReportAuthenticatedSafeReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ context?: string; run?: string; message?: string }>;
}) {
  const { id } = await params;
  const {
    context: selectedContextId,
    run: selectedRunId,
    message,
  } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to view authenticated safe review");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: contexts } = await supabase
    .from("authenticated_review_contexts")
    .select(
      "id, context_name, target_url, login_url, test_account_label, role_names, authorization_status, credential_storage_status, scope_summary, safe_boundaries, allowed_paths, excluded_paths, review_depth, created_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const selectedContext = selectedContextId
    ? contexts?.find((item: any) => item.id === selectedContextId) ||
      contexts?.[0]
    : contexts?.[0];

  const { data: runs } = selectedContext?.id
    ? await supabase
        .from("authenticated_safe_review_runs")
        .select(
          "id, target_url, run_status, review_mode, total_pages_reviewed, account_surface_count, role_comparison_count, cookie_review_count, sensitive_page_signal_count, developer_action_count, needs_expert_review_count, coverage_score, auth_risk_score, safe_summary, developer_summary, client_safe_summary, created_at",
        )
        .eq("context_id", selectedContext.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const selectedRun = selectedRunId
    ? runs?.find((item: any) => item.id === selectedRunId) || runs?.[0]
    : runs?.[0];

  const { data: observations } = selectedRun?.id
    ? await supabase
        .from("authenticated_page_observations")
        .select(
          "id, page_url, page_type, role_name, contains_sensitive_data_signal, contains_account_action_signal, contains_payment_signal, contains_file_upload_signal, evidence_summary, developer_note, client_safe_note, blocked_claim, observation_quality, validation_status",
        )
        .eq("review_run_id", selectedRun.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] };

  const { data: comparisons } = selectedRun?.id
    ? await supabase
        .from("authenticated_role_comparisons")
        .select(
          "id, comparison_name, page_url, role_a, role_b, expected_difference, observed_difference, access_control_signal, severity, evidence_summary, developer_note, client_safe_note, blocked_claim",
        )
        .eq("review_run_id", selectedRun.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const { data: checklist } = selectedRun?.id
    ? await supabase
        .from("authenticated_review_checklist_items")
        .select(
          "id, checklist_key, title, category, status, severity, evidence_summary, developer_note, client_safe_note, blocked_claim",
        )
        .eq("review_run_id", selectedRun.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };

  const { data: events } = selectedContext?.id
    ? await supabase
        .from("authenticated_review_events")
        .select("id, title, details, created_at")
        .eq("context_id", selectedContext.id)
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
            href="/authenticated-safe-review"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Auth review info
          </Link>
        </div>

        <AuthenticatedSafeReviewPanel
          scanId={scan.id}
          targetUrl={scan.website_url}
          contexts={contexts || []}
          selectedContext={selectedContext}
          runs={runs || []}
          selectedRun={selectedRun}
          observations={observations || []}
          comparisons={comparisons || []}
          checklist={checklist || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
