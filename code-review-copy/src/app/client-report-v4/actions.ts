"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildClientReportV4 } from "@/lib/client-report-v4-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to continue");
  return { supabase, user };
}

async function countTable(
  supabase: any,
  table: string,
  scanId: string,
  userId: string,
) {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("scan_id", scanId)
    .eq("user_id", userId);

  return count || 0;
}

async function latestSingle(
  supabase: any,
  table: string,
  scanId: string,
  userId: string,
  select: string,
) {
  const { data } = await supabase
    .from(table)
    .select(select)
    .eq("scan_id", scanId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function generateClientReportV4Action(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, website_id, organization_id, score, status")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const sourceCounts = {
    crawlerRuns: await countTable(
      supabase,
      "advanced_crawler_runs",
      scan.id,
      user.id,
    ),
    apiRuns: await countTable(
      supabase,
      "api_security_review_runs_v2",
      scan.id,
      user.id,
    ),
    authRuns: await countTable(
      supabase,
      "authenticated_safe_review_runs",
      scan.id,
      user.id,
    ),
    evidenceItems: await countTable(
      supabase,
      "security_evidence_items",
      scan.id,
      user.id,
    ),
    proofChains: await countTable(
      supabase,
      "security_proof_chains",
      scan.id,
      user.id,
    ),
    accuracyAssessments: await countTable(
      supabase,
      "finding_accuracy_assessments",
      scan.id,
      user.id,
    ),
    vulnerabilityFindings: await countTable(
      supabase,
      "vulnerability_bug_findings",
      scan.id,
      user.id,
    ),
    advancedClusters: await countTable(
      supabase,
      "advanced_vulnerability_clusters",
      scan.id,
      user.id,
    ),
    workspaceBugs: await countTable(
      supabase,
      "security_review_bug_items",
      scan.id,
      user.id,
    ),
  };

  const latestApi = await latestSingle(
    supabase,
    "api_security_review_runs_v2",
    scan.id,
    user.id,
    "api_risk_score",
  );
  const latestAuth = await latestSingle(
    supabase,
    "authenticated_safe_review_runs",
    scan.id,
    user.id,
    "auth_risk_score",
  );
  const latestCrawler = await latestSingle(
    supabase,
    "advanced_crawler_runs",
    scan.id,
    user.id,
    "asset_risk_score",
  );

  const { data: accuracyRows } = await supabase
    .from("finding_accuracy_assessments")
    .select("confidence_category, validation_status")
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .limit(500);

  const confirmedCount = (accuracyRows || []).filter(
    (item: any) =>
      item.confidence_category === "Confirmed" ||
      item.validation_status === "validated",
  ).length;
  const highConfidenceCount = (accuracyRows || []).filter(
    (item: any) => item.confidence_category === "High Confidence",
  ).length;
  const mediumConfidenceCount = (accuracyRows || []).filter(
    (item: any) => item.confidence_category === "Medium Confidence",
  ).length;
  const needsManualReviewCount = (accuracyRows || []).filter((item: any) =>
    String(item.confidence_category || item.validation_status || "")
      .toLowerCase()
      .includes("manual"),
  ).length;

  const { data: workspaceItems } = await supabase
    .from("security_review_bug_items")
    .select("status, priority")
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .limit(500);

  const openActionCount = (workspaceItems || []).filter(
    (item: any) =>
      !["verified-fixed", "false-positive", "accepted-risk", "closed"].includes(
        item.status,
      ),
  ).length;
  const quickWinCount = (workspaceItems || []).filter(
    (item: any) => item.priority === "Low" || item.priority === "Medium",
  ).length;
  const developerTaskCount =
    workspaceItems?.length || sourceCounts.vulnerabilityFindings || 0;
  const evidenceStrengthScore = Math.min(
    100,
    sourceCounts.evidenceItems * 5 +
      sourceCounts.proofChains * 20 +
      sourceCounts.accuracyAssessments * 4,
  );

  const draft = buildClientReportV4({
    targetUrl: scan.website_url,
    baseScore: scan.score,
    latestScanStatus: scan.status,
    sourceCounts,
    apiRiskScore: latestApi?.api_risk_score || 0,
    authRiskScore: latestAuth?.auth_risk_score || 0,
    crawlerRiskScore: latestCrawler?.asset_risk_score || 0,
    evidenceStrengthScore,
    confirmedCount,
    highConfidenceCount,
    mediumConfidenceCount,
    needsManualReviewCount,
    openActionCount,
    quickWinCount,
    developerTaskCount,
  });

  const { data: snapshot, error } = await supabase
    .from("client_report_v4_snapshots")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      report_title: "Client Security Report v4",
      target_url: scan.website_url,
      report_status:
        draft.reportReadinessScore >= 70 ? "ready" : "needs-review",
      executive_score: draft.executiveScore,
      report_readiness_score: draft.reportReadinessScore,
      business_risk_score: draft.businessRiskScore,
      technical_risk_score: draft.technicalRiskScore,
      evidence_strength_score: draft.evidenceStrengthScore,
      confirmed_count: draft.confirmedCount,
      high_confidence_count: draft.highConfidenceCount,
      medium_confidence_count: draft.mediumConfidenceCount,
      needs_manual_review_count: draft.needsManualReviewCount,
      open_action_count: draft.openActionCount,
      quick_win_count: draft.quickWinCount,
      developer_task_count: draft.developerTaskCount,
      public_surface_summary: draft.publicSurfaceSummary,
      authenticated_surface_summary: draft.authenticatedSurfaceSummary,
      api_surface_summary: draft.apiSurfaceSummary,
      executive_summary: draft.executiveSummary,
      business_impact_summary: draft.businessImpactSummary,
      developer_summary: draft.developerSummary,
      client_safe_summary: draft.clientSafeSummary,
      limitations_summary: draft.limitationsSummary,
      blocked_claims: draft.blockedClaims,
      source_counts: draft.sourceCounts,
      report_payload: draft.reportPayload,
    })
    .select("id")
    .single();

  if (error || !snapshot?.id) {
    redirect(
      `/report/${scan.id}/client-report-v4?message=${encodeURIComponent(error?.message || "Could not create report v4 snapshot")}`,
    );
  }

  await supabase.from("client_report_v4_sections").insert(
    draft.sections.map((section) => ({
      snapshot_id: snapshot.id,
      user_id: user.id,
      scan_id: scan.id,
      section_key: section.sectionKey,
      section_title: section.sectionTitle,
      section_type: section.sectionType,
      display_order: section.displayOrder,
      visibility: section.visibility,
      confidence_level: section.confidenceLevel,
      risk_level: section.riskLevel,
      section_body: section.sectionBody,
      evidence_summary: section.evidenceSummary,
      action_summary: section.actionSummary,
      blocked_claim: section.blockedClaim,
      section_payload: section.sectionPayload,
    })),
  );

  await supabase.from("executive_security_metrics_v4").insert(
    draft.metrics.map((metric) => ({
      snapshot_id: snapshot.id,
      user_id: user.id,
      scan_id: scan.id,
      metric_key: metric.metricKey,
      metric_label: metric.metricLabel,
      metric_value: metric.metricValue,
      metric_score: metric.metricScore,
      metric_status: metric.metricStatus,
      metric_category: metric.metricCategory,
      explanation: metric.explanation,
      evidence_reference: metric.evidenceReference,
    })),
  );

  await supabase.from("client_report_v4_events").insert({
    snapshot_id: snapshot.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    event_type: "report-generated",
    severity:
      draft.businessRiskScore >= 65
        ? "High"
        : draft.reportReadinessScore < 70
          ? "Medium"
          : "Info",
    title: "Client Report v4 generated",
    details: draft.executiveSummary,
    metadata: {
      executiveScore: draft.executiveScore,
      reportReadinessScore: draft.reportReadinessScore,
      businessRiskScore: draft.businessRiskScore,
    },
  });

  revalidatePath(`/report/${scan.id}/client-report-v4`);
  redirect(
    `/report/${scan.id}/client-report-v4?snapshot=${snapshot.id}&message=${encodeURIComponent("Client Report v4 generated.")}`,
  );
}
