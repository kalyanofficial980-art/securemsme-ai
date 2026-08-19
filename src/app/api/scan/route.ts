import { toSafeScanErrorMessage } from "@/lib/security/scan-error";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";
import { normalizeAdvancedSecurityAudit } from "@/lib/advanced-audit-normalization";
import { runInbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import { getNextScanDate } from "@/lib/monitoring";
import { applyReportAccuracyPolicy } from "@/lib/report-accuracy-policy";
import { scanWebsite } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";
import { normalizeScanReport } from "@/lib/report-normalization";
import { buildRetestComparison } from "@/lib/retest-comparison";
import { createClient } from "@/lib/supabase/server";
import { runVulnerabilityIntelligence } from "@/lib/vulnerability-intelligence";
import { getWebsiteNameFromUrl } from "@/lib/websites";
import { enforceRateLimit } from "@/lib/security/request-guard";

export const runtime = "nodejs";

const scanSchema = z.object({
  websiteUrl: z.string().min(3).max(300).optional(),
  websiteId: z.string().uuid().optional(),
});

type ScanQuotaReservation = {
  reservation_id?: string;
};

export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(request, "scan-api", 10, 60_000);
  if (rateLimited) return rateLimited;

  let releaseQuotaReservation: (() => Promise<void>) | null = null;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Please login before scanning a website." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = scanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid website URL." },
        { status: 400 },
      );
    }

    let websiteUrl = parsed.data.websiteUrl;
    let savedWebsiteId: string | null = parsed.data.websiteId || null;
    let scanFrequency = "weekly";

    if (savedWebsiteId) {
      const { data: savedWebsite } = await supabase
        .from("websites")
        .select("id, url, scan_frequency")
        .eq("id", savedWebsiteId)
        .eq("user_id", user.id)
        .single();

      if (!savedWebsite?.url) {
        return NextResponse.json(
          { error: "Saved website was not found." },
          { status: 404 },
        );
      }

      websiteUrl = savedWebsite.url;
      scanFrequency = savedWebsite.scan_frequency || "weekly";
    }

    if (!websiteUrl) {
      return NextResponse.json(
        { error: "Please enter a website URL or select a saved website." },
        { status: 400 },
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

      return NextResponse.json({ error: quotaMessage }, { status });
    }

    const quotaRow = (
      Array.isArray(quotaData) ? quotaData[0] : quotaData
    ) as ScanQuotaReservation | null;
    const reservationId = quotaRow?.reservation_id;

    if (!reservationId) {
      return NextResponse.json(
        { error: "Scan quota could not be reserved safely." },
        { status: 500 },
      );
    }

    releaseQuotaReservation = async () => {
      await supabase.rpc("release_scan_quota_v1", {
        p_reservation_id: reservationId,
      });
    };

    const rawReport = await scanWebsite(websiteUrl);

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

    if (!savedWebsiteId) {
      const { data: existingWebsite } = await supabase
        .from("websites")
        .select("id, scan_frequency")
        .eq("user_id", user.id)
        .eq("url", report.normalizedUrl)
        .maybeSingle();

      if (existingWebsite?.id) {
        savedWebsiteId = existingWebsite.id;
        scanFrequency = existingWebsite.scan_frequency || "weekly";
      } else {
        const { data: newWebsite } = await supabase
          .from("websites")
          .insert({
            user_id: user.id,
            url: report.normalizedUrl,
            website_url: report.normalizedUrl,
            name: getWebsiteNameFromUrl(report.normalizedUrl),
            monitoring_enabled: true,
            scan_frequency: "weekly",
          })
          .select("id, scan_frequency")
          .single();

        savedWebsiteId = newWebsite?.id || null;
        scanFrequency = newWebsite?.scan_frequency || "weekly";
      }
    }

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

    let previousScan = null;
    if (savedWebsiteId) {
      const { data } = await supabase
        .from("scans")
        .select("id, created_at, score, risk_level, report")
        .eq("website_id", savedWebsiteId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      previousScan = data;
    }

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
        website_id: savedWebsiteId,
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
      return NextResponse.json(
        { error: "Scan completed but could not save report." },
        { status: 500 },
      );
    }

    if (savedWebsiteId) {
      await supabase
        .from("websites")
        .update({
          last_scan_at: scan.created_at,
          next_scan_at: getNextScanDate(scan.created_at, scanFrequency),
          latest_score: finalScore,
          latest_risk_level: finalRiskLevel,
          latest_scan_id: scan.id,
        })
        .eq("id", savedWebsiteId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ scan });
  } catch (error) {
    console.error("scan route failed", {
      route: "./src/app/api/scan/route.ts",
      name: error instanceof Error ? error.name : "UnknownError",
      message: String(error),
    });

    const message = toSafeScanErrorMessage(
      error,
      "Scan could not be completed safely. Please check the website URL and try again.",
    );

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (releaseQuotaReservation) {
      try {
        await releaseQuotaReservation();
      } catch (releaseError) {
        console.error("scan quota reservation release failed", {
          route: "./src/app/api/scan/route.ts",
          name: releaseError instanceof Error ? releaseError.name : "UnknownError",
        });
      }
    }
  }
}
