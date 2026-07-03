"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildClientPortalProSections,
  buildRetestItem,
  calculateRetestSummary,
  createProofFingerprint,
  retestClientPortalBlockedClaims,
  sanitizeProofText,
  type RetestStatus,
} from "@/lib/retest-client-portal-pro-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
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

async function recalcRun(supabase: any, runId: string, userId: string) {
  const { data } = await supabase
    .from("retest_items_v2")
    .select("status, proof_fingerprint, confidence")
    .eq("run_id", runId)
    .eq("user_id", userId);
  const summary = calculateRetestSummary(
    (data || []).map((item: any) => ({
      status: item.status,
      proofFingerprint: item.proof_fingerprint,
      confidence: item.confidence,
    })),
  );
  await supabase
    .from("retest_runs_v2")
    .update({
      run_status: summary.pending === 0 ? "completed" : "ready",
      total_items: summary.total,
      passed_items: summary.passed,
      failed_items: summary.failed,
      needs_review_items: summary.needsReview,
      blocked_items: summary.blocked,
      pending_items: summary.pending,
      progress_score: summary.progressScore,
      pass_rate: summary.passRate,
      proof_strength_score: summary.proofStrengthScore,
      client_readiness_score: summary.clientReadinessScore,
      executive_summary: summary.executiveSummary,
      client_safe_summary: summary.clientSafeSummary,
      limitations_summary: summary.limitationsSummary,
      blocked_claims: retestClientPortalBlockedClaims,
    })
    .eq("id", runId)
    .eq("user_id", userId);
  return summary;
}

export async function createRetestRunAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));
  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, website_id, organization_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();
  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: portal } = await supabase
    .from("developer_fix_portals_v2")
    .select("id")
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: tasks } = portal?.id
    ? await supabase
        .from("developer_fix_tasks_v2")
        .select(
          "id, task_title, task_status, priority, confidence_level, affected_area, developer_fix, safe_retest_steps, evidence_summary, client_safe_note",
        )
        .eq("portal_id", portal.id)
        .eq("user_id", user.id)
        .in("task_status", [
          "fixed",
          "retest-requested",
          "verified-fixed",
          "blocked",
        ])
        .limit(100)
    : { data: [] };

  const drafts = (tasks || []).map((task: any) =>
    buildRetestItem({
      title: task.task_title,
      status:
        task.task_status === "verified-fixed"
          ? "passed"
          : task.task_status === "blocked"
            ? "blocked"
            : "pending",
      priority: task.priority || "Medium",
      confidence: task.confidence_level || "Medium",
      affectedArea: task.affected_area,
      beforeEvidence: task.evidence_summary,
      fixSummary: task.developer_fix,
      safeRetestSteps: task.safe_retest_steps,
      afterEvidence:
        task.task_status === "verified-fixed"
          ? "Previously marked verified-fixed in developer portal."
          : "",
      verificationNote: task.client_safe_note,
    }),
  );

  if (!drafts.length)
    drafts.push(
      buildRetestItem({
        title: "Create retest checklist from developer fixes",
        affectedArea: scan.website_url,
      }),
    );
  const summary = calculateRetestSummary(drafts);

  const { data: run, error } = await supabase
    .from("retest_runs_v2")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      developer_portal_id: portal?.id || null,
      target_url: scan.website_url,
      run_status: "ready",
      total_items: summary.total,
      passed_items: summary.passed,
      failed_items: summary.failed,
      needs_review_items: summary.needsReview,
      blocked_items: summary.blocked,
      pending_items: summary.pending,
      progress_score: summary.progressScore,
      pass_rate: summary.passRate,
      proof_strength_score: summary.proofStrengthScore,
      client_readiness_score: summary.clientReadinessScore,
      executive_summary: summary.executiveSummary,
      client_safe_summary: summary.clientSafeSummary,
      limitations_summary: summary.limitationsSummary,
      blocked_claims: retestClientPortalBlockedClaims,
    })
    .select("id")
    .single();

  if (error || !run?.id)
    redirect(
      `/report/${scan.id}/retest-client-portal-pro?message=${encodeURIComponent(error?.message || "Could not create retest run")}`,
    );

  await supabase.from("retest_items_v2").insert(
    drafts.map((item: any, index: number) => ({
      run_id: run.id,
      user_id: user.id,
      scan_id: scan.id,
      developer_task_id: tasks?.[index]?.id || null,
      source_type: tasks?.[index]?.id ? "developer-task" : "manual",
      title: item.title,
      status: item.status,
      priority: item.priority,
      confidence: item.confidence,
      affected_area: item.affectedArea,
      before_evidence: item.beforeEvidence,
      fix_summary: item.fixSummary,
      safe_retest_steps: item.safeRetestSteps,
      after_evidence: item.afterEvidence,
      verification_note: item.verificationNote,
      client_result: item.clientResult,
      blocked_claim: item.blockedClaim,
      proof_fingerprint: item.proofFingerprint,
    })),
  );

  await supabase
    .from("retest_client_portal_events_v2")
    .insert({
      run_id: run.id,
      user_id: user.id,
      organization_id: scan.organization_id,
      scan_id: scan.id,
      event_type: "retest-run-created",
      title: "Retest run created",
      details: `${drafts.length} safe retest item(s) created.`,
    });
  revalidatePath(`/report/${scan.id}/retest-client-portal-pro`);
  redirect(
    `/report/${scan.id}/retest-client-portal-pro?run=${run.id}&message=${encodeURIComponent("Retest run created.")}`,
  );
}

export async function updateRetestItemAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));
  const runId = clean(formData.get("runId"));
  const itemId = clean(formData.get("itemId"));
  const status = choice(
    clean(formData.get("status"), "pending"),
    ["pending", "running", "passed", "failed", "needs-review", "blocked"],
    "pending",
  ) as RetestStatus;
  const after = sanitizeProofText(clean(formData.get("afterEvidence")));
  const note = sanitizeProofText(clean(formData.get("verificationNote")));
  const fingerprint = createProofFingerprint(
    `${itemId}|${status}|${after}|${note}`,
  );

  await supabase
    .from("retest_items_v2")
    .update({
      status,
      after_evidence: after,
      verification_note: note,
      client_result:
        status === "passed"
          ? "Fix appears verified by available safe retest proof."
          : status === "failed"
            ? "Fix did not pass safe retest and needs developer review."
            : "Retest needs more review or is pending.",
      blocked_claim:
        status === "passed"
          ? "Do not claim the whole website is secure; only this item has proof."
          : "Do not claim verified-fixed until retest passes.",
      proof_fingerprint: fingerprint,
    })
    .eq("id", itemId)
    .eq("user_id", user.id);

  await supabase
    .from("retest_client_portal_events_v2")
    .insert({
      run_id: runId,
      item_id: itemId,
      user_id: user.id,
      scan_id: scanId,
      event_type: "retest-item-updated",
      severity: status === "failed" || status === "blocked" ? "Medium" : "Info",
      title: "Retest item updated",
      details: `Retest item changed to ${status}.`,
    });
  await recalcRun(supabase, runId, user.id);
  revalidatePath(`/report/${scanId}/retest-client-portal-pro`);
  redirect(
    `/report/${scanId}/retest-client-portal-pro?run=${runId}&message=${encodeURIComponent("Retest item updated.")}`,
  );
}

export async function createClientPortalProLinkAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));
  const runId = clean(formData.get("runId"));
  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, website_id, organization_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();
  if (!scan) redirect("/dashboard?message=Scan not found");
  const { data: run } = await supabase
    .from("retest_runs_v2")
    .select("*")
    .eq("id", runId)
    .eq("user_id", user.id)
    .single();
  if (!run)
    redirect(
      `/report/${scan.id}/retest-client-portal-pro?message=Retest run not found`,
    );
  const { data: report } = await supabase
    .from("client_report_v4_snapshots")
    .select(
      "id, executive_score, report_readiness_score, client_safe_summary, limitations_summary",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: portal } = run.developer_portal_id
    ? await supabase
        .from("developer_fix_portals_v2")
        .select("id, fix_progress_score")
        .eq("id", run.developer_portal_id)
        .eq("user_id", user.id)
        .single()
    : { data: null };
  const executiveScore = report?.executive_score || 0;
  const reportReadinessScore = report?.report_readiness_score || 0;
  const fixProgressScore = portal?.fix_progress_score || 0;
  const retestPassRate = run.pass_rate || 0;
  const clientReadinessScore = Math.round(
    reportReadinessScore * 0.3 + fixProgressScore * 0.3 + retestPassRate * 0.4,
  );
  const portalSummary =
    report?.client_safe_summary ||
    run.client_safe_summary ||
    "Client-safe portal generated from report, fix and retest proof sources.";
  const limitationsSummary =
    report?.limitations_summary || run.limitations_summary;

  const { data: link, error } = await supabase
    .from("client_portal_pro_links_v2")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      retest_run_id: run.id,
      report_v4_snapshot_id: report?.id || null,
      developer_portal_id: portal?.id || null,
      target_url: scan.website_url,
      executive_score: executiveScore,
      report_readiness_score: reportReadinessScore,
      fix_progress_score: fixProgressScore,
      retest_pass_rate: retestPassRate,
      client_readiness_score: clientReadinessScore,
      portal_summary: portalSummary,
      limitations_summary: limitationsSummary,
    })
    .select("id, share_token")
    .single();
  if (error || !link?.id)
    redirect(
      `/report/${scan.id}/retest-client-portal-pro?run=${run.id}&message=${encodeURIComponent(error?.message || "Could not create link")}`,
    );

  const sections = buildClientPortalProSections({
    targetUrl: scan.website_url,
    executiveScore,
    reportReadinessScore,
    fixProgressScore,
    retestPassRate,
    clientReadinessScore,
    portalSummary,
    limitationsSummary,
    passed: run.passed_items || 0,
    total: run.total_items || 0,
  });
  await supabase.from("client_portal_pro_sections_v2").insert(
    sections.map((section) => ({
      link_id: link.id,
      user_id: user.id,
      scan_id: scan.id,
      section_key: section.sectionKey,
      title: section.title,
      section_type: section.sectionType,
      display_order: section.displayOrder,
      status_label: section.statusLabel,
      body: section.body,
      evidence_summary: section.evidenceSummary,
      action_summary: section.actionSummary,
      blocked_claim: section.blockedClaim,
    })),
  );
  await supabase
    .from("retest_client_portal_events_v2")
    .insert({
      run_id: run.id,
      link_id: link.id,
      user_id: user.id,
      organization_id: scan.organization_id,
      scan_id: scan.id,
      event_type: "client-link-created",
      title: "Client Portal Pro link created",
      details: "Shareable client-safe portal generated.",
    });
  revalidatePath(`/report/${scan.id}/retest-client-portal-pro`);
  redirect(
    `/report/${scan.id}/retest-client-portal-pro?run=${run.id}&message=${encodeURIComponent("Client Portal Pro link created.")}`,
  );
}
