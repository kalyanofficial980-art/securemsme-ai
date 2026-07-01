import type { NextRequest } from "next/server";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";
import { runInbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import { getNextScanDate } from "@/lib/monitoring";
import { scanWebsite } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";
import { createClient } from "@/lib/supabase/server";
import { runVulnerabilityIntelligence } from "@/lib/vulnerability-intelligence";

export const runtime = "nodejs";

const TEMP_DEV_FREE_SCAN_LIMIT = 999;

function mergedRiskLevel(
  baseRisk: string,
  intelRisk: "Low" | "Medium" | "High" | "Critical",
) {
  if (intelRisk === "Critical") return "High";
  if (intelRisk === "High") return "High";
  if (baseRisk === "High" || intelRisk === "Medium") return "Medium";
  return baseRisk;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Please login before running authorized deep scan." },
        { status: 401 },
      );
    }

    const { data: website } = await supabase
      .from("websites")
      .select(
        "id, url, scan_frequency, verification_status, verified_at, permission_attested_at, deep_scan_enabled",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!website?.url) {
      return Response.json({ error: "Website not found." }, { status: 404 });
    }

    if (
      website.verification_status !== "verified" ||
      !website.deep_scan_enabled ||
      !website.permission_attested_at
    ) {
      return Response.json(
        {
          error:
            "Deep scan locked. Verify website ownership and permission first.",
        },
        { status: 403 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const { count } = await supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (
      (profile?.plan || "free") === "free" &&
      (count || 0) >= TEMP_DEV_FREE_SCAN_LIMIT
    ) {
      return Response.json(
        {
          error:
            "Temporary free development limit reached. Razorpay paid limits will be added at the end.",
        },
        { status: 402 },
      );
    }

    const report = await scanWebsite(website.url);
    const [inbuiltAdvancedAudit, vulnerabilityIntelligence, scoreResult] =
      await Promise.all([
        runInbuiltAdvancedAudit(report.normalizedUrl),
        runVulnerabilityIntelligence(report.normalizedUrl),
        Promise.resolve(calculateScore(report)),
      ]);

    const deepScan = {
      mode: "authorized-deep-passive",
      authorized: true,
      verifiedAt: website.verified_at,
      permissionAttestedAt: website.permission_attested_at,
      scope: "Customer-owned or customer-managed public website",
      unlockedChecks: [
        "Technology fingerprinting",
        "Attack surface inventory",
        "Version exposure intelligence",
        "CMS/API/docs/admin surface review",
        "Evidence-based developer roadmap",
      ],
      safeBoundary: [
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
      deepScan,
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
        { error: "Deep scan completed but could not save report." },
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

    return Response.json({ scan });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while running authorized deep scan.";

    return Response.json({ error: message }, { status: 500 });
  }
}
