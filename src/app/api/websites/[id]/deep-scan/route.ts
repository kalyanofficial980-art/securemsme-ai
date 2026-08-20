import { toSafeScanErrorMessage } from "@/lib/security/scan-error";
import type { NextRequest } from "next/server";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";
import { canUseDeepScan, getEffectivePlan } from "@/lib/billing/entitlements";
import { runDeepEvidenceV2 } from "@/lib/deep-evidence-v2";
import { runInbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import { normalizeScanReport } from "@/lib/report-normalization";
import { applyReportTruthPolicy } from "@/lib/scan-truth-policy";
import { scanWebsite } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";
import { enforceRateLimit } from "@/lib/security/request-guard";
import { createClient } from "@/lib/supabase/server";
import { persistTrustedScan, updateTrustedWebsiteVerification } from "@/lib/trusted-server-writes";
import { runVulnerabilityIntelligence } from "@/lib/vulnerability-intelligence";
import { type VerificationMethod, verifyWebsiteOwnership } from "@/lib/ownership-verification";

export const runtime = "nodejs";
type ScanQuotaReservation = { reservation_id?: string };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const rateLimited = enforceRateLimit(request, "deep-scan-api", 5, 60_000);
  if (rateLimited) return rateLimited;
  let releaseQuotaReservation: (() => Promise<void>) | null = null;

  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: "Please login before running authorized deep scan." }, { status: 401 });
    }

    const { data: website } = await supabase
      .from("websites")
      .select("id, url, verification_token, verification_method, verification_status, verified_at, permission_attested_at, deep_scan_enabled")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!website?.url) return Response.json({ error: "Website not found." }, { status: 404 });
    if (website.verification_status !== "verified" || !website.deep_scan_enabled || !website.permission_attested_at) {
      return Response.json({ error: "Deep scan locked. Verify website ownership and permission first." }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, plan_expires_at")
      .eq("id", user.id)
      .single();
    const plan = getEffectivePlan(profile);
    if (!canUseDeepScan(plan)) {
      return Response.json({ error: "Deep scan requires an active Growth or Agency plan." }, { status: 402 });
    }

    const verificationMethod: VerificationMethod =
      website.verification_method === "html_file" || website.verification_method === "meta_tag"
        ? website.verification_method
        : "dns_txt";
    if (!website.verification_token) {
      return Response.json({ error: "Ownership verification token is missing. Re-verify this website." }, { status: 403 });
    }
    const freshVerification = await verifyWebsiteOwnership({
      websiteUrl: website.url,
      token: website.verification_token,
      method: verificationMethod,
    });
    if (!freshVerification.verified) {
      await updateTrustedWebsiteVerification({
        userId: user.id,
        websiteId: website.id,
        patch: {
          verification_status: "failed",
          verified_at: null,
          verified_by: null,
          permission_attested_at: null,
          deep_scan_enabled: false,
        },
      });
      return Response.json(
        { error: "Ownership proof could not be confirmed. Re-verify the website before running a deep scan." },
        { status: 403 },
      );
    }

    const { data: quotaData, error: quotaError } = await supabase.rpc("reserve_scan_quota_v1");
    if (quotaError) {
      const quotaMessage = quotaError.message || "Scan quota could not be reserved.";
      const normalizedMessage = quotaMessage.toLowerCase();
      const status = normalizedMessage.includes("too many") ? 429 : normalizedMessage.includes("limit reached") ? 402 : 500;
      return Response.json({ error: quotaMessage }, { status });
    }
    const quotaRow = (Array.isArray(quotaData) ? quotaData[0] : quotaData) as ScanQuotaReservation | null;
    const reservationId = quotaRow?.reservation_id;
    if (!reservationId) return Response.json({ error: "Scan quota could not be reserved safely." }, { status: 500 });
    releaseQuotaReservation = async () => {
      await supabase.rpc("release_scan_quota_v1", { p_reservation_id: reservationId });
    };

    const rawReport = await scanWebsite(website.url);
    const [rawInbuiltAdvancedAudit, vulnerabilityIntelligence, deepEvidence] = await Promise.all([
      runInbuiltAdvancedAudit(rawReport.normalizedUrl),
      runVulnerabilityIntelligence(rawReport.normalizedUrl),
      runDeepEvidenceV2(rawReport.normalizedUrl),
    ]);
    const normalizedReport = normalizeScanReport(rawReport, vulnerabilityIntelligence);
    const accuracyResult = await applyReportTruthPolicy(normalizedReport, rawInbuiltAdvancedAudit);
    const report = accuracyResult.report;
    const inbuiltAdvancedAudit = accuracyResult.inbuiltAdvancedAudit;
    const scoreResult = calculateScore(report);

    const deepScan = {
      mode: "authorized-deep-passive",
      authorized: true,
      verifiedAt: website.verified_at,
      permissionAttestedAt: website.permission_attested_at,
      proofRecheckedAt: freshVerification.checkedAt,
      verificationMethod,
      scope: "Customer-owned or customer-managed public website",
      evidenceEngine: deepEvidence.version,
      evidenceStatus: deepEvidence.status,
      pagesObserved: deepEvidence.surface.pagesObserved,
      inconclusivePages: deepEvidence.surface.inconclusivePages,
      unlockedChecks: [
        "Same-origin attack surface inventory",
        "Public route and API-like surface discovery",
        "Form and script presence observation without submission",
        "Technology and vulnerability intelligence",
        "CMS/API/docs/admin surface review",
        "Evidence-based developer roadmap",
      ],
      safeBoundary: [
        "GET-only deep evidence collection",
        "Same-origin pages only",
        "No form submission",
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
      securityScoreVersion: scoreResult.version,
      scoreConfidence: scoreResult.scoreConfidence,
      securityEvidenceCount: scoreResult.securityEvidenceCount,
      inconclusiveChecks: scoreResult.inconclusiveChecks,
      supplementalScores: scoreResult.supplementalScores,
      categoryScores: scoreResult.categoryScores,
      severityCounts: scoreResult.severityCounts,
      passedChecks: scoreResult.passedChecks,
      warningChecks: scoreResult.warningChecks,
      failedChecks: scoreResult.failedChecks,
      topFixes: scoreResult.topFixes,
      inbuiltAdvancedAudit,
      vulnerabilityIntelligence,
      deepEvidence,
      diagnosticScores: {
        inbuiltAudit: inbuiltAdvancedAudit.overallScore,
        vulnerabilityIntelligence: vulnerabilityIntelligence.intelligenceScore,
        note: "Deep evidence and diagnostic module scores are supporting evidence only and do not silently change the canonical Security Score.",
      },
      deepScan,
    };
    const fullReport = { ...baseReport, advancedAudit: buildAdvancedSecurityAudit(baseReport) };

    let scan;
    try {
      scan = await persistTrustedScan({
        userId: user.id,
        websiteId: website.id,
        websiteUrl: report.normalizedUrl,
        score: scoreResult.score,
        riskLevel: scoreResult.riskLevel,
        report: fullReport,
      });
    } catch {
      return Response.json({ error: "Deep scan completed but could not save report." }, { status: 500 });
    }
    return Response.json({ scan });
  } catch (error) {
    return Response.json(
      { error: toSafeScanErrorMessage(error, "Deep scan could not be completed safely. Please check the website URL and try again.") },
      { status: 500 },
    );
  } finally {
    if (releaseQuotaReservation) {
      try {
        await releaseQuotaReservation();
      } catch (releaseError) {
        console.error("deep scan quota reservation release failed", {
          route: "./src/app/api/websites/[id]/deep-scan/route.ts",
          name: releaseError instanceof Error ? releaseError.name : "UnknownError",
        });
      }
    }
  }
}
