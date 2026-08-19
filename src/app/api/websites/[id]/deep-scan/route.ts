import { toSafeScanErrorMessage } from "@/lib/security/scan-error";
import type { NextRequest } from "next/server";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";
import { runInbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import { getNextScanDate } from "@/lib/monitoring";
import { normalizeScanReport } from "@/lib/report-normalization";
import { scanWebsite } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";
import { enforceRateLimit } from "@/lib/security/request-guard";
import { createClient } from "@/lib/supabase/server";
import { runVulnerabilityIntelligence } from "@/lib/vulnerability-intelligence";
import {
  type VerificationMethod,
  verifyWebsiteOwnership,
} from "@/lib/ownership-verification";

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
  const rateLimited = enforceRateLimit(request, "deep-scan-api", 5, 60_000);
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
        { error: "Please login before running authorized deep scan." },
        { status: 401 },
      );
    }

    const { data: website } = await supabase
      .from("websites")
      .select(
        "id, url, scan_frequency, verification_token, verification_method, verification_status, verified_at, permission_attested_at, deep_scan_enabled",
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

    const verificationMethod: VerificationMethod =
      website.verification_method === "html_file" ||
      website.verification_method === "meta_tag"
        ? website.verification_method
        : "dns_txt";

    if (!website.verification_token) {
      return Response.json(
        { error: "Ownership verification token is missing. Re-verify this website." },
        { status: 403 },
      );
    }

    const freshVerification = await verifyWebsiteOwnership({
      websiteUrl: website.url,
      token: website.verification_token,
      method: verificationMethod,
    });

    if (!freshVerification.verified) {
      await supabase
        .from("websites")
        .update({
          verification_status: "failed",
          verified_at: null,
          verified_by: null,
          permission_attested_at: null,
          deep_scan_enabled: false,
        })
        .eq("id", website.id)
        .eq("user_id", user.id);

      return Response.json(
        {
          error:
            "Ownership proof could not be confirmed. Re-verify the website before running a deep scan.",
        },
        { status: 403 },
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

    const deepScan = {
      mode: "authorized-deep-passive",
      authorized: true,
      verifiedAt: website.verified_at,
      permissionAttestedAt: website.permission_attested_at,
      proofRecheckedAt: freshVerification.checkedAt,
      verificationMethod,
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
      ...normalizedReport,
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
      diagnosticScores: {
        inbuiltAudit: inbuiltAdvancedAudit.overallScore,
        vulnerabilityIntelligence:
          vulnerabilityIntelligence.intelligenceScore,
        note:
          "Diagnostic module scores are supporting signals only and do not replace the canonical customer-facing score.",
      },
      deepScan,
    };

    const fullReport = {
      ...baseReport,
      advancedAudit: buildAdvancedSecurityAudit(baseReport),
    };

    const finalScore = scoreResult.score;
    const finalRiskLevel = scoreResult.riskLevel;

    const { data: scan, error: insertError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        website_id: website.id,
        website_url: normalizedReport.normalizedUrl,
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
    const message = toSafeScanErrorMessage(
      error,
      "Deep scan could not be completed safely. Please check the website URL and try again.",
    );

    return Response.json({ error: message }, { status: 500 });
  }
}
