"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  analyzeDependencies,
  analyzeSecrets,
  combineRepoRisk,
  repoSecurityBlockedClaims,
} from "@/lib/repo-dependency-secrets-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to use repo security");
  return { supabase, user };
}

export async function createRepoSecurityProjectAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const projectName = clean(formData.get("projectName"));
  const repoUrl = clean(formData.get("repoUrl"));
  const authorizationConfirmed =
    clean(formData.get("authorizationConfirmed")) === "on";

  if (!projectName)
    redirect("/repo-security?message=Project name is required.");
  if (!authorizationConfirmed)
    redirect("/repo-security?message=Authorization confirmation is required.");

  const { data: project, error } = await supabase
    .from("repo_security_projects_v2")
    .insert({
      user_id: user.id,
      scan_id: clean(formData.get("scanId")) || null,
      project_name: projectName,
      repo_url: repoUrl,
      repo_provider: repoUrl.includes("github.com")
        ? "github"
        : repoUrl
          ? "other"
          : "manual",
      default_branch: clean(formData.get("defaultBranch"), "main"),
      project_status: "active",
      authorization_confirmed: true,
      authorization_note: clean(formData.get("authorizationNote")),
      blocked_claims: repoSecurityBlockedClaims,
      project_payload: { manualInputFoundation: true },
    })
    .select("id")
    .single();

  if (error || !project?.id) {
    redirect(
      `/repo-security?message=${encodeURIComponent(error?.message || "Could not create repo project")}`,
    );
  }

  await supabase.from("repo_security_events_v2").insert({
    project_id: project.id,
    user_id: user.id,
    event_type: "project-created",
    severity: "Info",
    title: "Repository security project created",
    details: `Project created: ${projectName}.`,
    metadata: { repoUrl },
  });

  revalidatePath("/repo-security");
  redirect(
    `/repo-security?project=${project.id}&message=Repository security project created.`,
  );
}

export async function runRepoSecurityScanAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const projectId = clean(formData.get("projectId"));
  const packageManifest = clean(formData.get("packageManifest"));
  const secretScanText = clean(formData.get("secretScanText"));

  const { data: project } = await supabase
    .from("repo_security_projects_v2")
    .select("id, scan_id, project_name, repo_url")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project?.id)
    redirect("/repo-security?message=Repository project not found.");
  if (!packageManifest && !secretScanText)
    redirect(
      `/repo-security?project=${projectId}&message=Paste package.json or code/env text to scan.`,
    );

  const dependency = analyzeDependencies(packageManifest);
  const secret = analyzeSecrets(secretScanText);
  const combined = combineRepoRisk(dependency, secret);

  const { data: depRun, error: depError } = await supabase
    .from("repo_dependency_scan_runs_v2")
    .insert({
      project_id: project.id,
      user_id: user.id,
      scan_id: project.scan_id || null,
      run_status: "completed",
      manifest_type: dependency.manifestType,
      dependency_count: dependency.dependencyCount,
      risky_dependency_count: dependency.riskyDependencyCount,
      outdated_signal_count: dependency.outdatedSignalCount,
      dependency_risk_score: dependency.dependencyRiskScore,
      dependency_risk_level: dependency.dependencyRiskLevel,
      summary: dependency.summary,
      developer_action: dependency.developerAction,
      client_safe_summary: dependency.clientSafeSummary,
      raw_manifest_hash: packageManifest ? String(packageManifest.length) : "",
      run_payload: { safeHeuristicReview: true },
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (depError || !depRun?.id) {
    redirect(
      `/repo-security?project=${projectId}&message=${encodeURIComponent(depError?.message || "Dependency scan failed")}`,
    );
  }

  if (dependency.items.length) {
    await supabase.from("repo_dependency_items_v2").insert(
      dependency.items.slice(0, 100).map((item) => ({
        dependency_run_id: depRun.id,
        project_id: project.id,
        user_id: user.id,
        package_name: item.packageName,
        current_version: item.currentVersion,
        dependency_scope: item.dependencyScope,
        risk_level: item.riskLevel,
        risk_reason: item.riskReason,
        safe_fix: item.safeFix,
        confidence_level: item.confidenceLevel,
        item_status: item.riskLevel === "Info" ? "fixed" : "open",
        item_payload: { heuristic: true },
      })),
    );
  }

  const { data: secretRun, error: secretError } = await supabase
    .from("repo_secret_scan_runs_v2")
    .insert({
      project_id: project.id,
      user_id: user.id,
      scan_id: project.scan_id || null,
      run_status: "completed",
      scanned_text_hash: secretScanText ? String(secretScanText.length) : "",
      scanned_line_count: secret.scannedLineCount,
      secret_signal_count: secret.secretSignalCount,
      high_confidence_secret_count: secret.highConfidenceSecretCount,
      secret_risk_score: secret.secretRiskScore,
      secret_risk_level: secret.secretRiskLevel,
      summary: secret.summary,
      developer_action: secret.developerAction,
      client_safe_summary: secret.clientSafeSummary,
      run_payload: { rawSecretsStored: false },
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (secretError || !secretRun?.id) {
    redirect(
      `/repo-security?project=${projectId}&message=${encodeURIComponent(secretError?.message || "Secret scan failed")}`,
    );
  }

  if (secret.findings.length) {
    await supabase.from("repo_secret_findings_v2").insert(
      secret.findings.slice(0, 100).map((finding) => ({
        secret_run_id: secretRun.id,
        project_id: project.id,
        user_id: user.id,
        secret_type: finding.secretType,
        masked_value: finding.maskedValue,
        file_hint: "manual-input",
        line_number: finding.lineNumber,
        risk_level: finding.riskLevel,
        confidence_level: finding.confidenceLevel,
        evidence_summary: finding.evidenceSummary,
        developer_action: finding.developerAction,
        finding_status: "open",
        finding_payload: { rawSecretStored: false },
      })),
    );
  }

  await supabase
    .from("repo_security_projects_v2")
    .update({
      latest_risk_score: combined.latestRiskScore,
      latest_risk_level: combined.latestRiskLevel,
      latest_summary: combined.latestSummary,
    })
    .eq("id", project.id)
    .eq("user_id", user.id);

  const shouldAlert =
    combined.latestRiskLevel === "Critical" ||
    combined.latestRiskLevel === "High" ||
    secret.secretSignalCount > 0;
  if (shouldAlert) {
    await supabase.from("repo_security_alerts_v2").insert({
      project_id: project.id,
      user_id: user.id,
      scan_id: project.scan_id || null,
      alert_type:
        secret.secretSignalCount > 0 ? "secret-risk" : "dependency-risk",
      alert_status: "open",
      severity: combined.latestRiskLevel,
      alert_title: `${combined.latestRiskLevel} repository security alert`,
      alert_body: combined.latestSummary,
      client_safe_summary:
        "Repository security review found items that should be reviewed before client-safe claims are made.",
      developer_action:
        secret.secretSignalCount > 0
          ? secret.developerAction
          : dependency.developerAction,
      alert_payload: {
        dependencyRunId: depRun.id,
        secretRunId: secretRun.id,
      },
    });
  }

  await supabase.from("repo_security_events_v2").insert([
    {
      project_id: project.id,
      user_id: user.id,
      event_type: "dependency-scan-created",
      severity: dependency.dependencyRiskLevel,
      title: "Dependency scan completed",
      details: dependency.summary,
      metadata: { runId: depRun.id },
    },
    {
      project_id: project.id,
      user_id: user.id,
      event_type: "secret-scan-created",
      severity: secret.secretRiskLevel,
      title: "Secret scan completed",
      details: secret.summary,
      metadata: { runId: secretRun.id },
    },
  ]);

  revalidatePath("/repo-security");
  redirect(
    `/repo-security?project=${project.id}&message=Repository security scan completed.`,
  );
}

export async function updateRepoSecretFindingStatusAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const findingId = clean(formData.get("findingId"));
  const status = clean(formData.get("findingStatus"), "needs-review");
  const projectId = clean(formData.get("projectId"));

  await supabase
    .from("repo_secret_findings_v2")
    .update({ finding_status: status })
    .eq("id", findingId)
    .eq("user_id", user.id);

  await supabase.from("repo_security_events_v2").insert({
    project_id: projectId || null,
    user_id: user.id,
    event_type: "finding-updated",
    severity: status === "rotated" || status === "revoked" ? "Info" : "Medium",
    title: "Secret finding status updated",
    details: `Finding status changed to ${status}.`,
    metadata: { findingId, status },
  });

  revalidatePath("/repo-security");
  redirect(
    `/repo-security?project=${projectId}&message=Secret finding status updated.`,
  );
}
