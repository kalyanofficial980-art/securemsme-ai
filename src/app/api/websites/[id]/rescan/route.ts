import type { NextRequest } from "next/server";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";
import { normalizeAdvancedSecurityAudit } from "@/lib/advanced-audit-normalization";
import { runInbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import { getNextScanDate } from "@/lib/monitoring";
import { normalizeScanReport } from "@/lib/report-normalization";
import { buildRetestComparison } from "@/lib/retest-comparison";
import { scanWebsite } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";
import { enforceRateLimit } from "@/lib/security/request-guard";
import { toSafeScanErrorMessage } from "@/lib/security/scan-error";
import { createClient } from "@/lib/supabase/server";
import { runVulnerabilityIntelligence } from "@/lib/vulnerability-intelligence";

export const runtime = "nodejs";

const PLAN_SCAN_LIMITS: Record<string, number> = {
  free: 3,
  starter: 20,
  growth: 100,
  agency: 500,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const rateLimited = enforceRateLimit(request, "retest-api", 10, 60_000);
  if (rateLimited) return rateLimited;

  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Please login before retesting a website." },
        { status: 401 },
      );
    }

    const { data: website } = await supabase
      .from("websites")
      .select("id, url, scan_frequency")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!website?.url) {
      return Response.json(
        { error: "Saved website was not found." },
        { status: 404 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    const plan = profile?.plan || "free";
    const scanLimit = PLAN_SCAN_LIMITS[plan] ?? PLAN_SCAN_LIMITS.free;
    const windowStart = new Date();

    if (plan === "free") {
      windowStart.setHours(0, 0, 0, 0);
    } else {
      windowStart.setDate(1);
      windowStart.setHours(0, 0, 0, 0);
    }

    const { count } = await supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", windowStart.toISOString());

    if ((count || 0) >= scanLimit) {
      return Response.json(
        {
          error:
            plan === "free"
              ? "Free daily scan limit reached. Please try again tomorrow or upgrade."
              : "Monthly scan limit reached for your current plan.",
        },
        { status: 402 },
      );
    }

    const { data: previousScan } = await supabase
      .from("scans")
      .select("id, created_at, score, risk_level, report")
      .eq("website_id", website.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const report = await scanWebsite(website.url);
    const [inbuiltAdvancedAudit, vulnerabilityIntelligence] =
      await Promise.all([
        runInbuiltAdvancedAudit(report.normalizedUrl),
        runVulnerabilityIntelligence(report.normalizedUrl),
      ]);

    const normalizedReport = normalizeScanReport(
      report,
      vulnerabilityIntelligence,
    );
    const scoreResult = calculateScore(normalizedReport);
    const canonicalRiskLevel: "Low" | "Medium" | "High" =
      scoreResult.severityCounts.critical > 0 || scoreResult.severityCounts.high > 0
        ? "High"
        : scoreResult.severityCounts.medium > 0
          ? "Medium"
          : scoreResult.riskLevel;
    const canonicalSummary =
      canonicalRiskLevel === "High"
        ? "This website has at least one high-impact actionable finding. Fix the highest-severity issue before treating the public posture as low risk."
        : canonicalRiskLevel === "Medium"
          ? "This website has one or more medium-severity actionable findings. Address them before treating the public posture as low risk."
          : scoreResult.executiveSummary;

    const baseReport = {
      ...normalizedReport,
      findings: scoreResult.enhancedFindings,
      score: scoreResult.score,
      rawScore: scoreResult.rawScore,
      maxScore: scoreResult.maxScore,
      riskLevel: canonicalRiskLevel,
      summary: canonicalSummary,
      executiveSummary: canonicalSummary,
      categoryScores: scoreResult.categoryScores,
      severityCounts: scoreResult.severityCounts,
      passedChecks: scoreResult.passedChecks,
      warningChecks: scoreResult.warningChecks,
      failedChecks: scoreResult.failedChecks,
      topFixes: scoreResult.topFixes,
      inbuiltAdvancedAudit,
      vulnerabilityIntelligence,
      diagnosticScores: {
        inbuiltAudit: inbuiltAdvancedAudit.overallScore,
        vulnerabilityIntelligence:
          vulnerabilityIntelligence.intelligenceScore,
        note:
          "Diagnostic module scores are supporting signals only and do not replace the canonical customer-facing score.",
      },
    };

    const advancedAudit = normalizeAdvancedSecurityAudit(
      buildAdvancedSecurityAudit(baseReport),
      scoreResult.enhancedFindings,
    );
    const finalScore = scoreResult.score;
    const finalRiskLevel = canonicalRiskLevel;
    const retestComparison = buildRetestComparison({
      previousScan,
      currentScore: finalScore,
      currentRiskLevel: finalRiskLevel,
      currentFindings: scoreResult.enhancedFindings,
    });

    const fullReport = {
      ...baseReport,
      advancedAudit,
      retestComparison,
    };

    const { data: scan, error: insertError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        website_id: website.id,
        website_url: report.normalizedUrl,
        score: finalScore,
        risk_level: finalRiskLevel,
        report: fullReport,
      })
      .select(
        "id, website_id, website_url, score, risk_level, report, created_at",
      )
      .single();

    if (insertError || !scan) {
      return Response.json(
        { error: "Retest completed but could not save the comparison report." },
        { status: 500 },
      );
    }

    await supabase
      .from("websites")
      .update({
        last_scan_at: scan.created_at,
        next_scan_at: getNextScanDate(
          scan.created_at,
          website.scan_frequency || "weekly",
        ),
        latest_score: finalScore,
        latest_risk_level: finalRiskLevel,
        latest_scan_id: scan.id,
      })
      .eq("id", website.id)
      .eq("user_id", user.id);

    return Response.json({ scan, retestComparison });
  } catch (error) {
    const message = toSafeScanErrorMessage(
      error,
      "Retest could not be completed safely. Please check the website URL and try again.",
    );

    return Response.json({ error: message }, { status: 500 });
  }
}
