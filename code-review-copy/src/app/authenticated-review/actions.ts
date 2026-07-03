"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  authenticatedReviewBlockedActions,
  buildAuthenticatedObservation,
  buildAuthReviewSummary,
  buildRoleComparison,
  calculateAuthCoverageScore,
  calculateAuthRiskScore,
  defaultAuthChecklist,
  normalizeAuthReviewDepth,
} from "@/lib/authenticated-safe-review-v2";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function list(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
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

export async function createAuthenticatedReviewContextAction(
  formData: FormData,
) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const targetUrl = clean(formData.get("targetUrl"));
  const loginUrl = clean(formData.get("loginUrl"));
  const testAccountLabel = clean(formData.get("testAccountLabel"));
  const roleNames = list(clean(formData.get("roleNames")));
  const allowedPaths = list(clean(formData.get("allowedPaths")));
  const excludedPaths = list(clean(formData.get("excludedPaths")));
  const scopeSummary = clean(formData.get("scopeSummary"));
  const safeBoundaries = clean(formData.get("safeBoundaries"));
  const reviewDepth = normalizeAuthReviewDepth(
    clean(formData.get("reviewDepth"), "safe-standard"),
  );
  const authorizationAccepted = formData.get("authorizationAccepted") === "yes";

  if (!authorizationAccepted) {
    redirect(
      `/report/${scanId}/authenticated-safe-review?message=${encodeURIComponent("Authorization confirmation is required.")}`,
    );
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, website_id, organization_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: context, error } = await supabase
    .from("authenticated_review_contexts")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      context_name: "Authenticated Safe Review Context",
      target_url: targetUrl || scan.website_url,
      auth_base_url: targetUrl || scan.website_url,
      login_url: loginUrl || null,
      test_account_label: testAccountLabel,
      role_names: roleNames,
      authorization_status: "approved",
      credential_storage_status: "not-stored",
      secret_reference_note:
        "No password or session secret is stored inside SecureMSME AI.",
      scope_summary:
        scopeSummary ||
        "Approved authenticated review using temporary test account only.",
      safe_boundaries:
        safeBoundaries ||
        "Metadata/manual safe review only. No mutation, no exploitation, no private data extraction.",
      blocked_actions: authenticatedReviewBlockedActions,
      allowed_paths: allowedPaths,
      excluded_paths: excludedPaths,
      review_depth: reviewDepth,
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !context?.id) {
    redirect(
      `/report/${scan.id}/authenticated-safe-review?message=${encodeURIComponent(error?.message || "Could not create context")}`,
    );
  }

  await supabase.from("authenticated_review_events").insert({
    context_id: context.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    event_type: "context-created",
    severity: "Info",
    title: "Authenticated review context created",
    details:
      "Approved test-account scope metadata created. No credentials stored.",
    metadata: { roleNames, allowedPaths, excludedPaths, reviewDepth },
  });

  revalidatePath(`/report/${scan.id}/authenticated-safe-review`);
  redirect(
    `/report/${scan.id}/authenticated-safe-review?context=${context.id}&message=${encodeURIComponent("Authenticated review context created.")}`,
  );
}

export async function runAuthenticatedSafeReviewAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const contextId = clean(formData.get("contextId"));

  const { data: context } = await supabase
    .from("authenticated_review_contexts")
    .select("*")
    .eq("id", contextId)
    .eq("user_id", user.id)
    .eq("scan_id", scanId)
    .single();

  if (!context)
    redirect(
      `/report/${scanId}/authenticated-safe-review?message=Context not found`,
    );

  if (context.authorization_status !== "approved") {
    redirect(
      `/report/${scanId}/authenticated-safe-review?context=${context.id}&message=${encodeURIComponent("Context is not approved.")}`,
    );
  }

  const { data: crawlerRun } = await supabase
    .from("advanced_crawler_runs")
    .select("id")
    .eq("scan_id", scanId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: proofChain } = await supabase
    .from("security_proof_chains")
    .select("id")
    .eq("scan_id", scanId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: run, error } = await supabase
    .from("authenticated_safe_review_runs")
    .insert({
      context_id: context.id,
      user_id: user.id,
      organization_id: context.organization_id,
      website_id: context.website_id,
      scan_id: scanId,
      crawler_run_id: crawlerRun?.id || null,
      proof_chain_id: proofChain?.id || null,
      target_url: context.target_url,
      run_status: "completed",
      review_mode: "manual-safe",
      authorization_gate: "approved",
      blocked_claims: authenticatedReviewBlockedActions,
      safe_summary:
        "Authenticated safe review run created. Add manual observations, role comparisons and checklist validation.",
      developer_summary:
        "Review session/cookie flags, role access, customer data pages and account-action pages.",
      client_safe_summary:
        "Authenticated review started under approved safe test-account scope. No credentials are stored.",
    })
    .select("id")
    .single();

  if (error || !run?.id) {
    redirect(
      `/report/${scanId}/authenticated-safe-review?context=${context.id}&message=${encodeURIComponent(error?.message || "Could not create review run")}`,
    );
  }

  await supabase.from("authenticated_review_checklist_items").insert(
    defaultAuthChecklist.map((item) => ({
      review_run_id: run.id,
      context_id: context.id,
      user_id: user.id,
      scan_id: scanId,
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

  await supabase.from("authenticated_review_events").insert({
    context_id: context.id,
    review_run_id: run.id,
    user_id: user.id,
    organization_id: context.organization_id,
    scan_id: scanId,
    event_type: "review-started",
    severity: "Info",
    title: "Authenticated safe review run created",
    details: "Checklist initialized. Add safe manual observations next.",
    metadata: { checklistCount: defaultAuthChecklist.length },
  });

  revalidatePath(`/report/${scanId}/authenticated-safe-review`);
  redirect(
    `/report/${scanId}/authenticated-safe-review?context=${context.id}&run=${run.id}&message=${encodeURIComponent("Authenticated safe review run created.")}`,
  );
}

async function recalculateRun(supabase: any, runId: string) {
  const { data: run } = await supabase
    .from("authenticated_safe_review_runs")
    .select("id, context_id, scan_id")
    .eq("id", runId)
    .single();

  if (!run) return;

  const { data: observations } = await supabase
    .from("authenticated_page_observations")
    .select(
      "contains_sensitive_data_signal, contains_account_action_signal, contains_payment_signal, contains_file_upload_signal, validation_status",
    )
    .eq("review_run_id", runId);

  const { data: comparisons } = await supabase
    .from("authenticated_role_comparisons")
    .select("access_control_signal")
    .eq("review_run_id", runId);

  const { data: checklist } = await supabase
    .from("authenticated_review_checklist_items")
    .select("status")
    .eq("review_run_id", runId);

  const pageCount = observations?.length || 0;
  const sensitivePages = (observations || []).filter(
    (item: any) => item.contains_sensitive_data_signal,
  ).length;
  const accountActionPages = (observations || []).filter(
    (item: any) =>
      item.contains_account_action_signal ||
      item.contains_payment_signal ||
      item.contains_file_upload_signal,
  ).length;
  const roleWarnings = (comparisons || []).filter((item: any) =>
    [
      "unexpected-same-access",
      "unexpected-extra-access",
      "needs-review",
    ].includes(item.access_control_signal),
  ).length;
  const checkedChecklistCount = (checklist || []).filter(
    (item: any) => !["not-checked"].includes(item.status),
  ).length;
  const checklistNeedsFix = (checklist || []).filter(
    (item: any) => item.status === "needs-fix",
  ).length;
  const cookieReviewCount = (checklist || []).filter(
    (item: any) => item.status !== "not-checked",
  ).length;

  const coverageScore = calculateAuthCoverageScore({
    pageCount,
    checklistCount: checklist?.length || 0,
    checkedChecklistCount,
    roleComparisonCount: comparisons?.length || 0,
    cookieReviewCount,
  });

  const authRiskScore = calculateAuthRiskScore({
    sensitivePages,
    accountActionPages,
    roleWarnings,
    checklistNeedsFix,
  });

  const summary = buildAuthReviewSummary({
    pageCount,
    sensitivePages,
    roleComparisons: comparisons?.length || 0,
    checklistNeedsFix,
    coverageScore,
    riskScore: authRiskScore,
  });

  await supabase
    .from("authenticated_safe_review_runs")
    .update({
      total_pages_reviewed: pageCount,
      account_surface_count: accountActionPages,
      role_comparison_count: comparisons?.length || 0,
      cookie_review_count: cookieReviewCount,
      sensitive_page_signal_count: sensitivePages,
      developer_action_count: checklistNeedsFix + roleWarnings,
      needs_expert_review_count: roleWarnings + checklistNeedsFix,
      coverage_score: coverageScore,
      auth_risk_score: authRiskScore,
      safe_summary: summary.safeSummary,
      developer_summary: summary.developerSummary,
      client_safe_summary: summary.clientSafeSummary,
      review_report: {
        pageCount,
        sensitivePages,
        accountActionPages,
        roleWarnings,
        checklistNeedsFix,
        coverageScore,
        authRiskScore,
      },
    })
    .eq("id", runId);
}

export async function addAuthenticatedObservationAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const contextId = clean(formData.get("contextId"));
  const runId = clean(formData.get("runId"));

  const obs = buildAuthenticatedObservation({
    pageUrl: clean(formData.get("pageUrl")),
    title: clean(formData.get("title")),
    roleName: clean(formData.get("roleName")),
    notes: clean(formData.get("notes")),
    hasPasswordField: formData.get("hasPasswordField") === "yes",
    hasCustomerDataField: formData.get("hasCustomerDataField") === "yes",
    hasPaymentSignal: formData.get("hasPaymentSignal") === "yes",
    hasFileUploadSignal: formData.get("hasFileUploadSignal") === "yes",
    hasAdminSignal: formData.get("hasAdminSignal") === "yes",
  });

  if (!obs.pageUrl) {
    redirect(
      `/report/${scanId}/authenticated-safe-review?context=${contextId}&run=${runId}&message=Page URL is required`,
    );
  }

  await supabase.from("authenticated_page_observations").insert({
    review_run_id: runId,
    context_id: contextId,
    user_id: user.id,
    scan_id: scanId,
    page_url: obs.pageUrl,
    page_type: obs.pageType,
    access_state: obs.accessState,
    role_name: obs.roleName,
    contains_sensitive_data_signal: obs.containsSensitiveDataSignal,
    contains_account_action_signal: obs.containsAccountActionSignal,
    contains_payment_signal: obs.containsPaymentSignal,
    contains_file_upload_signal: obs.containsFileUploadSignal,
    cookie_security_note: obs.cookieSecurityNote,
    session_security_note: obs.sessionSecurityNote,
    access_control_note: obs.accessControlNote,
    evidence_summary: obs.evidenceSummary,
    developer_note: obs.developerNote,
    client_safe_note: obs.clientSafeNote,
    blocked_claim: obs.blockedClaim,
    observation_quality: obs.observationQuality,
    validation_status: obs.validationStatus,
    observation_payload: obs.observationPayload,
  });

  await supabase.from("authenticated_review_events").insert({
    context_id: contextId,
    review_run_id: runId,
    user_id: user.id,
    scan_id: scanId,
    event_type: "manual-observation-added",
    severity: obs.containsSensitiveDataSignal ? "Medium" : "Info",
    title: "Authenticated page observation added",
    details: obs.evidenceSummary,
    metadata: obs.observationPayload,
  });

  await recalculateRun(supabase, runId);

  revalidatePath(`/report/${scanId}/authenticated-safe-review`);
  redirect(
    `/report/${scanId}/authenticated-safe-review?context=${contextId}&run=${runId}&message=${encodeURIComponent("Observation added.")}`,
  );
}

export async function addRoleComparisonAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const contextId = clean(formData.get("contextId"));
  const runId = clean(formData.get("runId"));

  const comparison = buildRoleComparison({
    pageUrl: clean(formData.get("pageUrl")),
    roleA: clean(formData.get("roleA"), "role-a"),
    roleB: clean(formData.get("roleB"), "role-b"),
    expectedDifference: clean(formData.get("expectedDifference")),
    observedDifference: clean(formData.get("observedDifference")),
  });

  await supabase.from("authenticated_role_comparisons").insert({
    review_run_id: runId,
    context_id: contextId,
    user_id: user.id,
    scan_id: scanId,
    comparison_name: comparison.comparisonName,
    page_url: comparison.pageUrl,
    role_a: comparison.roleA,
    role_b: comparison.roleB,
    expected_difference: comparison.expectedDifference,
    observed_difference: comparison.observedDifference,
    access_control_signal: comparison.accessControlSignal,
    severity: comparison.severity,
    evidence_summary: comparison.evidenceSummary,
    developer_note: comparison.developerNote,
    client_safe_note: comparison.clientSafeNote,
    blocked_claim: comparison.blockedClaim,
    comparison_payload: comparison,
  });

  await supabase.from("authenticated_review_events").insert({
    context_id: contextId,
    review_run_id: runId,
    user_id: user.id,
    scan_id: scanId,
    event_type: "role-comparison-added",
    severity: comparison.severity,
    title: "Role comparison added",
    details: comparison.evidenceSummary,
    metadata: comparison,
  });

  await recalculateRun(supabase, runId);

  revalidatePath(`/report/${scanId}/authenticated-safe-review`);
  redirect(
    `/report/${scanId}/authenticated-safe-review?context=${contextId}&run=${runId}&message=${encodeURIComponent("Role comparison added.")}`,
  );
}

export async function updateAuthChecklistItemAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const contextId = clean(formData.get("contextId"));
  const runId = clean(formData.get("runId"));
  const checklistId = clean(formData.get("checklistId"));
  const status = choice(
    clean(formData.get("status"), "not-checked"),
    ["pass", "needs-fix", "not-checked", "not-applicable", "accepted-risk"],
    "not-checked",
  );
  const evidenceSummary = clean(formData.get("evidenceSummary"));

  await supabase
    .from("authenticated_review_checklist_items")
    .update({
      status,
      evidence_summary: evidenceSummary,
    })
    .eq("id", checklistId)
    .eq("user_id", user.id);

  await supabase.from("authenticated_review_events").insert({
    context_id: contextId,
    review_run_id: runId,
    user_id: user.id,
    scan_id: scanId,
    event_type: "checklist-updated",
    severity: status === "needs-fix" ? "Medium" : "Info",
    title: "Checklist item updated",
    details: `Checklist marked ${status}.`,
    metadata: { status },
  });

  await recalculateRun(supabase, runId);

  revalidatePath(`/report/${scanId}/authenticated-safe-review`);
  redirect(
    `/report/${scanId}/authenticated-safe-review?context=${contextId}&run=${runId}&message=${encodeURIComponent("Checklist updated.")}`,
  );
}
