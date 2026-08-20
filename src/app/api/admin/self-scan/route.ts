import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";
import { normalizeAdvancedSecurityAudit } from "@/lib/advanced-audit-normalization";
import { runInbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import { normalizeScanReport } from "@/lib/report-normalization";
import { applyReportAccuracyPolicy } from "@/lib/report-accuracy-policy";
import { buildRetestComparison } from "@/lib/retest-comparison";
import { scanWebsite } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";
import { enforceRateLimit } from "@/lib/security/request-guard";
import { toSafeScanErrorMessage } from "@/lib/security/scan-error";
import { createClient } from "@/lib/supabase/server";
import { persistTrustedScan } from "@/lib/trusted-server-writes";
import { runVulnerabilityIntelligence } from "@/lib/vulnerability-intelligence";

export const runtime = "nodejs";

const ADMIN_SELF_SCAN_URL = "https://securemsme-ai-live.vercel.app";
const requestSchema = z.object({
  mode: z.enum(["normal", "retest", "deep"]),
});

export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(request, "admin-self-scan-api", 6, 60_000);
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose Normal, Retest, or Deep Scan." }, { status: 400 });
    }

    const { data: website } = await supabase
      .from("websites")
      .select("id, url")
      .eq("user_id", user.id)
      .eq("url", ADMIN_SELF_SCAN_URL)
      .maybeSingle();

    if (!website?.id || website.url !== ADMIN_SELF_SCAN_URL) {
      return NextResponse.json(
        { error: "The VeyraSec production website is not registered to this admin account." },
        { status: 409 },
      );
    }

    const rawReport = await scanWebsite(ADMIN_SELF_SCAN_URL);
    const [rawInbuiltAdvancedAudit, vulnerabilityIntelligence] = await Promise.all([
      runInbuiltAdvancedAudit(rawReport.normalizedUrl),
      runVulnerabilityIntelligence(rawReport.normalizedUrl),
    ]);

    const normalizedPublicReport = normalizeScanReport(rawReport, vulnerabilityIntelligence);
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

    const { data: previousScan } = await supabase
      .from("scans")
      .select("id, created_at, score, risk_level, report")
      .eq("website_id", website.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const retestComparison = buildRetestComparison({
      previousScan,
      currentScore: scoreResult.score,
      currentRiskLevel: canonicalRiskLevel,
      currentFindings: scoreResult.enhancedFindings,
    });

    const adminScan = {
      mode: parsed.data.mode,
      internalAdminAssessment: true,
      targetLocked: true,
      target: ADMIN_SELF_SCAN_URL,
      authorizationBasis:
        "Founder admin internal assessment of the fixed VeyraSec production domain.",
      customerOwnershipVerificationRequired: false,
      safeBoundary: [
        "Passive public-surface checks only",
        "No exploitation",
        "No brute force",
        "No login bypass",
        "No destructive testing",
        "No private data access",
      ],
    };

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
      retestComparison,
      adminScan,
      ...(parsed.data.mode === "deep"
        ? {
            deepScan: {
              mode: "admin-owned-production-passive",
              authorized: true,
              verificationBypass:
                "Admin-only fixed-domain internal assessment. Customer ownership rules are unchanged.",
              scope: "VeyraSec production public surface",
              unlockedChecks: [
                "Technology fingerprinting",
                "Attack surface inventory",
                "Version exposure intelligence",
                "CMS/API/docs/admin surface review",
                "Evidence-based developer roadmap",
              ],
              safeBoundary: adminScan.safeBoundary,
            },
          }
        : {}),
    };

    const advancedAudit = normalizeAdvancedSecurityAudit(
      buildAdvancedSecurityAudit(baseReport),
      scoreResult.enhancedFindings,
    );

    const fullReport = {
      ...baseReport,
      advancedAudit,
    };

    const scan = await persistTrustedScan({
      userId: user.id,
      websiteId: website.id,
      websiteUrl: report.normalizedUrl,
      score: scoreResult.score,
      riskLevel: canonicalRiskLevel,
      report: fullReport,
    });

    return NextResponse.json({ scan, mode: parsed.data.mode });
  } catch (error) {
    console.error("admin self scan failed", {
      route: "./src/app/api/admin/self-scan/route.ts",
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      {
        error: toSafeScanErrorMessage(
          error,
          "Admin scan could not be completed safely. Please try again.",
        ),
      },
      { status: 500 },
    );
  }
}
