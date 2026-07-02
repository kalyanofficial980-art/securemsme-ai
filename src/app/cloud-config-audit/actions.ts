"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  analyzeCloudConfig,
  cloudConfigBlockedClaims,
} from "@/lib/cloud-config-audit-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function checked(formData: FormData, key: string) {
  return clean(formData.get(key)) === "on";
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to use cloud config audit");
  return { supabase, user };
}

export async function createCloudConfigProjectAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const projectName = clean(formData.get("projectName"));
  const authorizationConfirmed = checked(formData, "authorizationConfirmed");

  if (!projectName)
    redirect("/cloud-config-audit?message=Project name is required.");
  if (!authorizationConfirmed)
    redirect(
      "/cloud-config-audit?message=Authorization confirmation is required.",
    );

  const { data: project, error } = await supabase
    .from("cloud_config_projects_v2")
    .insert({
      user_id: user.id,
      scan_id: clean(formData.get("scanId")) || null,
      project_name: projectName,
      production_domain: clean(formData.get("productionDomain")),
      supabase_project_ref: clean(formData.get("supabaseProjectRef")),
      vercel_project_name: clean(formData.get("vercelProjectName")),
      dns_provider: clean(formData.get("dnsProvider")),
      project_status: "active",
      authorization_confirmed: true,
      authorization_note: clean(formData.get("authorizationNote")),
      blocked_claims: cloudConfigBlockedClaims,
      project_payload: { manualChecklistFoundation: true },
    })
    .select("id")
    .single();

  if (error || !project?.id) {
    redirect(
      `/cloud-config-audit?message=${encodeURIComponent(error?.message || "Could not create cloud config project")}`,
    );
  }

  await supabase.from("cloud_config_admin_events_v2").insert({
    project_id: project.id,
    user_id: user.id,
    event_type: "project-created",
    severity: "Info",
    title: "Cloud config project created",
    details: `Cloud config project created: ${projectName}.`,
    metadata: { productionDomain: clean(formData.get("productionDomain")) },
  });

  revalidatePath("/cloud-config-audit");
  redirect(
    `/cloud-config-audit?project=${project.id}&message=Cloud config project created.`,
  );
}

export async function runCloudConfigAuditAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const projectId = clean(formData.get("projectId"));

  const { data: project } = await supabase
    .from("cloud_config_projects_v2")
    .select("id, scan_id, project_name, production_domain")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project?.id)
    redirect("/cloud-config-audit?message=Cloud config project not found.");

  const result = analyzeCloudConfig({
    productionDomain:
      project.production_domain || clean(formData.get("productionDomain")),
    supabaseSiteUrlSet: checked(formData, "supabaseSiteUrlSet"),
    supabaseRedirectUrlsRestricted: checked(
      formData,
      "supabaseRedirectUrlsRestricted",
    ),
    supabaseRlsEnabled: checked(formData, "supabaseRlsEnabled"),
    supabaseStoragePrivateByDefault: checked(
      formData,
      "supabaseStoragePrivateByDefault",
    ),
    supabaseServiceRoleNotClientExposed: checked(
      formData,
      "supabaseServiceRoleNotClientExposed",
    ),
    vercelEnvProductionSet: checked(formData, "vercelEnvProductionSet"),
    vercelPreviewSecretsSeparated: checked(
      formData,
      "vercelPreviewSecretsSeparated",
    ),
    vercelBuildLogsNoSecrets: checked(formData, "vercelBuildLogsNoSecrets"),
    dnsText: clean(formData.get("dnsText")),
    supportEmailReady: checked(formData, "supportEmailReady"),
    incidentProcessReady: checked(formData, "incidentProcessReady"),
  });

  const { data: run, error } = await supabase
    .from("cloud_config_audit_runs_v2")
    .insert({
      project_id: project.id,
      user_id: user.id,
      scan_id: project.scan_id || null,
      run_status: "completed",
      audit_scope: "supabase-vercel-dns",
      risk_score: result.riskScore,
      risk_level: result.riskLevel,
      passed_count: result.passedCount,
      warning_count: result.warningCount,
      failed_count: result.failedCount,
      manual_review_count: result.manualReviewCount,
      summary: result.summary,
      developer_action: result.developerAction,
      client_safe_summary: result.clientSafeSummary,
      audit_payload: { manualChecklist: true },
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !run?.id) {
    redirect(
      `/cloud-config-audit?project=${projectId}&message=${encodeURIComponent(error?.message || "Cloud audit failed")}`,
    );
  }

  if (result.checks.length) {
    await supabase.from("cloud_config_check_items_v2").insert(
      result.checks.map((item) => ({
        audit_run_id: run.id,
        project_id: project.id,
        user_id: user.id,
        category: item.category,
        check_key: item.checkKey,
        check_title: item.checkTitle,
        check_status: item.checkStatus,
        severity: item.severity,
        evidence_summary: item.evidenceSummary,
        remediation_action: item.remediationAction,
        client_safe_note: item.clientSafeNote,
        confidence_level: item.confidenceLevel,
        item_payload: { manualEvidence: true },
      })),
    );
  }

  if (result.dnsRecords.length) {
    await supabase.from("cloud_config_dns_records_v2").insert(
      result.dnsRecords.map((record) => ({
        audit_run_id: run.id,
        project_id: project.id,
        user_id: user.id,
        record_type: record.recordType,
        record_name: record.recordName,
        record_value_safe: record.recordValueSafe,
        record_status: record.recordStatus,
        security_purpose: record.securityPurpose,
        finding_summary: record.findingSummary,
        remediation_action: record.remediationAction,
        record_payload: { safeValueOnly: true },
      })),
    );
  }

  const remediationItems = result.checks
    .filter(
      (item) => item.checkStatus === "fail" || item.checkStatus === "warning",
    )
    .slice(0, 30);
  if (remediationItems.length) {
    await supabase.from("cloud_config_remediation_tasks_v2").insert(
      remediationItems.map((item) => ({
        audit_run_id: run.id,
        project_id: project.id,
        user_id: user.id,
        task_title: item.checkTitle,
        task_status: "open",
        priority:
          item.severity === "Critical"
            ? "Critical"
            : item.severity === "High"
              ? "High"
              : item.severity === "Medium"
                ? "Medium"
                : "Low",
        owner_role: item.category.startsWith("dns")
          ? "dns-admin"
          : item.category.startsWith("supabase") ||
              item.category.startsWith("vercel")
            ? "developer"
            : "admin",
        task_summary: item.evidenceSummary,
        safe_steps: item.remediationAction,
        verification_hint:
          "Re-run the cloud config audit after updating the setting.",
        due_note:
          item.severity === "Critical" || item.severity === "High"
            ? "Fix before public paid launch."
            : "Review before final launch.",
        task_payload: { sourceCheckKey: item.checkKey },
      })),
    );
  }

  await supabase
    .from("cloud_config_projects_v2")
    .update({
      latest_risk_score: result.riskScore,
      latest_risk_level: result.riskLevel,
      latest_summary: result.summary,
    })
    .eq("id", project.id)
    .eq("user_id", user.id);

  await supabase.from("cloud_config_admin_events_v2").insert({
    project_id: project.id,
    audit_run_id: run.id,
    user_id: user.id,
    event_type: "audit-created",
    severity: result.riskLevel,
    title: "Cloud config audit completed",
    details: result.summary,
    metadata: { riskScore: result.riskScore, failedCount: result.failedCount },
  });

  revalidatePath("/cloud-config-audit");
  redirect(
    `/cloud-config-audit?project=${project.id}&message=Cloud config audit completed.`,
  );
}

export async function updateCloudConfigTaskAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const taskId = clean(formData.get("taskId"));
  const status = clean(formData.get("taskStatus"), "in-progress");
  const projectId = clean(formData.get("projectId"));

  await supabase
    .from("cloud_config_remediation_tasks_v2")
    .update({ task_status: status })
    .eq("id", taskId)
    .eq("user_id", user.id);

  revalidatePath("/cloud-config-audit");
  redirect(
    `/cloud-config-audit?project=${projectId}&message=Cloud config task updated.`,
  );
}
