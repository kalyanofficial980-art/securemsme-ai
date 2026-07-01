"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runRealSecurityModules } from "@/lib/real-security-modules";
import type { PentestIntensity } from "@/lib/authorized-pentest-engine";
import { createClient } from "@/lib/supabase/server";

function normalizeIntensity(
  value: FormDataEntryValue | null,
): PentestIntensity {
  if (value === "light" || value === "deep") return value;
  return "standard";
}

export async function runRealModulesForScan(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const intensity = normalizeIntensity(formData.get("intensity"));
  const permissionAccepted = formData.get("permissionAccepted") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to run real security modules");
  }

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/real-modules?message=${encodeURIComponent(
        "Please accept the authorization checkbox before running real modules.",
      )}`,
    );
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, website_url")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    redirect("/dashboard?message=Scan not found");
  }

  if (!scan.website_id) {
    redirect(
      `/report/${scan.id}/real-modules?message=${encodeURIComponent(
        "Save this website first before running real modules.",
      )}`,
    );
  }

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, user_id, url, verification_status, deep_scan_enabled, permission_attested_at",
    )
    .eq("id", scan.website_id)
    .eq("user_id", user.id)
    .single();

  const verifiedScope = Boolean(
    website?.verification_status === "verified" &&
    website?.deep_scan_enabled &&
    website?.permission_attested_at,
  );

  if (!verifiedScope) {
    redirect(
      `/report/${scan.id}/real-modules?message=${encodeURIComponent(
        "Website verification and permission attestation are required before real modules.",
      )}`,
    );
  }

  const targetUrl = website?.url || scan.website_url;
  const moduleReport = await runRealSecurityModules({ targetUrl, intensity });

  const { data: run, error: runError } = await supabase
    .from("authorized_pentest_runs")
    .insert({
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      target_url: targetUrl,
      authorization_status: "verified-permission",
      intensity,
      status:
        moduleReport.blockedModules > 0 && moduleReport.completedModules === 0
          ? "blocked"
          : "completed",
      scope_summary: {
        targetUrl,
        hostname: moduleReport.hostname,
        allowedMethods: moduleReport.allowedMethods,
        privateTargetBlocked: moduleReport.privateTargetBlocked,
      },
      allowed_modules: moduleReport.results.map((result) => result.moduleId),
      blocked_actions: moduleReport.safetyBoundary,
      safety_policy: {
        intensity,
        allowedMethods: moduleReport.allowedMethods,
        safetyBoundary: moduleReport.safetyBoundary,
      },
      result_summary: {
        version: moduleReport.version,
        completedModules: moduleReport.completedModules,
        failedModules: moduleReport.failedModules,
        blockedModules: moduleReport.blockedModules,
        highPriorityFindings: moduleReport.highPriorityFindings,
        customerSummary: moduleReport.customerSummary,
      },
      total_modules: moduleReport.totalModules,
      completed_modules: moduleReport.completedModules,
      failed_modules: moduleReport.failedModules,
      blocked_modules: moduleReport.blockedModules,
      permission_attested_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runError || !run?.id) {
    redirect(
      `/report/${scan.id}/real-modules?message=${encodeURIComponent(
        `Could not save real module run: ${runError?.message || "Unknown error"}`,
      )}`,
    );
  }

  await supabase.from("authorized_pentest_module_results").insert(
    moduleReport.results.map((result) => ({
      run_id: run.id,
      user_id: user.id,
      website_id: scan.website_id,
      module_id: result.moduleId,
      module_name: result.moduleName,
      module_category: result.category,
      intensity,
      status: result.status,
      requires_verified_scope: true,
      risk_level: result.riskLevel,
      evidence: result.evidence,
      output_summary: {
        customerName: result.customerName,
        findings: result.findings,
        outputSummary: result.outputSummary,
      },
      safe_claim: result.safeClaim,
      blocked_claim: result.blockedClaim,
      error_message: result.errorMessage || null,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })),
  );

  await supabase.from("authorized_pentest_events").insert({
    run_id: run.id,
    user_id: user.id,
    website_id: scan.website_id,
    event_type: moduleReport.privateTargetBlocked ? "blocked" : "completed",
    title: moduleReport.privateTargetBlocked
      ? "Real modules blocked by safety guard"
      : "Real security modules completed",
    details: moduleReport.customerSummary,
    metadata: {
      intensity,
      completedModules: moduleReport.completedModules,
      failedModules: moduleReport.failedModules,
      blockedModules: moduleReport.blockedModules,
      highPriorityFindings: moduleReport.highPriorityFindings,
    },
  });

  revalidatePath(`/report/${scan.id}/real-modules`);
  redirect(
    `/report/${scan.id}/real-modules?message=${encodeURIComponent(
      "Real backend security modules completed and evidence saved.",
    )}`,
  );
}
