"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createManualApiEndpoint,
  runApiSecurityReview,
  type ApiReviewMode,
} from "@/lib/api-security-review-v2";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function mode(value: FormDataEntryValue | null): ApiReviewMode {
  if (value === "safe-light" || value === "safe-deep") return value;
  return "safe-standard";
}

function list(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function choice(value: string, choices: string[], fallback: string) {
  return choices.includes(value) ? value : fallback;
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to continue");
  return { supabase, user };
}

export async function runApiSecurityReviewAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const reviewMode = mode(formData.get("reviewMode"));
  const permissionAccepted = formData.get("permissionAccepted") === "yes";
  const extraSpecUrls = list(clean(formData.get("extraSpecUrls")));

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/api-security-review?message=${encodeURIComponent("Authorization checkbox is required.")}`,
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

  const { data: crawlerRun } = await supabase
    .from("advanced_crawler_runs")
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

  const report = await runApiSecurityReview({
    targetUrl: scan.website_url,
    mode: reviewMode,
    permissionAccepted,
    extraSpecUrls,
  });

  const { data: run, error } = await supabase
    .from("api_security_review_runs_v2")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      crawler_run_id: crawlerRun?.id || null,
      proof_chain_id: proofChain?.id || null,
      target_url: scan.website_url,
      normalized_origin: report.normalizedOrigin,
      run_status: report.runStatus,
      review_mode: reviewMode,
      authorization_status: verifiedScope ? "verified-scope" : "user-attested",
      discovered_spec_count: report.discoveredSpecCount,
      endpoint_count: report.endpointCount,
      public_docs_count: report.publicDocsCount,
      graphql_signal_count: report.graphqlSignalCount,
      sensitive_endpoint_count: report.sensitiveEndpointCount,
      mutation_endpoint_count: report.mutationEndpointCount,
      auth_required_count: report.authRequiredCount,
      auth_unclear_count: report.authUnclearCount,
      checklist_needs_fix_count: report.checklistNeedsFixCount,
      api_coverage_score: report.apiCoverageScore,
      api_risk_score: report.apiRiskScore,
      safe_summary: report.safeSummary,
      developer_summary: report.developerSummary,
      client_safe_summary: report.clientSafeSummary,
      blocked_actions: report.blockedActions,
      review_report: report,
    })
    .select("id")
    .single();

  if (error || !run?.id) {
    redirect(
      `/report/${scan.id}/api-security-review?message=${encodeURIComponent(error?.message || "Could not save API review run")}`,
    );
  }

  for (const spec of report.specs) {
    await supabase.from("api_discovered_specs_v2").insert({
      review_run_id: run.id,
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      spec_url: spec.specUrl,
      spec_type: spec.specType,
      http_status: spec.httpStatus,
      content_type: spec.contentType,
      title: spec.title,
      version: spec.version,
      is_public: spec.isPublic,
      endpoint_count: spec.endpointCount,
      method_count: spec.methodCount,
      auth_scheme_count: spec.authSchemeCount,
      sensitive_path_count: spec.sensitivePathCount,
      risk_level: spec.riskLevel,
      evidence_summary: spec.evidenceSummary,
      developer_note: spec.developerNote,
      client_safe_note: spec.clientSafeNote,
      blocked_claim: spec.blockedClaim,
      spec_fingerprint: spec.specFingerprint,
      raw_summary: spec.rawSummary,
    });
  }

  if (report.endpoints.length) {
    await supabase.from("api_endpoint_inventory_v2").insert(
      report.endpoints.map((endpoint) => ({
        review_run_id: run.id,
        spec_id: null,
        user_id: user.id,
        organization_id: scan.organization_id,
        website_id: scan.website_id,
        scan_id: scan.id,
        endpoint_path: endpoint.endpointPath,
        full_url: endpoint.fullUrl,
        method: endpoint.method,
        operation_id: endpoint.operationId,
        summary: endpoint.summary,
        endpoint_group: endpoint.endpointGroup,
        endpoint_type: endpoint.endpointType,
        auth_requirement: endpoint.authRequirement,
        mutation_risk: endpoint.mutationRisk,
        customer_data_signal: endpoint.customerDataSignal,
        admin_signal: endpoint.adminSignal,
        payment_signal: endpoint.paymentSignal,
        file_signal: endpoint.fileSignal,
        sensitive_signal: endpoint.sensitiveSignal,
        risk_level: endpoint.riskLevel,
        review_status: endpoint.reviewStatus,
        endpoint_fingerprint: endpoint.endpointFingerprint,
        evidence_summary: endpoint.evidenceSummary,
        developer_note: endpoint.developerNote,
        client_safe_note: endpoint.clientSafeNote,
        blocked_claim: endpoint.blockedClaim,
        raw_operation: endpoint.rawOperation,
      })),
    );
  }

  if (report.observations.length) {
    await supabase.from("api_security_observations_v2").insert(
      report.observations.map((observation) => ({
        review_run_id: run.id,
        endpoint_id: null,
        user_id: user.id,
        scan_id: scan.id,
        observation_key: observation.observationKey,
        category: observation.category,
        severity: observation.severity,
        confidence: observation.confidence,
        title: observation.title,
        evidence_summary: observation.evidenceSummary,
        developer_note: observation.developerNote,
        client_safe_note: observation.clientSafeNote,
        blocked_claim: observation.blockedClaim,
        safe_retest_steps: observation.safeRetestSteps,
        observation_payload: observation.payload,
      })),
    );
  }

  await supabase.from("api_review_checklist_items_v2").insert(
    report.checklist.map((item) => ({
      review_run_id: run.id,
      user_id: user.id,
      scan_id: scan.id,
      checklist_key: item.checklistKey,
      title: item.title,
      category: item.category,
      status: item.status,
      severity: item.severity,
      evidence_summary: item.evidenceSummary,
      developer_note: item.developerNote,
      client_safe_note: item.clientSafeNote,
      blocked_claim: item.blockedClaim,
    })),
  );

  await supabase.from("api_security_review_events_v2").insert({
    review_run_id: run.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    event_type: "api-review-completed",
    severity:
      report.apiRiskScore >= 60
        ? "High"
        : report.apiRiskScore >= 30
          ? "Medium"
          : "Info",
    title: "API Security Review completed",
    details: report.safeSummary,
    metadata: {
      endpointCount: report.endpointCount,
      publicDocsCount: report.publicDocsCount,
      apiRiskScore: report.apiRiskScore,
      apiCoverageScore: report.apiCoverageScore,
    },
  });

  revalidatePath(`/report/${scan.id}/api-security-review`);
  redirect(
    `/report/${scan.id}/api-security-review?run=${run.id}&message=${encodeURIComponent(`${report.endpointCount} API endpoint(s) inventoried.`)}`,
  );
}

export async function addManualApiEndpointAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const runId = clean(formData.get("runId"));
  const endpointPath = clean(formData.get("endpointPath"));
  const method = clean(formData.get("method"), "GET").toUpperCase();
  const summary = clean(formData.get("summary"));
  const authRequirement = choice(
    clean(formData.get("authRequirement"), "unclear"),
    ["required", "optional", "none-documented", "unclear"],
    "unclear",
  );

  const { data: run } = await supabase
    .from("api_security_review_runs_v2")
    .select("id, normalized_origin, organization_id, website_id")
    .eq("id", runId)
    .eq("user_id", user.id)
    .single();

  if (!run)
    redirect(
      `/report/${scanId}/api-security-review?message=API review run not found`,
    );

  const endpoint = createManualApiEndpoint({
    endpointPath,
    method,
    summary,
    authRequirement: authRequirement as any,
    origin: run.normalized_origin,
  });

  await supabase.from("api_endpoint_inventory_v2").insert({
    review_run_id: run.id,
    user_id: user.id,
    organization_id: run.organization_id,
    website_id: run.website_id,
    scan_id: scanId,
    endpoint_path: endpoint.endpointPath,
    full_url: endpoint.fullUrl,
    method: endpoint.method,
    operation_id: endpoint.operationId,
    summary: endpoint.summary,
    endpoint_group: endpoint.endpointGroup,
    endpoint_type: endpoint.endpointType,
    auth_requirement: endpoint.authRequirement,
    mutation_risk: endpoint.mutationRisk,
    customer_data_signal: endpoint.customerDataSignal,
    admin_signal: endpoint.adminSignal,
    payment_signal: endpoint.paymentSignal,
    file_signal: endpoint.fileSignal,
    sensitive_signal: endpoint.sensitiveSignal,
    risk_level: endpoint.riskLevel,
    review_status: endpoint.reviewStatus,
    endpoint_fingerprint: endpoint.endpointFingerprint,
    evidence_summary: endpoint.evidenceSummary,
    developer_note: endpoint.developerNote,
    client_safe_note: endpoint.clientSafeNote,
    blocked_claim: endpoint.blockedClaim,
    raw_operation: endpoint.rawOperation,
  });

  await supabase.from("api_security_review_events_v2").insert({
    review_run_id: run.id,
    user_id: user.id,
    scan_id: scanId,
    event_type: "endpoint-inventoried",
    severity: endpoint.riskLevel === "High" ? "High" : "Info",
    title: "Manual API endpoint added",
    details: endpoint.evidenceSummary,
    metadata: { endpointPath, method },
  });

  revalidatePath(`/report/${scanId}/api-security-review`);
  redirect(
    `/report/${scanId}/api-security-review?run=${run.id}&message=${encodeURIComponent("Manual API endpoint added.")}`,
  );
}

export async function updateApiChecklistItemAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const runId = clean(formData.get("runId"));
  const checklistId = clean(formData.get("checklistId"));
  const status = choice(
    clean(formData.get("status"), "not-checked"),
    ["pass", "needs-fix", "not-checked", "not-applicable", "accepted-risk"],
    "not-checked",
  );
  const evidenceSummary = clean(formData.get("evidenceSummary"));

  await supabase
    .from("api_review_checklist_items_v2")
    .update({ status, evidence_summary: evidenceSummary })
    .eq("id", checklistId)
    .eq("user_id", user.id);

  await supabase.from("api_security_review_events_v2").insert({
    review_run_id: runId,
    user_id: user.id,
    scan_id: scanId,
    event_type: "checklist-updated",
    severity: status === "needs-fix" ? "Medium" : "Info",
    title: "API checklist updated",
    details: `Checklist marked ${status}.`,
    metadata: { status },
  });

  const { data: checklist } = await supabase
    .from("api_review_checklist_items_v2")
    .select("status")
    .eq("review_run_id", runId)
    .eq("user_id", user.id);

  const needsFix = (checklist || []).filter(
    (item: any) => item.status === "needs-fix",
  ).length;

  await supabase
    .from("api_security_review_runs_v2")
    .update({ checklist_needs_fix_count: needsFix })
    .eq("id", runId)
    .eq("user_id", user.id);

  revalidatePath(`/report/${scanId}/api-security-review`);
  redirect(
    `/report/${scanId}/api-security-review?run=${runId}&message=${encodeURIComponent("API checklist updated.")}`,
  );
}
