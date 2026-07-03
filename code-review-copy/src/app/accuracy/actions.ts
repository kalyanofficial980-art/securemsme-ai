"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assessFindingAccuracy } from "@/lib/advanced-finding-taxonomy";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function allowed(value: string, choices: string[], fallback: string) {
  return choices.includes(value) ? value : fallback;
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to continue");
  return { supabase, user };
}

async function recalculateMetrics(
  supabase: any,
  userId: string,
  organizationId?: string | null,
) {
  await supabase.rpc("recalculate_finding_accuracy_metrics", {
    p_user_id: userId,
    p_organization_id: organizationId || null,
  });
}

export async function assessScanFindingsAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, organization_id, website_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: findings } = await supabase
    .from("vulnerability_bug_findings")
    .select(
      "id, bug_key, bug_category, title, severity, confidence, false_positive_risk, affected_url, evidence_type, evidence_summary, observed_value, expected_value, customer_data_risk, business_impact, developer_fix, retest_steps",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .limit(300);

  if (!findings?.length) {
    redirect(
      `/report/${scan.id}/accuracy-foundation?message=${encodeURIComponent("No vulnerability findings found. Run Vulnerability Scanner first.")}`,
    );
  }

  const rows = findings.map((finding: any) => {
    const assessment = assessFindingAccuracy({
      bugKey: finding.bug_key,
      title: finding.title,
      category: finding.bug_category,
      severity: finding.severity,
      confidence: finding.confidence,
      falsePositiveRisk: finding.false_positive_risk,
      evidenceType: finding.evidence_type,
      evidenceSummary: finding.evidence_summary,
      observedValue: finding.observed_value,
      expectedValue: finding.expected_value,
      affectedUrl: finding.affected_url,
      customerDataRisk: finding.customer_data_risk,
      businessImpact: finding.business_impact,
      developerFix: finding.developer_fix,
      retestSteps: finding.retest_steps,
    });

    return {
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      source_type: "vulnerability_bug_finding",
      source_id: finding.id,
      taxonomy_key: assessment.taxonomyKey,
      category: assessment.category,
      severity: assessment.severity,
      accuracy_status: assessment.accuracyStatus,
      confidence_score: assessment.confidenceScore,
      false_positive_risk: assessment.falsePositiveRisk,
      evidence_count: assessment.evidenceCount,
      required_evidence_met: assessment.requiredEvidenceMet,
      evidence_quality: assessment.evidenceQuality,
      accuracy_reason: assessment.accuracyReason,
      client_safe_claim: assessment.clientSafeClaim,
      blocked_claim: assessment.blockedClaim,
      needs_expert_review: assessment.needsExpertReview,
      expert_review_status: assessment.expertReviewStatus,
    };
  });

  for (const row of rows) {
    const { data: existing } = await supabase
      .from("finding_accuracy_assessments")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_type", row.source_type)
      .eq("source_id", row.source_id)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("finding_accuracy_assessments")
        .update(row)
        .eq("id", existing.id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("finding_accuracy_assessments").insert(row);
    }
  }

  await recalculateMetrics(supabase, user.id, scan.organization_id);

  revalidatePath(`/report/${scan.id}/accuracy-foundation`);
  redirect(
    `/report/${scan.id}/accuracy-foundation?message=${encodeURIComponent(`${rows.length} finding accuracy assessment(s) generated.`)}`,
  );
}

export async function assessWorkspaceItemsAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const workspaceId = clean(formData.get("workspaceId"));

  const { data: workspace } = await supabase
    .from("security_review_workspaces")
    .select("id, user_id, organization_id, website_id, scan_id")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!workspace) redirect("/reviews?message=Workspace not found");

  const { data: items } = await supabase
    .from("security_review_bug_items")
    .select(
      "id, item_type, title, severity, affected_url, evidence_summary, customer_data_risk, business_impact, developer_fix, retest_steps",
    )
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .limit(300);

  if (!items?.length) {
    redirect(
      `/reviews/${workspace.id}?message=${encodeURIComponent("No workspace bug items found.")}`,
    );
  }

  const rows = items.map((item: any) => {
    const assessment = assessFindingAccuracy({
      bugKey: item.item_type,
      title: item.title,
      category: item.item_type,
      severity: item.severity,
      confidence: "Medium",
      falsePositiveRisk: "Medium",
      evidenceType: "manual-review",
      evidenceSummary: item.evidence_summary,
      affectedUrl: item.affected_url,
      customerDataRisk: item.customer_data_risk,
      businessImpact: item.business_impact,
      developerFix: item.developer_fix,
      retestSteps: item.retest_steps,
    });

    return {
      user_id: user.id,
      organization_id: workspace.organization_id,
      website_id: workspace.website_id,
      scan_id: workspace.scan_id,
      workspace_id: workspace.id,
      source_type: "security_review_bug_item",
      source_id: item.id,
      taxonomy_key: assessment.taxonomyKey,
      category: assessment.category,
      severity: assessment.severity,
      accuracy_status: assessment.accuracyStatus,
      confidence_score: assessment.confidenceScore,
      false_positive_risk: assessment.falsePositiveRisk,
      evidence_count: assessment.evidenceCount,
      required_evidence_met: assessment.requiredEvidenceMet,
      evidence_quality: assessment.evidenceQuality,
      accuracy_reason: assessment.accuracyReason,
      client_safe_claim: assessment.clientSafeClaim,
      blocked_claim: assessment.blockedClaim,
      needs_expert_review: assessment.needsExpertReview,
      expert_review_status: assessment.expertReviewStatus,
    };
  });

  for (const row of rows) {
    const { data: existing } = await supabase
      .from("finding_accuracy_assessments")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_type", row.source_type)
      .eq("source_id", row.source_id)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("finding_accuracy_assessments")
        .update(row)
        .eq("id", existing.id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("finding_accuracy_assessments").insert(row);
    }
  }

  await recalculateMetrics(supabase, user.id, workspace.organization_id);

  revalidatePath(`/reviews/${workspace.id}`);
  redirect(
    `/reviews/${workspace.id}?message=${encodeURIComponent(`${rows.length} accuracy assessment(s) generated.`)}`,
  );
}

export async function validateAccuracyAssessmentAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const assessmentId = clean(formData.get("assessmentId"));
  const returnPath = clean(formData.get("returnPath"), "/admin/accuracy");
  const decision = allowed(
    clean(formData.get("decision"), "needs-manual-review"),
    [
      "confirmed",
      "high-confidence",
      "potential",
      "needs-manual-review",
      "false-positive",
      "accepted-risk",
    ],
    "needs-manual-review",
  );
  const reviewerNote = clean(formData.get("reviewerNote"));
  const evidenceNote = clean(formData.get("evidenceNote"));

  const { data: assessment } = await supabase
    .from("finding_accuracy_assessments")
    .select("id, user_id, organization_id, accuracy_status, confidence_score")
    .eq("id", assessmentId)
    .single();

  if (!assessment) redirect(`${returnPath}?message=Assessment not found`);

  const scoreByDecision: Record<string, number> = {
    confirmed: 99,
    "high-confidence": Math.max(assessment.confidence_score || 0, 85),
    potential: Math.min(assessment.confidence_score || 60, 70),
    "needs-manual-review": Math.min(assessment.confidence_score || 50, 65),
    "false-positive": 0,
    "accepted-risk": assessment.confidence_score || 50,
  };

  await supabase
    .from("finding_accuracy_assessments")
    .update({
      accuracy_status: decision,
      confidence_score: scoreByDecision[decision],
      false_positive_risk: decision === "false-positive" ? "High" : undefined,
      validation_notes: reviewerNote,
      needs_expert_review: false,
      expert_review_status:
        decision === "confirmed"
          ? "approved"
          : decision === "false-positive"
            ? "rejected-false-positive"
            : decision === "accepted-risk"
              ? "accepted-risk"
              : decision === "high-confidence"
                ? "approved"
                : "downgraded",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", assessment.id);

  await supabase.from("finding_validation_reviews").insert({
    assessment_id: assessment.id,
    user_id: assessment.user_id,
    reviewer_id: user.id,
    decision,
    previous_status: assessment.accuracy_status,
    new_status: decision,
    reviewer_note: reviewerNote,
    evidence_note: evidenceNote,
    confidence_score_before: assessment.confidence_score,
    confidence_score_after: scoreByDecision[decision],
  });

  await recalculateMetrics(
    supabase,
    assessment.user_id,
    assessment.organization_id,
  );

  revalidatePath(returnPath);
  redirect(
    `${returnPath}?message=${encodeURIComponent("Accuracy validation saved.")}`,
  );
}
