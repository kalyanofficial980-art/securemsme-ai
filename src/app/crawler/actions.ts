"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAssetDiscoverySnapshot,
  runAdvancedCrawler,
  type CrawlerMode,
} from "@/lib/advanced-crawler-asset-discovery-v2";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function mode(value: FormDataEntryValue | null): CrawlerMode {
  if (value === "safe-light" || value === "safe-deep") return value;
  return "safe-standard";
}

function intValue(
  value: FormDataEntryValue | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to continue");
  return { supabase, user };
}

export async function runAdvancedCrawlerAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const crawlerMode = mode(formData.get("crawlerMode"));
  const permissionAccepted = formData.get("permissionAccepted") === "yes";
  const maxPages = intValue(
    formData.get("maxPages"),
    crawlerMode === "safe-deep" ? 50 : crawlerMode === "safe-light" ? 10 : 25,
    1,
    75,
  );
  const maxDepth = intValue(
    formData.get("maxDepth"),
    crawlerMode === "safe-deep" ? 3 : crawlerMode === "safe-light" ? 1 : 2,
    0,
    3,
  );

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/advanced-crawler?message=${encodeURIComponent("Authorization checkbox is required.")}`,
    );
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, website_id, organization_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  let verifiedScope = false;

  if (scan.website_id) {
    const { data: website } = await supabase
      .from("websites")
      .select("verification_status, deep_scan_enabled, permission_attested_at")
      .eq("id", scan.website_id)
      .eq("user_id", user.id)
      .maybeSingle();

    verifiedScope = Boolean(
      website?.verification_status === "verified" ||
      website?.deep_scan_enabled ||
      website?.permission_attested_at,
    );
  }

  const { data: orchestratorJob } = await supabase
    .from("scan_orchestrator_jobs")
    .select("id")
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: proofChain } = await supabase
    .from("security_proof_chains")
    .select("id")
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const report = await runAdvancedCrawler({
    targetUrl: scan.website_url,
    mode: crawlerMode,
    maxPages,
    maxDepth,
    permissionAccepted,
    verifiedScope,
  });

  const { data: run, error } = await supabase
    .from("advanced_crawler_runs")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      orchestrator_job_id: orchestratorJob?.id || null,
      proof_chain_id: proofChain?.id || null,
      target_url: scan.website_url,
      normalized_origin: report.normalizedOrigin,
      run_status: report.runStatus,
      crawler_mode: crawlerMode,
      authorization_status: verifiedScope ? "verified-scope" : "user-attested",
      max_pages: report.maxPages,
      max_depth: report.maxDepth,
      discovered_url_count: report.discoveredUrlCount,
      crawled_page_count: report.crawledPageCount,
      skipped_url_count: report.skippedUrlCount,
      blocked_url_count: report.blockedUrlCount,
      form_count: report.formCount,
      login_surface_count: report.loginSurfaceCount,
      admin_surface_count: report.adminSurfaceCount,
      api_surface_count: report.apiSurfaceCount,
      checkout_surface_count: report.checkoutSurfaceCount,
      customer_data_surface_count: report.customerDataSurfaceCount,
      coverage_score: report.coverageScore,
      asset_risk_score: report.assetRiskScore,
      safe_summary: report.safeSummary,
      developer_summary: report.developerSummary,
      client_safe_summary: report.clientSafeSummary,
      blocked_actions: report.blockedActions,
      crawler_report: report,
    })
    .select("id")
    .single();

  if (error || !run?.id) {
    redirect(
      `/report/${scan.id}/advanced-crawler?message=${encodeURIComponent(error?.message || "Could not save crawler run")}`,
    );
  }

  if (report.assets.length) {
    const { data: insertedAssets } = await supabase
      .from("discovered_assets_v2")
      .insert(
        report.assets.map((asset) => ({
          crawler_run_id: run.id,
          user_id: user.id,
          organization_id: scan.organization_id,
          website_id: scan.website_id,
          scan_id: scan.id,
          asset_url: asset.assetUrl,
          normalized_url: asset.normalizedUrl,
          origin: asset.origin,
          path: asset.path,
          depth: asset.depth,
          parent_url: asset.parentUrl,
          asset_type: asset.assetType,
          http_status: asset.httpStatus,
          content_type: asset.contentType,
          title: asset.title,
          meta_description: asset.metaDescription,
          discovery_source: asset.discoverySource,
          has_form: asset.hasForm,
          has_password_field: asset.hasPasswordField,
          has_customer_data_field: asset.hasCustomerDataField,
          has_payment_signal: asset.hasPaymentSignal,
          has_admin_signal: asset.hasAdminSignal,
          has_api_signal: asset.hasApiSignal,
          is_same_origin: asset.isSameOrigin,
          is_crawled: asset.isCrawled,
          is_blocked: asset.isBlocked,
          risk_tags: asset.riskTags,
          asset_fingerprint: asset.assetFingerprint,
          evidence_summary: asset.evidenceSummary,
          developer_note: asset.developerNote,
          client_safe_note: asset.clientSafeNote,
          raw_observation: asset.rawObservation,
        })),
      )
      .select("id, asset_url");

    const assetIdByUrl = new Map(
      (insertedAssets || []).map((asset: any) => [asset.asset_url, asset.id]),
    );

    if (report.forms.length) {
      await supabase.from("crawler_form_inventory_v2").insert(
        report.forms.map((form) => ({
          crawler_run_id: run.id,
          asset_id: assetIdByUrl.get(form.pageUrl) || null,
          user_id: user.id,
          scan_id: scan.id,
          page_url: form.pageUrl,
          form_index: form.formIndex,
          method: form.method,
          action_url: form.actionUrl,
          field_count: form.fieldCount,
          password_field_count: form.passwordFieldCount,
          email_field_count: form.emailFieldCount,
          phone_field_count: form.phoneFieldCount,
          file_field_count: form.fileFieldCount,
          payment_field_signal: form.paymentFieldSignal,
          customer_data_signal: form.customerDataSignal,
          csrf_signal: form.csrfSignal,
          form_risk_level: form.formRiskLevel,
          evidence_summary: form.evidenceSummary,
          developer_note: form.developerNote,
          safe_claim: form.safeClaim,
          blocked_claim: form.blockedClaim,
          raw_form: form.rawForm,
        })),
      );
    }
  }

  if (report.edges.length) {
    await supabase.from("crawler_link_edges_v2").insert(
      report.edges.map((edge) => ({
        crawler_run_id: run.id,
        user_id: user.id,
        scan_id: scan.id,
        from_url: edge.fromUrl,
        to_url: edge.toUrl,
        link_text: edge.linkText,
        relationship: edge.relationship,
        is_same_origin: edge.isSameOrigin,
      })),
    );
  }

  const snapshot = createAssetDiscoverySnapshot({
    assets: report.assets,
    forms: report.forms,
    targetUrl: scan.website_url,
  });

  await supabase.from("asset_discovery_snapshots_v2").insert({
    crawler_run_id: run.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    snapshot_name: "Asset Discovery Snapshot",
    snapshot_hash: snapshot.snapshotHash,
    asset_count: report.assets.length,
    form_count: report.forms.length,
    login_surface_count: report.loginSurfaceCount,
    admin_surface_count: report.adminSurfaceCount,
    api_surface_count: report.apiSurfaceCount,
    checkout_surface_count: report.checkoutSurfaceCount,
    summary: snapshot.summary,
    snapshot_payload: snapshot.payload,
  });

  await supabase.from("advanced_crawler_events").insert({
    crawler_run_id: run.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    event_type: "crawler-completed",
    severity:
      report.assetRiskScore >= 60
        ? "High"
        : report.assetRiskScore >= 30
          ? "Medium"
          : "Info",
    title: "Advanced crawler completed",
    details: report.safeSummary,
    metadata: {
      coverageScore: report.coverageScore,
      assetRiskScore: report.assetRiskScore,
      assetCount: report.assets.length,
      formCount: report.forms.length,
    },
  });

  revalidatePath(`/report/${scan.id}/advanced-crawler`);
  redirect(
    `/report/${scan.id}/advanced-crawler?run=${run.id}&message=${encodeURIComponent(`${report.assets.length} asset(s) discovered.`)}`,
  );
}
