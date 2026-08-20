import type { NextRequest } from "next/server";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";
import { normalizeAdvancedSecurityAudit } from "@/lib/advanced-audit-normalization";
import {
  canUseRetest,
  getEffectivePlan,
} from "@/lib/billing/entitlements";
import { runInbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import { getNextScanDate } from "@/lib/monitoring";
import { applyReportAccuracyPolicy } from "@/lib/report-accuracy-policy";
import { normalizeScanReport } from "@/lib/report-normalization";
import { buildRetestComparison } from "@/lib/retest-comparison";
import { scanWebsite } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";
import { enforceRateLimit } from "@/lib/security/request-guard";
import { toSafeScanErrorMessage } from "@/lib/security/scan-error";
import { createClient } from "@/lib/supabase/server";
import { runVulnerabilityIntelligence } from "@/lib/vulnerability-intelligence";

export const runtime = "nodejs";

type ScanQuotaReservation = {
  reservation_id?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const rateLimited = enforceRateLimit(request, "retest-api", 10, 60_000);
  if (rateLimited) return rateLimited;

  let releaseQuotaReservation: (() => Promise<void>) | null = null;

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
      .select("plan, plan_expires_at")
      .eq("id", user.id)
      .single();
    const plan = getEffectivePlan(profile);

    if (!canUseRetest(plan)) {
      return Response.json(
        { error: "Retest requires an active Starter, Growth or Agency plan." },
        { status: 402 },
      );
    }

    const { data: quotaData, error: quotaError } = await supabase.rpc(
      "reserve_scan_quota_v1",
    );

    if (quotaError) {
      const quotaMessage = quotaError.message || "Scan quota could not be reserved.";
      const normalizedMessage = quotaMessage.toLowerCase();
      const status = normalizedMessage.includes("too many")
        ? 429
        : normalizedMessage.includes("limit reached")
          ? 402
          : 500;

      return Response.json({ error: quotaMessage }, { status });
    }

    const quotaRow = (
      Array.isArray(quotaData) ? quotaData[0] : quotaData
    ) as ScanQuotaReservation | null;
    const reservationId = quotaRow?.reservation_id;

    if (!reservationId) {
      return Response.json(
        { error: "Scan quota could not be reserved safely." },
        { status: 500 },
      );
    }

    releaseQuotaReservation = async () => {
      await supabase.rpc("release_scan_quota_v1", {
        p_reservation_id: reservationId,
      });
    };

    const { data: previousScan } = await supabase
      .from("scans")
      .select("id, created_at, score, risk_level, report")
      .eq("website_id", website.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rawReport = await scanWebsite(website.url);
    const [rawInbuiltAdvancedAudit, vulnerabilityIntelligence] =
      await Promise.all([
        runInbuiltAdvancedAudit(rawReport.normalizedUrl),
        runVulnerabilityIntelligence(rawReport.normalizedUrl),
      ]);

    const normalizedPublicReport = normalizeScanReport(
      rawReport,
      vulnerabilityIntelligence,
    );
    const accuracyResult = await applyReportAccuracyPolicy(
      normalizedPublicReport,
      rawInbuiltAdvancedAudit,
    );
    const report = accuracyResult.report;
    const inbuiltAdvancedAudit = accuracyResult.inbuiltAdvancedAudit;

    const scoreResult = calculateScore(report);
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
      ...report,
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
  } finally {
    if (releaseQuotaReservation) {
      try {
        await releaseQuotaReservation();
      } catch (releaseError) {
        console.error("retest quota reservation release failed", {
          route: "./src/app/api/websites/[id]/rescan/route.ts",
          name: releaseError instanceof Error ? releaseError.name : "UnknownError",
        });
      }
    }
  }
}
