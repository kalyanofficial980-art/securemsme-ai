import Link from "next/link";
import { redirect } from "next/navigation";
import { AdvancedCrawlerPanel } from "@/components/AdvancedCrawlerPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ReportAdvancedCrawlerPage({
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

  if (!user) redirect("/login?message=Please login to run advanced crawler");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: runs } = await supabase
    .from("advanced_crawler_runs")
    .select(
      "id, target_url, run_status, crawler_mode, authorization_status, max_pages, max_depth, discovered_url_count, crawled_page_count, skipped_url_count, blocked_url_count, form_count, login_surface_count, admin_surface_count, api_surface_count, checkout_surface_count, customer_data_surface_count, coverage_score, asset_risk_score, safe_summary, developer_summary, client_safe_summary, created_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const selectedRun = selectedRunId
    ? runs?.find((item: any) => item.id === selectedRunId) || runs?.[0]
    : runs?.[0];

  const { data: assets } = selectedRun?.id
    ? await supabase
        .from("discovered_assets_v2")
        .select(
          "id, asset_url, asset_type, http_status, title, discovery_source, depth, has_form, has_password_field, has_customer_data_field, has_payment_signal, has_admin_signal, has_api_signal, risk_tags, asset_fingerprint, evidence_summary, developer_note, client_safe_note",
        )
        .eq("crawler_run_id", selectedRun.id)
        .eq("user_id", user.id)
        .order("depth", { ascending: true })
        .limit(200)
    : { data: [] };

  const { data: forms } = selectedRun?.id
    ? await supabase
        .from("crawler_form_inventory_v2")
        .select(
          "id, page_url, method, action_url, field_count, password_field_count, email_field_count, phone_field_count, payment_field_signal, customer_data_signal, csrf_signal, form_risk_level, evidence_summary, developer_note, safe_claim, blocked_claim",
        )
        .eq("crawler_run_id", selectedRun.id)
        .eq("user_id", user.id)
        .limit(100)
    : { data: [] };

  const { data: edges } = selectedRun?.id
    ? await supabase
        .from("crawler_link_edges_v2")
        .select("id, from_url, to_url, relationship, is_same_origin")
        .eq("crawler_run_id", selectedRun.id)
        .eq("user_id", user.id)
        .limit(100)
    : { data: [] };

  const { data: events } = selectedRun?.id
    ? await supabase
        .from("advanced_crawler_events")
        .select("id, title, details, created_at")
        .eq("crawler_run_id", selectedRun.id)
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
            href="/advanced-crawler"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Crawler info
          </Link>
        </div>

        <AdvancedCrawlerPanel
          scanId={scan.id}
          targetUrl={scan.website_url}
          runs={runs || []}
          selectedRun={selectedRun}
          assets={assets || []}
          forms={forms || []}
          edges={edges || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
