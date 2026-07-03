"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PentestIntensity } from "@/lib/authorized-pentest-engine";
import { runCmsWordPressScanner } from "@/lib/cms-wordpress-scanner";
import { createClient } from "@/lib/supabase/server";

function normalizeIntensity(
  value: FormDataEntryValue | null,
): PentestIntensity {
  if (value === "light" || value === "deep") return value;
  return "standard";
}

export async function runCmsWordPressScannerForScan(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const intensity = normalizeIntensity(formData.get("intensity"));
  const permissionAccepted = formData.get("permissionAccepted") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to run CMS scanner");
  }

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/cms-wordpress?message=${encodeURIComponent(
        "Please accept the authorization checkbox before running CMS/WordPress scanner.",
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
      `/report/${scan.id}/cms-wordpress?message=${encodeURIComponent(
        "Save this website first before running CMS/WordPress scanner.",
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
      `/report/${scan.id}/cms-wordpress?message=${encodeURIComponent(
        "Website verification and permission attestation are required before CMS/WordPress scanner.",
      )}`,
    );
  }

  const targetUrl = website?.url || scan.website_url;
  const scannerReport = await runCmsWordPressScanner({ targetUrl, intensity });

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
        scannerReport.privateTargetBlocked && scannerReport.findings.length > 0
          ? "blocked"
          : "completed",
      scope_summary: {
        targetUrl,
        hostname: scannerReport.hostname,
        privateTargetBlocked: scannerReport.privateTargetBlocked,
        wordpressDetected: scannerReport.wordpressDetected,
        woocommerceDetected: scannerReport.woocommerceDetected,
      },
      allowed_modules: ["cms-wordpress-deep-risk-scanner"],
      blocked_actions: scannerReport.safetyBoundary,
      safety_policy: {
        intensity,
        allowedMethods: ["GET", "HEAD"],
        safetyBoundary: scannerReport.safetyBoundary,
        userEndpointBodiesStored: false,
        sensitiveBodiesStored: false,
      },
      result_summary: {
        version: scannerReport.version,
        wordpressDetected: scannerReport.wordpressDetected,
        woocommerceDetected: scannerReport.woocommerceDetected,
        pluginSignals: scannerReport.pluginSignals.length,
        themeSignals: scannerReport.themeSignals.length,
        versionSignals: scannerReport.versionSignals.length,
        observations: scannerReport.observations.length,
        findings: scannerReport.findings.length,
        highPriorityFindings: scannerReport.highPriorityFindings,
        customerSummary: scannerReport.customerSummary,
      },
      total_modules: 1,
      completed_modules: scannerReport.privateTargetBlocked ? 0 : 1,
      failed_modules: 0,
      blocked_modules: scannerReport.privateTargetBlocked ? 1 : 0,
      permission_attested_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runError || !run?.id) {
    redirect(
      `/report/${scan.id}/cms-wordpress?message=${encodeURIComponent(
        `Could not save CMS/WordPress scanner run: ${runError?.message || "Unknown error"}`,
      )}`,
    );
  }

  await supabase.from("authorized_pentest_module_results").insert({
    run_id: run.id,
    user_id: user.id,
    website_id: scan.website_id,
    module_id: "cms-wordpress-deep-risk-scanner",
    module_name: "CMS/WordPress Deep Risk Scanner",
    module_category: "CMS Security",
    intensity,
    status: scannerReport.privateTargetBlocked ? "blocked" : "completed",
    requires_verified_scope: true,
    risk_level: "controlled",
    evidence: [
      `Target: ${scannerReport.targetUrl}`,
      `WordPress detected: ${scannerReport.wordpressDetected}`,
      `WooCommerce detected: ${scannerReport.woocommerceDetected}`,
      `Plugin signals: ${scannerReport.pluginSignals.length}`,
      `Theme signals: ${scannerReport.themeSignals.length}`,
      `Findings: ${scannerReport.findings.length}`,
      `User endpoint bodies stored: false`,
      `Sensitive bodies stored: false`,
    ],
    output_summary: {
      customerName: "CMS/WordPress deep risk evidence",
      findings: scannerReport.findings,
      observations: scannerReport.observations,
      pluginSignals: scannerReport.pluginSignals,
      themeSignals: scannerReport.themeSignals,
      versionSignals: scannerReport.versionSignals,
      developerHardeningChecklist: scannerReport.developerHardeningChecklist,
      outputSummary: {
        version: scannerReport.version,
        wordpressDetected: scannerReport.wordpressDetected,
        woocommerceDetected: scannerReport.woocommerceDetected,
        highPriorityFindings: scannerReport.highPriorityFindings,
        privateTargetBlocked: scannerReport.privateTargetBlocked,
      },
    },
    safe_claim:
      "Can claim CMS/WordPress public risk signals were reviewed on verified scope using GET/HEAD only.",
    blocked_claim:
      "Cannot claim exploitation, credential weakness, login bypass, data exposure, or full pentest coverage.",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  await supabase.from("authorized_pentest_events").insert({
    run_id: run.id,
    user_id: user.id,
    website_id: scan.website_id,
    event_type: scannerReport.privateTargetBlocked ? "blocked" : "completed",
    title: scannerReport.privateTargetBlocked
      ? "CMS/WordPress scanner blocked by safety guard"
      : "CMS/WordPress scanner completed",
    details: scannerReport.customerSummary,
    metadata: {
      intensity,
      wordpressDetected: scannerReport.wordpressDetected,
      woocommerceDetected: scannerReport.woocommerceDetected,
      pluginSignals: scannerReport.pluginSignals.length,
      themeSignals: scannerReport.themeSignals.length,
      observations: scannerReport.observations.length,
      findings: scannerReport.findings.length,
    },
  });

  revalidatePath(`/report/${scan.id}/cms-wordpress`);
  redirect(
    `/report/${scan.id}/cms-wordpress?message=${encodeURIComponent(
      "CMS/WordPress scanner completed and evidence saved.",
    )}`,
  );
}
