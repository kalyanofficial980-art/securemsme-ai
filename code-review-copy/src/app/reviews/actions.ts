"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClientProgressSummary,
  deriveWorkspaceRisk,
  deriveWorkspaceStage,
} from "@/lib/security-review-workspace-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function safeChoice(value: string, allowed: string[], fallback: string) {
  return allowed.includes(value) ? value : fallback;
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to continue");
  return { supabase, user };
}

async function recalculateWorkspace(supabase: any, workspaceId: string) {
  const { data: items } = await supabase
    .from("security_review_bug_items")
    .select("severity, lifecycle_status")
    .eq("workspace_id", workspaceId);

  const safeItems = items || [];
  const clientSummary = createClientProgressSummary(safeItems);
  const risk = deriveWorkspaceRisk(safeItems);
  const stage = deriveWorkspaceStage(safeItems);

  await supabase.rpc("recalculate_security_review_workspace", {
    p_workspace_id: workspaceId,
  });

  await supabase
    .from("security_review_workspaces")
    .update({
      client_summary: clientSummary,
      overall_risk: risk,
      review_stage: stage,
    })
    .eq("id", workspaceId);
}

export async function createManualWorkspaceAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const targetUrl = clean(formData.get("targetUrl"));
  const clientName = clean(formData.get("clientName"));
  const clientEmail = clean(formData.get("clientEmail"));
  const businessType = clean(formData.get("businessType"), "general-business");
  const reviewType = safeChoice(
    clean(formData.get("reviewType"), "website-security-review"),
    [
      "website-security-review",
      "advanced-security-review",
      "customer-data-safety-review",
      "ecommerce-security-review",
      "school-clinic-data-review",
      "managed-monitoring-review",
    ],
    "website-security-review",
  );

  if (!targetUrl) redirect("/reviews?message=Target URL is required");

  const { data: workspace, error } = await supabase
    .from("security_review_workspaces")
    .insert({
      user_id: user.id,
      title: `${clientName || "Client"} Security Review`,
      client_name: clientName || null,
      client_email: clientEmail || null,
      target_url: targetUrl,
      business_type: businessType,
      review_type: reviewType,
      status: "active",
      priority: "medium",
      review_stage: "intake",
      scope_summary:
        "Manual workspace created. Confirm authorization, scope, target pages and safe testing boundaries before deeper review.",
      executive_summary:
        "Security review workspace created. Add findings manually or sync from scanner after running authorized checks.",
      developer_summary:
        "Developer fixes will appear here after findings are added and triaged.",
      client_summary: "Security review is created and ready for scoping.",
    })
    .select("id")
    .single();

  if (error || !workspace?.id) {
    redirect(
      `/reviews?message=${encodeURIComponent(error?.message || "Could not create workspace")}`,
    );
  }

  await supabase.from("security_review_activity_events").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    event_type: "workspace-created",
    title: "Workspace created",
    details: "Manual security review workspace was created.",
    metadata: { targetUrl, reviewType },
  });

  revalidatePath("/reviews");
  redirect(
    `/reviews/${workspace.id}?message=${encodeURIComponent("Security review workspace created.")}`,
  );
}

export async function createWorkspaceFromScanAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const clientName = clean(formData.get("clientName"));
  const reviewType = safeChoice(
    clean(formData.get("reviewType"), "advanced-security-review"),
    [
      "website-security-review",
      "advanced-security-review",
      "customer-data-safety-review",
      "ecommerce-security-review",
      "school-clinic-data-review",
      "managed-monitoring-review",
    ],
    "advanced-security-review",
  );

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, website_id, organization_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: existing } = await supabase
    .from("security_review_workspaces")
    .select("id")
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.id) {
    redirect(
      `/reviews/${existing.id}?message=${encodeURIComponent("Existing workspace opened.")}`,
    );
  }

  const { data: workspace, error } = await supabase
    .from("security_review_workspaces")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      title: `${clientName || "Client"} Security Review`,
      client_name: clientName || null,
      target_url: scan.website_url,
      business_type: "client-website",
      review_type: reviewType,
      status: "active",
      priority: "medium",
      review_stage: "scope-confirmed",
      scope_summary:
        "Workspace created from an existing scan. Use authorized scanner sync, manual triage, developer fix tracking and retest proof.",
      executive_summary:
        "Security review workspace is ready for triage and bug lifecycle tracking.",
      developer_summary:
        "Developer fix items will be tracked by status and retest result.",
      client_summary:
        "Security review workspace created from your website scan.",
    })
    .select("id")
    .single();

  if (error || !workspace?.id) {
    redirect(
      `/report/${scan.id}/security-review-workspace?message=${encodeURIComponent(error?.message || "Could not create workspace")}`,
    );
  }

  await supabase.from("security_review_activity_events").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    event_type: "workspace-created",
    title: "Workspace created from scan",
    details: "Security review workspace was created from scan report.",
    metadata: { scanId: scan.id, targetUrl: scan.website_url },
  });

  revalidatePath(`/report/${scan.id}/security-review-workspace`);
  redirect(
    `/reviews/${workspace.id}?message=${encodeURIComponent("Security review workspace created.")}`,
  );
}

export async function syncScannerFindingsAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const workspaceId = clean(formData.get("workspaceId"));

  const { data: workspace } = await supabase
    .from("security_review_workspaces")
    .select("id, scan_id, organization_id, website_id, target_url")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!workspace) redirect("/reviews?message=Workspace not found");

  if (!workspace.scan_id) {
    redirect(
      `/reviews/${workspace.id}?message=${encodeURIComponent("This workspace is not linked to a scan yet.")}`,
    );
  }

  const { data: scannerRun } = await supabase
    .from("vulnerability_scanner_runs")
    .select("id")
    .eq("scan_id", workspace.scan_id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!scannerRun?.id) {
    redirect(
      `/reviews/${workspace.id}?message=${encodeURIComponent("Run Vulnerability Scanner first, then sync findings.")}`,
    );
  }

  const { data: findings } = await supabase
    .from("vulnerability_bug_findings")
    .select(
      "id, title, severity, bug_category, affected_url, evidence_summary, business_impact, customer_data_risk, developer_fix, retest_steps, lifecycle_status",
    )
    .eq("scanner_run_id", scannerRun.id)
    .eq("user_id", user.id)
    .limit(200);

  if (!findings?.length) {
    redirect(
      `/reviews/${workspace.id}?message=${encodeURIComponent("No scanner findings found to sync.")}`,
    );
  }

  const { data: existingItems } = await supabase
    .from("security_review_bug_items")
    .select("source_finding_id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id);

  const existingIds = new Set(
    (existingItems || [])
      .map((item: any) => item.source_finding_id)
      .filter(Boolean),
  );

  const rows = findings
    .filter((finding: any) => !existingIds.has(finding.id))
    .map((finding: any) => ({
      workspace_id: workspace.id,
      user_id: user.id,
      organization_id: workspace.organization_id,
      website_id: workspace.website_id,
      scan_id: workspace.scan_id,
      source_finding_id: finding.id,
      item_type: finding.bug_category?.toLowerCase().includes("customer")
        ? "customer-data-risk"
        : "bug",
      title: finding.title,
      severity: finding.severity || "Medium",
      priority:
        finding.severity === "Critical" || finding.severity === "High"
          ? "high"
          : "medium",
      lifecycle_status: finding.lifecycle_status || "open",
      owner_type: "developer",
      affected_url: finding.affected_url || workspace.target_url,
      evidence_summary: finding.evidence_summary || "",
      business_impact: finding.business_impact || "",
      customer_data_risk: finding.customer_data_risk || "",
      developer_fix: finding.developer_fix || "",
      retest_steps: finding.retest_steps || "",
      client_safe_note:
        "This issue is tracked for developer fix and retest verification.",
    }));

  if (rows.length) {
    await supabase.from("security_review_bug_items").insert(rows);
  }

  await supabase.from("security_review_activity_events").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    organization_id: workspace.organization_id,
    event_type: "scanner-findings-synced",
    title: "Scanner findings synced",
    details: `${rows.length} new scanner finding(s) synced into bug lifecycle dashboard.`,
    metadata: { scannerRunId: scannerRun.id, inserted: rows.length },
  });

  await recalculateWorkspace(supabase, workspace.id);

  revalidatePath(`/reviews/${workspace.id}`);
  redirect(
    `/reviews/${workspace.id}?message=${encodeURIComponent(`${rows.length} scanner finding(s) synced.`)}`,
  );
}

export async function addManualBugItemAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const workspaceId = clean(formData.get("workspaceId"));
  const title = clean(formData.get("title"));
  const severity = safeChoice(
    clean(formData.get("severity"), "Medium"),
    ["Critical", "High", "Medium", "Low", "Info"],
    "Medium",
  );
  const itemType = safeChoice(
    clean(formData.get("itemType"), "bug"),
    [
      "bug",
      "risk",
      "misconfiguration",
      "customer-data-risk",
      "trust-gap",
      "manual-task",
    ],
    "bug",
  );

  if (!title) redirect(`/reviews/${workspaceId}?message=Bug title is required`);

  const { data: workspace } = await supabase
    .from("security_review_workspaces")
    .select("id, organization_id, website_id, scan_id, target_url")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!workspace) redirect("/reviews?message=Workspace not found");

  const { data: item, error } = await supabase
    .from("security_review_bug_items")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      organization_id: workspace.organization_id,
      website_id: workspace.website_id,
      scan_id: workspace.scan_id,
      item_type: itemType,
      title,
      severity,
      priority:
        severity === "Critical" || severity === "High" ? "high" : "medium",
      lifecycle_status: "open",
      owner_type: safeChoice(
        clean(formData.get("ownerType"), "developer"),
        ["platform", "client", "developer", "expert-reviewer"],
        "developer",
      ),
      affected_url: clean(formData.get("affectedUrl"), workspace.target_url),
      evidence_summary: clean(
        formData.get("evidenceSummary"),
        "Manual review item added. Evidence should be verified before client-ready report.",
      ),
      business_impact: clean(
        formData.get("businessImpact"),
        "Business impact needs review.",
      ),
      customer_data_risk: clean(
        formData.get("customerDataRisk"),
        "Customer data risk needs review.",
      ),
      developer_fix: clean(
        formData.get("developerFix"),
        "Developer fix guidance needs review.",
      ),
      retest_steps: clean(
        formData.get("retestSteps"),
        "Retest after developer fix is applied.",
      ),
      client_safe_note: "Manual review item added for tracking.",
    })
    .select("id")
    .single();

  if (error || !item?.id) {
    redirect(
      `/reviews/${workspace.id}?message=${encodeURIComponent(error?.message || "Could not add item")}`,
    );
  }

  await supabase.from("security_review_activity_events").insert({
    workspace_id: workspace.id,
    bug_item_id: item.id,
    user_id: user.id,
    organization_id: workspace.organization_id,
    event_type: "manual-item-added",
    title: "Manual bug item added",
    details: title,
    metadata: { severity, itemType },
  });

  await recalculateWorkspace(supabase, workspace.id);

  revalidatePath(`/reviews/${workspace.id}`);
  redirect(
    `/reviews/${workspace.id}?message=${encodeURIComponent("Manual bug item added.")}`,
  );
}

export async function updateBugLifecycleStatusAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const workspaceId = clean(formData.get("workspaceId"));
  const itemId = clean(formData.get("itemId"));
  const status = safeChoice(
    clean(formData.get("lifecycleStatus"), "open"),
    [
      "open",
      "in-progress",
      "fixed-by-developer",
      "needs-retest",
      "verified-fixed",
      "accepted-risk",
      "false-positive",
    ],
    "open",
  );
  const reviewerNote = clean(formData.get("reviewerNote"));

  const updatePayload: Record<string, unknown> = {
    lifecycle_status: status,
    reviewer_note: reviewerNote,
  };

  if (status === "verified-fixed")
    updatePayload.verified_at = new Date().toISOString();

  const { data: item } = await supabase
    .from("security_review_bug_items")
    .update(updatePayload)
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .select("id, title")
    .single();

  if (!item) redirect(`/reviews/${workspaceId}?message=Could not update item`);

  await supabase.from("security_review_activity_events").insert({
    workspace_id: workspaceId,
    bug_item_id: item.id,
    user_id: user.id,
    event_type: "item-status-updated",
    title: "Bug lifecycle status updated",
    details: `${item.title} moved to ${status}.`,
    metadata: { status, reviewerNote },
  });

  await recalculateWorkspace(supabase, workspaceId);

  revalidatePath(`/reviews/${workspaceId}`);
  redirect(
    `/reviews/${workspaceId}?message=${encodeURIComponent("Bug status updated.")}`,
  );
}

export async function updateWorkspaceSummaryAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const workspaceId = clean(formData.get("workspaceId"));
  const status = safeChoice(
    clean(formData.get("status"), "active"),
    [
      "draft",
      "active",
      "waiting-for-client",
      "waiting-for-developer",
      "retest-needed",
      "completed",
      "paused",
      "cancelled",
    ],
    "active",
  );
  const priority = safeChoice(
    clean(formData.get("priority"), "medium"),
    ["low", "medium", "high", "urgent"],
    "medium",
  );
  const reviewStage = safeChoice(
    clean(formData.get("reviewStage"), "triage"),
    [
      "intake",
      "scope-confirmed",
      "scanning",
      "triage",
      "developer-fix",
      "retest",
      "client-approval",
      "completed",
    ],
    "triage",
  );

  await supabase
    .from("security_review_workspaces")
    .update({
      status,
      priority,
      review_stage: reviewStage,
      executive_summary: clean(formData.get("executiveSummary")),
      scope_summary: clean(formData.get("scopeSummary")),
      developer_summary: clean(formData.get("developerSummary")),
      client_summary: clean(formData.get("clientSummary")),
      internal_notes: clean(formData.get("internalNotes")),
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", workspaceId)
    .eq("user_id", user.id);

  await supabase.from("security_review_activity_events").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    event_type: "workspace-updated",
    title: "Workspace summary updated",
    details: "Workspace status, summaries or notes were updated.",
    metadata: { status, priority, reviewStage },
  });

  await recalculateWorkspace(supabase, workspaceId);

  revalidatePath(`/reviews/${workspaceId}`);
  redirect(
    `/reviews/${workspaceId}?message=${encodeURIComponent("Workspace updated.")}`,
  );
}
