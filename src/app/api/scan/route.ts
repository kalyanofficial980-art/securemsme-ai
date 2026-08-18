import { toSafeScanErrorMessage } from "@/lib/security/scan-error";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";
import { runInbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import { getNextScanDate } from "@/lib/monitoring";
import { scanWebsite } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";
import { createClient } from "@/lib/supabase/server";
import { runVulnerabilityIntelligence } from "@/lib/vulnerability-intelligence";
import { getWebsiteNameFromUrl } from "@/lib/websites";
import { enforceRateLimit } from "@/lib/security/request-guard";
import { validatePublicHttpUrl } from "@/lib/security/ssrf";

export const runtime = "nodejs";

const scanSchema = z.object({
  websiteUrl: z.string().min(3).max(300).optional(),
  websiteId: z.string().uuid().optional(),
});

const PLAN_SCAN_LIMITS: Record<string, number> = {
  free: 3,
  starter: 20,
  growth: 100,
  agency: 500,
};

function mergedRiskLevel(
  baseRisk: string,
  intelRisk: "Low" | "Medium" | "High" | "Critical",
) {
  if (
    baseRisk === "High" ||
    intelRisk === "High" ||
    intelRisk === "Critical"
  ) {
    return "High";
  }

  if (baseRisk === "Medium" || intelRisk === "Medium") {
    return "Medium";
  }

  return baseRisk;
}

export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(request, "scan-api", 10, 60_000);
  if (rateLimited) return rateLimited;

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

    await validatePublicHttpUrl(websiteUrl);

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
      return NextResponse.json(
        {
          error:
            plan === "free"
              ? "Free daily scan limit reached. Please try again tomorrow or upgrade."
              : "Monthly scan limit reached for your current plan.",
        },
        { status: 402 },
      );
    }

    const report = await scanWebsite(websiteUrl);
    const [inbuiltAdvancedAudit, vulnerabilityIntelligence, scoreResult] =
      await Promise.all([
        runInbuiltAdvancedAudit(report.normalizedUrl),
        runVulnerabilityIntelligence(report.normalizedUrl),
        Promise.resolve(calculateScore(report)),
      ]);

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
      riskLevel: scoreResult.riskLevel,
      summary: scoreResult.summary,
      executiveSummary: scoreResult.executiveSummary,
      categoryScores: scoreResult.categoryScores,
      severityCounts: scoreResult.severityCounts,
      passedChecks: scoreResult.passedChecks,
      warningChecks: scoreResult.warningChecks,
      failedChecks: scoreResult.failedChecks,
      topFixes: scoreResult.topFixes,
      inbuiltAdvancedAudit,
      vulnerabilityIntelligence,
    };

    const fullReport = {
      ...baseReport,
      advancedAudit: buildAdvancedSecurityAudit(baseReport),
    };

    const finalScore = Math.round(
      (scoreResult.score +
        inbuiltAdvancedAudit.overallScore +
        vulnerabilityIntelligence.intelligenceScore) /
        3,
    );

    const finalRiskLevel = mergedRiskLevel(
      scoreResult.riskLevel,
      vulnerabilityIntelligence.riskLevel,
    );

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
  }
}
