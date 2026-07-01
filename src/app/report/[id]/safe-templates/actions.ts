"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runSafeTemplateEngine } from "@/lib/safe-template-engine";
import { createClient } from "@/lib/supabase/server";

export async function runSafeTemplatesForScan(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to run safe templates");
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, website_url, report")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    redirect("/dashboard?message=Scan not found");
  }

  let verifiedScope = false;

  if (scan.website_id) {
    const { data: website } = await supabase
      .from("websites")
      .select("verification_status, deep_scan_enabled, permission_attested_at")
      .eq("id", scan.website_id)
      .eq("user_id", user.id)
      .maybeSingle();

    verifiedScope = Boolean(
      website?.verification_status === "verified" &&
      website?.deep_scan_enabled &&
      website?.permission_attested_at,
    );
  }

  const templateReport = runSafeTemplateEngine({
    websiteUrl: scan.website_url,
    report: (scan.report || {}) as Record<string, unknown>,
    verifiedScope,
  });

  const { data: job, error: jobError } = await supabase
    .from("security_tool_jobs")
    .insert({
      user_id: user.id,
      website_id: scan.website_id || null,
      scan_id: scan.id,
      job_type: "safe-template-engine",
      tool_mode: verifiedScope ? "verified-passive" : "safe-passive",
      status: "completed",
      requested_tools: ["safe-template-runner"],
      safe_boundary: templateReport.safeBoundary,
      result_summary: {
        version: templateReport.version,
        totalTemplates: templateReport.totalTemplates,
        executedTemplates: templateReport.executedTemplates,
        matchedTemplates: templateReport.matchedTemplates,
        blockedTemplates: templateReport.blockedTemplates,
        normalizedEvidence: templateReport.normalizedEvidence.length,
      },
      total_tools: 1,
      completed_tools: 1,
      failed_tools: 0,
      blocked_tools: templateReport.blockedTemplates,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job?.id) {
    redirect(
      `/report/${scan.id}/safe-templates?message=${encodeURIComponent(
        `Could not create safe template job: ${jobError?.message || "Unknown error"}`,
      )}`,
    );
  }

  const { data: run } = await supabase
    .from("security_tool_runs")
    .insert({
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id || null,
      scan_id: scan.id,
      tool_id: "safe-template-runner",
      tool_name: "Safe Template Runner",
      tool_category: "Template engine",
      tool_mode: verifiedScope ? "verified-passive" : "safe-passive",
      status: "completed",
      requires_verification: false,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      output_summary: {
        totalTemplates: templateReport.totalTemplates,
        executedTemplates: templateReport.executedTemplates,
        matchedTemplates: templateReport.matchedTemplates,
        blockedTemplates: templateReport.blockedTemplates,
        manualReviewTemplates: templateReport.manualReviewTemplates,
      },
      evidence_count: templateReport.normalizedEvidence.length,
      safe_boundary: templateReport.safeBoundary,
    })
    .select("id")
    .single();

  if (templateReport.normalizedEvidence.length) {
    await supabase.from("security_tool_evidence").insert(
      templateReport.normalizedEvidence.slice(0, 80).map((item) => ({
        job_id: job.id,
        run_id: run?.id || null,
        user_id: user.id,
        website_id: scan.website_id || null,
        scan_id: scan.id,
        source_tool_id: item.sourceToolId,
        source_tool_name: item.sourceToolName,
        evidence_type: item.evidenceType,
        title: item.title,
        category: item.category,
        severity: item.severity,
        status: item.status,
        confidence: item.confidence,
        false_positive_risk: item.falsePositiveRisk,
        raw_evidence: item.rawEvidence,
        normalized_evidence: item.normalizedEvidence,
        claim_control: item.claimControl,
      })),
    );
  }

  revalidatePath(`/report/${scan.id}/safe-templates`);
  redirect(
    `/report/${scan.id}/safe-templates?message=${encodeURIComponent(
      "Safe templates executed and evidence saved.",
    )}`,
  );
}
