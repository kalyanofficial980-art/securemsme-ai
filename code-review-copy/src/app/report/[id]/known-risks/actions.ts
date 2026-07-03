"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildCveIntelligenceReport } from "@/lib/cve-intelligence";
import { createClient } from "@/lib/supabase/server";

export async function saveKnownRiskReview(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to save known risk review");
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

  const report = buildCveIntelligenceReport({
    websiteUrl: scan.website_url,
    report: (scan.report || {}) as Record<string, unknown>,
  });

  if (!report.insights.length) {
    redirect(
      `/report/${scan.id}/known-risks?message=${encodeURIComponent(
        "No detected technology risks were found to save.",
      )}`,
    );
  }

  await supabase.from("cve_insight_records").insert(
    report.insights.slice(0, 50).map((item) => ({
      user_id: user.id,
      website_id: scan.website_id || null,
      scan_id: scan.id,
      technology_name: item.technologyName,
      technology_family: item.technologyFamily,
      detected_version: item.detectedVersion,
      version_confidence: item.versionConfidence,
      risk_title: item.riskTitle,
      risk_category: item.riskCategory,
      severity: item.severity,
      confidence: item.confidence,
      status: item.status,
      evidence: item.evidence,
      customer_explanation: item.customerExplanation,
      developer_recommendation: item.developerRecommendation,
      safe_claim: item.safeClaim,
      blocked_claim: item.blockedClaim,
      cve_certainty_rule: item.cveCertaintyRule,
    })),
  );

  revalidatePath(`/report/${scan.id}/known-risks`);
  redirect(
    `/report/${scan.id}/known-risks?message=${encodeURIComponent(
      "Known technology risk review saved.",
    )}`,
  );
}
