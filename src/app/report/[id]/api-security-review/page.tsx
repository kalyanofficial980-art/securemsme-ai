import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiSecurityReviewPanel } from "@/components/ApiSecurityReviewPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ReportApiSecurityReviewPage({
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
    redirect("/login?message=Please login to view API security review");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: runs } = await supabase
    .from("api_security_review_runs_v2")
    .select(
      "id, target_url, run_status, review_mode, authorization_status, discovered_spec_count, endpoint_count, public_docs_count, graphql_signal_count, sensitive_endpoint_count, mutation_endpoint_count, auth_required_count, auth_unclear_count, checklist_needs_fix_count, api_coverage_score, api_risk_score, safe_summary, developer_summary, client_safe_summary, created_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const selectedRun = selectedRunId
    ? runs?.find((item: any) => item.id === selectedRunId) || runs?.[0]
    : runs?.[0];

  const { data: specs } = selectedRun?.id
    ? await supabase
        .from("api_discovered_specs_v2")
        .select(
          "id, spec_url, spec_type, http_status, title, version, endpoint_count, auth_scheme_count, sensitive_path_count, risk_level, evidence_summary, developer_note, client_safe_note, blocked_claim, spec_fingerprint",
        )
        .eq("review_run_id", selectedRun.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const { data: endpoints } = selectedRun?.id
    ? await supabase
        .from("api_endpoint_inventory_v2")
        .select(
          "id, endpoint_path, full_url, method, summary, endpoint_type, auth_requirement, mutation_risk, customer_data_signal, admin_signal, payment_signal, file_signal, sensitive_signal, risk_level, review_status, endpoint_fingerprint, evidence_summary, developer_note, client_safe_note, blocked_claim",
        )
        .eq("review_run_id", selectedRun.id)
        .eq("user_id", user.id)
        .limit(250)
    : { data: [] };

  const { data: observations } = selectedRun?.id
    ? await supabase
        .from("api_security_observations_v2")
        .select(
          "id, category, severity, confidence, title, evidence_summary, developer_note, client_safe_note, blocked_claim, safe_retest_steps",
        )
        .eq("review_run_id", selectedRun.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const { data: checklist } = selectedRun?.id
    ? await supabase
        .from("api_review_checklist_items_v2")
        .select(
          "id, checklist_key, title, category, status, severity, evidence_summary, developer_note, client_safe_note, blocked_claim",
        )
        .eq("review_run_id", selectedRun.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };

  const { data: events } = selectedRun?.id
    ? await supabase
        .from("api_security_review_events_v2")
        .select("id, title, details, created_at")
        .eq("review_run_id", selectedRun.id)
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
            href="/api-security-review"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            API review info
          </Link>
        </div>

        <ApiSecurityReviewPanel
          scanId={scan.id}
          targetUrl={scan.website_url}
          runs={runs || []}
          selectedRun={selectedRun}
          specs={specs || []}
          endpoints={endpoints || []}
          observations={observations || []}
          checklist={checklist || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
