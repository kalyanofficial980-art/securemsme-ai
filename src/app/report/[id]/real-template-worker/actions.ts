"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PentestIntensity } from "@/lib/authorized-pentest-engine";
import { runRealSafeTemplateWorker } from "@/lib/real-safe-template-worker";
import { createClient } from "@/lib/supabase/server";

function normalizeIntensity(
  value: FormDataEntryValue | null,
): PentestIntensity {
  if (value === "light" || value === "deep") return value;
  return "standard";
}

export async function runRealTemplateWorkerForScan(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const intensity = normalizeIntensity(formData.get("intensity"));
  const permissionAccepted = formData.get("permissionAccepted") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to run safe templates");
  }

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/real-template-worker?message=${encodeURIComponent(
        "Please accept the authorization checkbox before running real safe templates.",
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
      `/report/${scan.id}/real-template-worker?message=${encodeURIComponent(
        "Save this website first before running real safe templates.",
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
      `/report/${scan.id}/real-template-worker?message=${encodeURIComponent(
        "Website verification and permission attestation are required before real safe templates.",
      )}`,
    );
  }

  const targetUrl = website?.url || scan.website_url;
  const workerReport = await runRealSafeTemplateWorker({
    targetUrl,
    intensity,
  });

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
        workerReport.privateTargetBlocked && workerReport.blockedTemplates > 0
          ? "blocked"
          : "completed",
      scope_summary: {
        targetUrl,
        hostname: workerReport.hostname,
        privateTargetBlocked: workerReport.privateTargetBlocked,
      },
      allowed_modules: ["real-safe-template-worker"],
      blocked_actions: workerReport.safetyBoundary,
      safety_policy: {
        intensity,
        allowedMethods: ["GET", "HEAD"],
        safetyBoundary: workerReport.safetyBoundary,
        sensitiveBodiesStored: false,
      },
      result_summary: {
        version: workerReport.version,
        totalTemplates: workerReport.totalTemplates,
        executedTemplates: workerReport.executedTemplates,
        matchedTemplates: workerReport.matchedTemplates,
        blockedTemplates: workerReport.blockedTemplates,
        observations: workerReport.observations.length,
        findings: workerReport.findings.length,
        customerSummary: workerReport.customerSummary,
      },
      total_modules: 1,
      completed_modules: workerReport.privateTargetBlocked ? 0 : 1,
      failed_modules: 0,
      blocked_modules: workerReport.privateTargetBlocked ? 1 : 0,
      permission_attested_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runError || !run?.id) {
    redirect(
      `/report/${scan.id}/real-template-worker?message=${encodeURIComponent(
        `Could not save real safe template run: ${runError?.message || "Unknown error"}`,
      )}`,
    );
  }

  await supabase.from("authorized_pentest_module_results").insert({
    run_id: run.id,
    user_id: user.id,
    website_id: scan.website_id,
    module_id: "real-safe-template-worker",
    module_name: "Real Safe Template Worker",
    module_category: "Safe Template Execution",
    intensity,
    status: workerReport.privateTargetBlocked ? "blocked" : "completed",
    requires_verified_scope: true,
    risk_level: "controlled",
    evidence: [
      `Target: ${workerReport.targetUrl}`,
      `Templates executed: ${workerReport.executedTemplates}`,
      `Findings: ${workerReport.findings.length}`,
      `Observations: ${workerReport.observations.length}`,
      `Sensitive bodies stored: false`,
    ],
    output_summary: {
      customerName: "Real safe template evidence",
      findings: workerReport.findings,
      observations: workerReport.observations,
      outputSummary: {
        version: workerReport.version,
        totalTemplates: workerReport.totalTemplates,
        executedTemplates: workerReport.executedTemplates,
        matchedTemplates: workerReport.matchedTemplates,
        blockedTemplates: workerReport.blockedTemplates,
        privateTargetBlocked: workerReport.privateTargetBlocked,
      },
    },
    safe_claim:
      "Can claim real safe template checks were executed on verified scope using GET/HEAD only.",
    blocked_claim:
      "Cannot claim exploitation, brute force, login bypass, data exposure, or full pentest coverage.",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  await supabase.from("authorized_pentest_events").insert({
    run_id: run.id,
    user_id: user.id,
    website_id: scan.website_id,
    event_type: workerReport.privateTargetBlocked ? "blocked" : "completed",
    title: workerReport.privateTargetBlocked
      ? "Real safe template worker blocked by safety guard"
      : "Real safe template worker completed",
    details: workerReport.customerSummary,
    metadata: {
      intensity,
      totalTemplates: workerReport.totalTemplates,
      executedTemplates: workerReport.executedTemplates,
      matchedTemplates: workerReport.matchedTemplates,
      blockedTemplates: workerReport.blockedTemplates,
      observations: workerReport.observations.length,
      findings: workerReport.findings.length,
    },
  });

  revalidatePath(`/report/${scan.id}/real-template-worker`);
  redirect(
    `/report/${scan.id}/real-template-worker?message=${encodeURIComponent(
      "Real safe template worker completed and evidence saved.",
    )}`,
  );
}
