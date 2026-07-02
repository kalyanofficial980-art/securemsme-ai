"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildDeveloperTask,
  calculateDeveloperPortalSummary,
  safeDeveloperComment,
  type DeveloperTaskStatus,
} from "@/lib/developer-portal-v2-engine";
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

async function recalculatePortal(
  supabase: any,
  portalId: string,
  userId: string,
) {
  const { data: rows } = await supabase
    .from("developer_fix_tasks_v2")
    .select("task_status, priority, confidence_level")
    .eq("portal_id", portalId)
    .eq("user_id", userId);

  const tasks = (rows || []).map((task: any) => ({
    taskStatus: task.task_status,
    priority: task.priority,
    confidenceLevel: task.confidence_level,
  }));

  const summary = calculateDeveloperPortalSummary(tasks);

  await supabase
    .from("developer_fix_portals_v2")
    .update({
      total_task_count: summary.totalTaskCount,
      open_task_count: summary.openTaskCount,
      in_progress_task_count: summary.inProgressTaskCount,
      fixed_task_count: summary.fixedTaskCount,
      retest_requested_count: summary.retestRequestedCount,
      verified_fixed_count: summary.verifiedFixedCount,
      blocked_task_count: summary.blockedTaskCount,
      fix_progress_score: summary.fixProgressScore,
      developer_readiness_score: summary.developerReadinessScore,
      retest_readiness_score: summary.retestReadinessScore,
      developer_summary: summary.developerSummary,
      client_safe_summary: summary.clientSafeSummary,
      retest_summary: summary.retestSummary,
      blocked_claims: summary.blockedClaims,
    })
    .eq("id", portalId)
    .eq("user_id", userId);
}

export async function createDeveloperPortalAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, website_id, organization_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: portal, error } = await supabase
    .from("developer_fix_portals_v2")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      portal_title: "Developer Fix Portal",
      target_url: scan.website_url,
      portal_status: "active",
      developer_summary:
        "Developer portal created. Add or sync remediation tasks.",
      client_safe_summary: "Developer fix workflow has started.",
      retest_summary: "No tasks are ready for retest yet.",
    })
    .select("id")
    .single();

  if (error || !portal?.id) {
    redirect(
      `/report/${scan.id}/developer-portal?message=${encodeURIComponent(error?.message || "Could not create developer portal")}`,
    );
  }

  await supabase.from("developer_portal_events_v2").insert({
    portal_id: portal.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    event_type: "portal-created",
    severity: "Info",
    title: "Developer portal created",
    details: "Fix collaboration portal created for this scan.",
    metadata: { targetUrl: scan.website_url },
  });

  revalidatePath(`/report/${scan.id}/developer-portal`);
  redirect(
    `/report/${scan.id}/developer-portal?portal=${portal.id}&message=${encodeURIComponent("Developer portal created.")}`,
  );
}

export async function syncDeveloperTasksAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));
  const portalId = clean(formData.get("portalId"));

  const taskDrafts = [];

  const { data: workspaceBugs } = await supabase
    .from("security_review_bug_items")
    .select(
      "id, title, severity, confidence, affected_area, developer_fix, retest_steps, evidence_summary, client_safe_summary, status",
    )
    .eq("scan_id", scanId)
    .eq("user_id", user.id)
    .limit(50);

  for (const bug of workspaceBugs || []) {
    taskDrafts.push(
      buildDeveloperTask({
        sourceType: "workspace-bug",
        sourceId: bug.id,
        title: bug.title || "Security review bug item",
        priority: bug.severity || "Medium",
        confidence: bug.confidence || "Medium",
        affectedArea: bug.affected_area || "",
        developerFix: bug.developer_fix || "",
        safeRetestSteps: bug.retest_steps || "",
        evidenceSummary: bug.evidence_summary || "",
        clientSafeNote: bug.client_safe_summary || "",
        status: "open",
      }),
    );
  }

  const { data: findings } = await supabase
    .from("vulnerability_bug_findings")
    .select(
      "id, title, severity, confidence, affected_url, developer_fix, retest_steps, evidence",
    )
    .eq("scan_id", scanId)
    .eq("user_id", user.id)
    .limit(50);

  for (const finding of findings || []) {
    taskDrafts.push(
      buildDeveloperTask({
        sourceType: "vulnerability-finding",
        sourceId: finding.id,
        title: finding.title || "Vulnerability finding fix",
        priority: finding.severity || "Medium",
        confidence: finding.confidence || "Medium",
        affectedArea: finding.affected_url || "",
        developerFix: finding.developer_fix || "",
        safeRetestSteps: finding.retest_steps || "",
        evidenceSummary:
          typeof finding.evidence === "string"
            ? finding.evidence
            : "Scanner evidence available.",
        clientSafeNote:
          "Fix recommended from authorized vulnerability scanner evidence.",
        status: "open",
      }),
    );
  }

  const { data: apiEndpoints } = await supabase
    .from("api_endpoint_inventory_v2")
    .select(
      "id, endpoint_path, method, endpoint_type, risk_level, auth_requirement, evidence_summary, developer_note, client_safe_note, blocked_claim",
    )
    .eq("scan_id", scanId)
    .eq("user_id", user.id)
    .in("risk_level", ["Critical", "High", "Medium"])
    .limit(30);

  for (const endpoint of apiEndpoints || []) {
    taskDrafts.push(
      buildDeveloperTask({
        sourceType: "api-endpoint",
        sourceId: endpoint.id,
        title: `Review API endpoint: ${endpoint.method} ${endpoint.endpoint_path}`,
        priority: endpoint.risk_level || "Medium",
        confidence:
          endpoint.auth_requirement === "required" ? "High" : "Medium",
        affectedArea: endpoint.endpoint_path,
        developerFix: endpoint.developer_note || "",
        safeRetestSteps:
          "Review API authorization/configuration and rerun API Security Review safely.",
        evidenceSummary: endpoint.evidence_summary || "",
        clientSafeNote: endpoint.client_safe_note || "",
        status: "open",
      }),
    );
  }

  if (!taskDrafts.length) {
    taskDrafts.push(
      buildDeveloperTask({
        sourceType: "manual",
        title: "Review security report and confirm developer action plan",
        priority: "Medium",
        confidence: "Medium",
        affectedArea: "Overall website",
        developerFix:
          "Review Client Report v4, Evidence Warehouse, API Review and Security Review Workspace. Add specific fix tasks.",
        safeRetestSteps: "After fixes, request safe retest from the portal.",
        evidenceSummary:
          "Manual starter task created because no synced findings were available.",
        clientSafeNote: "Developer should review the report and add fix tasks.",
        status: "open",
      }),
    );
  }

  await supabase.from("developer_fix_tasks_v2").insert(
    taskDrafts.map((task) => ({
      portal_id: portalId,
      user_id: user.id,
      scan_id: scanId,
      source_type: task.sourceType,
      source_id: task.sourceId,
      task_title: task.taskTitle,
      task_status: task.taskStatus,
      priority: task.priority,
      confidence_level: task.confidenceLevel,
      affected_area: task.affectedArea,
      developer_fix: task.developerFix,
      safe_retest_steps: task.safeRetestSteps,
      evidence_summary: task.evidenceSummary,
      client_safe_note: task.clientSafeNote,
      blocked_claim: task.blockedClaim,
      estimated_effort: task.estimatedEffort,
      task_payload: task.taskPayload,
    })),
  );

  await recalculatePortal(supabase, portalId, user.id);

  await supabase.from("developer_portal_events_v2").insert({
    portal_id: portalId,
    user_id: user.id,
    scan_id: scanId,
    event_type: "task-created",
    severity: "Info",
    title: "Developer tasks synced",
    details: `${taskDrafts.length} developer task(s) synced from available findings.`,
    metadata: { count: taskDrafts.length },
  });

  revalidatePath(`/report/${scanId}/developer-portal`);
  redirect(
    `/report/${scanId}/developer-portal?portal=${portalId}&message=${encodeURIComponent(`${taskDrafts.length} task(s) synced.`)}`,
  );
}

export async function addDeveloperTaskAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));
  const portalId = clean(formData.get("portalId"));

  const task = buildDeveloperTask({
    sourceType: "manual",
    title: clean(formData.get("taskTitle")),
    priority: choice(
      clean(formData.get("priority"), "Medium"),
      ["Critical", "High", "Medium", "Low", "Info"],
      "Medium",
    ) as any,
    confidence: choice(
      clean(formData.get("confidence"), "Medium"),
      ["Confirmed", "High", "Medium", "Low", "Needs manual review"],
      "Medium",
    ) as any,
    affectedArea: clean(formData.get("affectedArea")),
    developerFix: clean(formData.get("developerFix")),
    safeRetestSteps: clean(formData.get("safeRetestSteps")),
    evidenceSummary: clean(formData.get("evidenceSummary")),
    clientSafeNote: clean(formData.get("clientSafeNote")),
  });

  await supabase.from("developer_fix_tasks_v2").insert({
    portal_id: portalId,
    user_id: user.id,
    scan_id: scanId,
    source_type: task.sourceType,
    task_title: task.taskTitle,
    task_status: task.taskStatus,
    priority: task.priority,
    confidence_level: task.confidenceLevel,
    affected_area: task.affectedArea,
    developer_fix: task.developerFix,
    safe_retest_steps: task.safeRetestSteps,
    evidence_summary: task.evidenceSummary,
    client_safe_note: task.clientSafeNote,
    blocked_claim: task.blockedClaim,
    estimated_effort: task.estimatedEffort,
    task_payload: task.taskPayload,
  });

  await recalculatePortal(supabase, portalId, user.id);

  revalidatePath(`/report/${scanId}/developer-portal`);
  redirect(
    `/report/${scanId}/developer-portal?portal=${portalId}&message=${encodeURIComponent("Developer task added.")}`,
  );
}

export async function updateDeveloperTaskStatusAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));
  const portalId = clean(formData.get("portalId"));
  const taskId = clean(formData.get("taskId"));
  const status = choice(
    clean(formData.get("taskStatus"), "open"),
    [
      "open",
      "in-progress",
      "fixed",
      "retest-requested",
      "verified-fixed",
      "blocked",
      "accepted-risk",
    ],
    "open",
  ) as DeveloperTaskStatus;

  await supabase
    .from("developer_fix_tasks_v2")
    .update({ task_status: status })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (status === "retest-requested") {
    await supabase.from("developer_retest_requests_v2").insert({
      portal_id: portalId,
      task_id: taskId,
      user_id: user.id,
      scan_id: scanId,
      request_status: "requested",
      request_reason: "Developer marked task ready for safe retest.",
      safe_retest_scope:
        "Retest only the affected area and safe checks connected to this task.",
    });
  }

  await supabase.from("developer_portal_events_v2").insert({
    portal_id: portalId,
    task_id: taskId,
    user_id: user.id,
    scan_id: scanId,
    event_type: "task-updated",
    severity: status === "blocked" ? "Medium" : "Info",
    title: "Developer task status updated",
    details: `Task status changed to ${status}.`,
    metadata: { status },
  });

  await recalculatePortal(supabase, portalId, user.id);

  revalidatePath(`/report/${scanId}/developer-portal`);
  redirect(
    `/report/${scanId}/developer-portal?portal=${portalId}&message=${encodeURIComponent("Task status updated.")}`,
  );
}

export async function addDeveloperCommentAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));
  const portalId = clean(formData.get("portalId"));
  const taskId = clean(formData.get("taskId"));
  const commentBody = clean(formData.get("commentBody"));
  const comment = safeDeveloperComment(commentBody);

  await supabase.from("developer_fix_comments_v2").insert({
    portal_id: portalId,
    task_id: taskId || null,
    user_id: user.id,
    scan_id: scanId,
    comment_type: "developer-note",
    visibility: "developer",
    comment_body: comment.body,
    safe_comment: comment.safe,
    blocked_reason: comment.blockedReason,
  });

  await supabase.from("developer_portal_events_v2").insert({
    portal_id: portalId,
    task_id: taskId || null,
    user_id: user.id,
    scan_id: scanId,
    event_type: "comment-added",
    severity: comment.safe ? "Info" : "Medium",
    title: comment.safe
      ? "Developer comment added"
      : "Developer comment sanitized",
    details: comment.safe
      ? "Safe developer comment added."
      : comment.blockedReason,
    metadata: { safe: comment.safe },
  });

  revalidatePath(`/report/${scanId}/developer-portal`);
  redirect(
    `/report/${scanId}/developer-portal?portal=${portalId}&message=${encodeURIComponent(comment.safe ? "Comment added." : "Comment sanitized and added.")}`,
  );
}
