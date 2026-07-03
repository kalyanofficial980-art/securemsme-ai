"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildReportTruthCleanup } from "@/lib/report-truth-cleanup-engine";
import { createClient } from "@/lib/supabase/server";

export async function generateReportTruthCleanup(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to generate report cleanup");

  const { data: scan } = await supabase
    .from("scans")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const cleanup = buildReportTruthCleanup(scan);

  const { data: review, error: reviewError } = await supabase
    .from("report_truth_reviews")
    .insert({
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      website_url: scan.website_url,
      engine_version: cleanup.engineVersion,
      review_status: cleanup.truthWarnings.some(
        (warning) => warning.severity === "High",
      )
        ? "completed-with-warnings"
        : "completed",
      truth_score: cleanup.truthScore,
      fake_risk_level: cleanup.fakeRiskLevel,
      generic_text_count: cleanup.genericTextCount,
      repeated_fix_count: cleanup.repeatedFixCount,
      missing_evidence_count: cleanup.missingEvidenceCount,
      cleaned_fix_count: cleanup.cleanedFixCount,
      manual_review_count: cleanup.manualReviewCount,
      review_summary: cleanup.reviewSummary,
      cleaned_report: cleanup.cleanedReport,
      truth_warnings: cleanup.truthWarnings,
      customer_safe_claims: cleanup.customerSafeClaims,
      blocked_claims: cleanup.blockedClaims,
    })
    .select("id")
    .single();

  if (reviewError || !review?.id) {
    redirect(
      `/report/${scan.id}/truth-cleanup?message=${encodeURIComponent(
        `Could not save truth cleanup: ${reviewError?.message || "Unknown error"}`,
      )}`,
    );
  }

  if (cleanup.cleanedReport.cleanedFixes.length) {
    await supabase.from("report_truth_fix_items").insert(
      cleanup.cleanedReport.cleanedFixes.slice(0, 200).map((item) => ({
        review_id: review.id,
        user_id: user.id,
        website_id: scan.website_id,
        source_scan_id: scan.id,
        issue_key: item.issueKey,
        category: item.category,
        title: item.title,
        severity: item.severity,
        confidence: item.confidence,
        evidence_status: item.evidenceStatus,
        original_text: item.originalText,
        evidence_summary: item.evidenceSummary,
        why_it_matters: item.whyItMatters,
        exact_developer_fix: item.exactDeveloperFix,
        validation_steps: item.validationSteps,
        safe_customer_wording: item.safeCustomerWording,
        cannot_claim: item.cannotClaim,
        source_module: item.sourceModule,
        standards: item.standards,
        raw_metadata: item.rawMetadata,
      })),
    );
  }

  revalidatePath(`/report/${scan.id}/truth-cleanup`);
  redirect(
    `/report/${scan.id}/truth-cleanup?message=${encodeURIComponent(
      "Report truth cleanup generated. Use cleaned evidence-specific fixes instead of old generic text.",
    )}`,
  );
}
