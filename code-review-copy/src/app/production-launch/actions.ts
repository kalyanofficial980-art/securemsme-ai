"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildBenchmarkRun,
  buildLaunchSnapshot,
  defaultLaunchChecks,
} from "@/lib/accuracy-benchmark-production-launch-engine";
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
  userId: string,
  scanId?: string,
  extra?: (query: any) => any,
) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (scanId) query = query.eq("scan_id", scanId);
  if (extra) query = extra(query);
  const { count } = await query;
  return count || 0;
}

export async function seedProductionLaunchChecksAction() {
  const { supabase, user } = await getAuthedSupabase();
  const checks = defaultLaunchChecks();

  await supabase.from("production_launch_checks_v2").upsert(
    checks.map((check) => ({
      user_id: user.id,
      check_key: check.checkKey,
      check_title: check.checkTitle,
      check_group: check.checkGroup,
      check_status: check.checkStatus,
      severity: check.severity,
      owner_note: check.ownerNote,
      evidence_summary: check.evidenceSummary,
      required_action: check.requiredAction,
      client_safe_note: check.clientSafeNote,
      blocker_reason: check.blockerReason,
      display_order: check.displayOrder,
      check_payload: check.checkPayload,
    })),
    { onConflict: "user_id,check_key" },
  );

  await supabase.from("launch_hardening_events_v2").insert({
    user_id: user.id,
    event_type: "launch-check-seeded",
    severity: "Info",
    title: "Production launch checks seeded",
    details: `${checks.length} launch checks were created or refreshed.`,
    metadata: { count: checks.length },
  });

  revalidatePath("/production-launch");
  redirect("/production-launch?message=Production launch checks seeded.");
}

export async function updateProductionLaunchCheckAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const checkId = clean(formData.get("checkId"));
  const status = clean(formData.get("checkStatus"), "pending");
  const ownerNote = clean(formData.get("ownerNote"));

  await supabase
    .from("production_launch_checks_v2")
    .update({
      check_status: status,
      owner_note: ownerNote,
    })
    .eq("id", checkId)
    .eq("user_id", user.id);

  await supabase.from("launch_hardening_events_v2").insert({
    check_id: checkId,
    user_id: user.id,
    event_type: "launch-check-updated",
    severity: status === "blocked" || status === "fail" ? "High" : "Info",
    title: "Production launch check updated",
    details: `Launch check status changed to ${status}.`,
    metadata: { status },
  });

  revalidatePath("/production-launch");
  redirect("/production-launch?message=Launch check updated.");
}

export async function runAccuracyBenchmarkAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));

  const organizationId = "";

  const sourceCounts = {
    scans: await countTable(supabase, "scans", user.id),
    reports: await countTable(
      supabase,
      "client_report_v4_snapshots",
      user.id,
      scanId || undefined,
    ),
    evidenceItems: await countTable(
      supabase,
      "security_evidence_items",
      user.id,
      scanId || undefined,
    ),
    proofChains: await countTable(
      supabase,
      "security_proof_chains",
      user.id,
      scanId || undefined,
    ),
    accuracyAssessments: await countTable(
      supabase,
      "finding_accuracy_assessments",
      user.id,
      scanId || undefined,
    ),
    developerTasks: await countTable(
      supabase,
      "developer_fix_tasks_v2",
      user.id,
      scanId || undefined,
    ),
    retestRuns: await countTable(
      supabase,
      "retest_automation_runs_v2",
      user.id,
      scanId || undefined,
    ),
    monitoringAlerts: await countTable(
      supabase,
      "monitoring_regression_alerts_v2",
      user.id,
      scanId || undefined,
      (query: any) => query.neq("alert_status", "resolved"),
    ),
    aiTriageRuns: await countTable(
      supabase,
      "ai_triage_runs_v2",
      user.id,
      scanId || undefined,
    ),
  };

  const benchmark = buildBenchmarkRun(sourceCounts);

  const { data: run, error } = await supabase
    .from("accuracy_benchmark_runs_v2")
    .insert({
      user_id: user.id,
      organization_id: organizationId || null,
      scan_id: scanId || null,
      benchmark_title: scanId
        ? "Scan Accuracy Benchmark"
        : "Account Accuracy Benchmark",
      benchmark_status: "completed",
      benchmark_mode: "safe-quality-control",
      total_case_count: benchmark.totalCaseCount,
      passed_case_count: benchmark.passedCaseCount,
      failed_case_count: benchmark.failedCaseCount,
      warning_case_count: benchmark.warningCaseCount,
      manual_review_count: benchmark.manualReviewCount,
      accuracy_score: benchmark.accuracyScore,
      evidence_score: benchmark.evidenceScore,
      false_positive_control_score: benchmark.falsePositiveControlScore,
      claim_safety_score: benchmark.claimSafetyScore,
      benchmark_confidence_score: benchmark.benchmarkConfidenceScore,
      executive_summary: benchmark.executiveSummary,
      developer_summary: benchmark.developerSummary,
      client_safe_summary: benchmark.clientSafeSummary,
      limitations_summary: benchmark.limitationsSummary,
      blocked_claims: benchmark.blockedClaims,
      source_counts: benchmark.sourceCounts,
      benchmark_payload: { safeBenchmark: true },
    })
    .select("id")
    .single();

  if (error || !run?.id) {
    redirect(
      `/production-launch?message=${encodeURIComponent(error?.message || "Could not create benchmark")}`,
    );
  }

  await supabase.from("accuracy_benchmark_cases_v2").insert(
    benchmark.cases.map((item: any) => ({
      benchmark_run_id: run.id,
      user_id: user.id,
      scan_id: scanId || null,
      case_key: item.caseKey,
      case_title: item.caseTitle,
      case_category: item.caseCategory,
      case_status: item.caseStatus,
      severity: item.severity,
      expected_result: item.expectedResult,
      actual_result: item.actualResult,
      evidence_summary: item.evidenceSummary,
      remediation_action: item.remediationAction,
      client_safe_note: item.clientSafeNote,
      blocked_claim: item.blockedClaim,
      case_score: item.caseScore,
      case_payload: item.casePayload,
    })),
  );

  await supabase.from("launch_hardening_events_v2").insert({
    benchmark_run_id: run.id,
    user_id: user.id,
    organization_id: organizationId || null,
    event_type: "benchmark-created",
    severity:
      benchmark.failedCaseCount > 0
        ? "High"
        : benchmark.manualReviewCount > 0
          ? "Medium"
          : "Info",
    title: "Accuracy benchmark created",
    details: benchmark.executiveSummary,
    metadata: { accuracyScore: benchmark.accuracyScore },
  });

  revalidatePath("/production-launch");
  redirect(
    `/production-launch?benchmark=${run.id}&message=Accuracy benchmark completed.`,
  );
}

export async function createProductionLaunchSnapshotAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const benchmarkRunId = clean(formData.get("benchmarkRunId"));

  const { data: checks } = await supabase
    .from("production_launch_checks_v2")
    .select("check_status, check_group, severity, check_title, blocker_reason")
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  const { data: benchmark } = benchmarkRunId
    ? await supabase
        .from("accuracy_benchmark_runs_v2")
        .select("id, benchmark_confidence_score, accuracy_score")
        .eq("id", benchmarkRunId)
        .eq("user_id", user.id)
        .single()
    : { data: null };

  const snapshot = buildLaunchSnapshot(checks || [], benchmark || undefined);

  const { data: inserted, error } = await supabase
    .from("production_launch_snapshots_v2")
    .insert({
      user_id: user.id,
      benchmark_run_id: benchmark?.id || null,
      snapshot_title: "Production Launch Readiness",
      snapshot_status: snapshot.snapshotStatus,
      release_channel: "production",
      total_check_count: snapshot.totalCheckCount,
      passed_check_count: snapshot.passedCheckCount,
      warning_check_count: snapshot.warningCheckCount,
      failed_check_count: snapshot.failedCheckCount,
      blocked_check_count: snapshot.blockedCheckCount,
      launch_readiness_score: snapshot.launchReadinessScore,
      security_hardening_score: snapshot.securityHardeningScore,
      operational_readiness_score: snapshot.operationalReadinessScore,
      quality_confidence_score: snapshot.qualityConfidenceScore,
      customer_trust_score: snapshot.customerTrustScore,
      executive_summary: snapshot.executiveSummary,
      launch_blocker_summary: snapshot.launchBlockerSummary,
      hardening_summary: snapshot.hardeningSummary,
      final_recommendation: snapshot.finalRecommendation,
      blocked_claims: snapshot.blockedClaims,
      snapshot_payload: { finalPart: 66, safeLaunchReadiness: true },
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    redirect(
      `/production-launch?message=${encodeURIComponent(error?.message || "Could not create launch snapshot")}`,
    );
  }

  await supabase.from("production_release_notes_v2").insert(
    snapshot.releaseNotes.map((note: any) => ({
      snapshot_id: inserted.id,
      user_id: user.id,
      note_type: note.noteType,
      note_title: note.noteTitle,
      note_body: note.noteBody,
      severity: note.severity,
      display_order: note.displayOrder,
      note_payload: { safeReleaseNote: true },
    })),
  );

  await supabase.from("launch_hardening_events_v2").insert({
    snapshot_id: inserted.id,
    user_id: user.id,
    event_type: "launch-snapshot-created",
    severity: snapshot.snapshotStatus === "blocked" ? "High" : "Info",
    title: "Production launch snapshot created",
    details: snapshot.executiveSummary,
    metadata: { launchReadinessScore: snapshot.launchReadinessScore },
  });

  revalidatePath("/production-launch");
  redirect(
    `/production-launch?snapshot=${inserted.id}&message=Production launch snapshot created.`,
  );
}
