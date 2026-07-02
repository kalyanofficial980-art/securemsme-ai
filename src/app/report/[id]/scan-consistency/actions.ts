"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildScanConsistencyReport } from "@/lib/scan-consistency-engine";
import { createClient } from "@/lib/supabase/server";

export async function generateScanConsistencyReport(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to generate consistency report");

  const { data: scan } = await supabase
    .from("scans")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  let previousQuery = supabase
    .from("scans")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("user_id", user.id)
    .lt("created_at", scan.created_at)
    .order("created_at", { ascending: false })
    .limit(1);

  if (scan.website_id) {
    previousQuery = previousQuery.eq("website_id", scan.website_id);
  } else {
    previousQuery = previousQuery.eq("website_url", scan.website_url);
  }

  const { data: previous } = await previousQuery.maybeSingle();

  let latestQuery = supabase
    .from("scans")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (scan.website_id) {
    latestQuery = latestQuery.eq("website_id", scan.website_id);
  } else {
    latestQuery = latestQuery.eq("website_url", scan.website_url);
  }

  const { data: latest } = await latestQuery.maybeSingle();
  const report = buildScanConsistencyReport({
    current: scan,
    previous,
    isLatestKnownScan: latest?.id === scan.id,
  });

  await supabase.from("scan_consistency_reports").insert({
    user_id: user.id,
    website_id: scan.website_id,
    source_scan_id: scan.id,
    previous_scan_id: previous?.id || null,
    website_url: scan.website_url,
    engine_version: report.engineVersion,
    current_score: report.currentScore,
    previous_score: report.previousScore,
    score_delta: report.scoreDelta,
    current_risk: report.currentRisk,
    previous_risk: report.previousRisk,
    risk_transition: report.riskTransition,
    confidence_level: report.confidenceLevel,
    score_explanation: report.scoreExplanation,
    score_breakdown: report.scoreBreakdown,
    delta_analysis: report.deltaAnalysis,
    consistency_warnings: report.consistencyWarnings,
    latest_scan_badge: report.latestScanBadge,
    customer_summary: report.customerSummary,
  });

  revalidatePath(`/report/${scan.id}/scan-consistency`);
  redirect(
    `/report/${scan.id}/scan-consistency?message=${encodeURIComponent(
      "Scan consistency and score explanation generated.",
    )}`,
  );
}
