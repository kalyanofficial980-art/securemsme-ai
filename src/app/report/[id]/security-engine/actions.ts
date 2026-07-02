"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildInternationalSecurityEnginePlan,
  buildJobModuleRows,
  type EngineIntensity,
} from "@/lib/international-security-engine";
import { createClient } from "@/lib/supabase/server";

function normalizeIntensity(value: FormDataEntryValue | null): EngineIntensity {
  if (value === "light" || value === "deep") return value;
  return "standard";
}

export async function createInternationalSecurityEngineJob(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const intensity = normalizeIntensity(formData.get("intensity"));
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to create security engine job");
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, website_url, score, risk_level, report")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    redirect("/dashboard?message=Scan not found");
  }

  let verifiedScope = false;
  let targetUrl = scan.website_url;

  if (scan.website_id) {
    const { data: website } = await supabase
      .from("websites")
      .select(
        "id, url, verification_status, deep_scan_enabled, permission_attested_at",
      )
      .eq("id", scan.website_id)
      .eq("user_id", user.id)
      .maybeSingle();

    targetUrl = website?.url || scan.website_url;
    verifiedScope = Boolean(
      website?.verification_status === "verified" &&
      website?.deep_scan_enabled &&
      website?.permission_attested_at,
    );
  }

  const plan = buildInternationalSecurityEnginePlan({
    targetUrl,
    intensity,
    verifiedScope,
    authenticatedScope: false,
    report: scan.report || {},
    hints: [scan.risk_level || "", String(scan.score || "")],
  });

  const { data: job, error: jobError } = await supabase
    .from("international_scan_jobs")
    .insert({
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      target_url: plan.targetUrl,
      job_type: "international-security-engine",
      status: "planned",
      intensity: plan.intensity,
      verified_scope: plan.verifiedScope,
      app_classification: plan.classification,
      selected_modules: plan.selectedModules.map((module) => ({
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        category: module.category,
        stage: module.stage,
        requiredScope: module.requiredScope,
      })),
      blocked_modules: plan.blockedModules.map((module) => ({
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        category: module.category,
        requiredScope: module.requiredScope,
        blockedReason: module.blockedReason,
      })),
      coverage_matrix: plan.coverageMatrix,
      risk_summary: plan.riskSummary,
      standards_summary: plan.standardsSummary,
      safety_policy: plan.safetyPolicy,
      execution_context: plan.executionContext,
      coverage_score: plan.coverageMatrix.coverageScore,
      evidence_count: plan.riskSummary.evidenceCount,
      vulnerability_count: plan.riskSummary.vulnerabilityCount,
      high_priority_count: plan.riskSummary.highPriorityCount,
      planned_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job?.id) {
    redirect(
      `/report/${scan.id}/security-engine?message=${encodeURIComponent(
        `Could not create international security engine job: ${jobError?.message || "Unknown error"}`,
      )}`,
    );
  }

  const moduleRows = buildJobModuleRows({
    jobId: job.id,
    userId: user.id,
    websiteId: scan.website_id,
    modules: plan.selectedModules,
  });

  if (moduleRows.length) {
    await supabase.from("international_scan_job_modules").insert(moduleRows);
  }

  if (plan.normalizedEvidenceSeeds.length) {
    await supabase.from("normalized_security_evidence").insert(
      plan.normalizedEvidenceSeeds.map((evidence) => ({
        job_id: job.id,
        user_id: user.id,
        website_id: scan.website_id,
        source_scan_id: scan.id,
        evidence_key: evidence.evidenceKey,
        source_module: evidence.sourceModule,
        affected_asset: evidence.affectedAsset,
        asset_type: evidence.assetType,
        proof_type: evidence.proofType,
        severity: evidence.severity,
        confidence: evidence.confidence,
        false_positive_risk: evidence.falsePositiveRisk,
        title: evidence.title,
        observed_value: evidence.observedValue,
        expected_value: evidence.expectedValue,
        evidence_summary: evidence.evidenceSummary,
        business_impact: evidence.businessImpact,
        developer_fix: evidence.developerFix,
        safe_claim: evidence.safeClaim,
        blocked_claim: evidence.blockedClaim,
        standards: evidence.standards,
        raw_metadata: evidence.rawMetadata,
      })),
    );
  }

  if (plan.vulnerabilitySeeds.length) {
    await supabase.from("vulnerability_instances").insert(
      plan.vulnerabilitySeeds.map((vulnerability) => ({
        job_id: job.id,
        user_id: user.id,
        website_id: scan.website_id,
        source_scan_id: scan.id,
        vulnerability_key: vulnerability.vulnerabilityKey,
        title: vulnerability.title,
        category: vulnerability.category,
        severity: vulnerability.severity,
        confidence: vulnerability.confidence,
        exploitability_score: vulnerability.exploitabilityScore,
        business_impact_score: vulnerability.businessImpactScore,
        priority_score: vulnerability.priorityScore,
        lifecycle_status: "detected",
        affected_assets: vulnerability.affectedAssets,
        evidence_ids: [],
        standards: vulnerability.standards,
        business_impact: vulnerability.businessImpact,
        developer_fix: vulnerability.developerFix,
        verification_guidance: vulnerability.verificationGuidance,
        safe_claim: vulnerability.safeClaim,
        blocked_claim: vulnerability.blockedClaim,
      })),
    );
  }

  await supabase.from("international_scan_job_events").insert([
    {
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id,
      event_type: "planned",
      title: "International security engine job planned",
      details: plan.riskSummary.customerSummary,
      metadata: {
        intensity: plan.intensity,
        siteType: plan.classification.siteType,
        selectedModules: plan.selectedModules.length,
        blockedModules: plan.blockedModules.length,
        coverageScore: plan.coverageMatrix.coverageScore,
      },
    },
    ...plan.selectedModules.slice(0, 10).map((module) => ({
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id,
      event_type: "module-selected",
      title: `Module selected: ${module.moduleName}`,
      details: `${module.category} · ${module.requiredScope}`,
      metadata: {
        moduleId: module.moduleId,
        stage: module.stage,
        standards: module.standards,
      },
    })),
    ...plan.blockedModules.slice(0, 10).map((module) => ({
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id,
      event_type: "module-blocked",
      title: `Module blocked: ${module.moduleName}`,
      details: module.blockedReason,
      metadata: {
        moduleId: module.moduleId,
        requiredScope: module.requiredScope,
      },
    })),
  ]);

  revalidatePath(`/report/${scan.id}/security-engine`);
  redirect(
    `/report/${scan.id}/security-engine?message=${encodeURIComponent(
      "International security engine job created with module pipeline, coverage matrix, normalized evidence, and lifecycle seeds.",
    )}`,
  );
}
