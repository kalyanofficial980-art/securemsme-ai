import { describe, expect, it } from "vitest";
import {
  calibrateDeepCveIntelligence,
  calibrateDeepFindings,
  isDeepStaticAssetUrl,
} from "@/lib/deep-evidence-calibration-v2";
import type { CveIntelligenceReport } from "@/lib/cve-intelligence";

describe("Deep Evidence Calibration V2", () => {
  it("recognizes static asset URLs", () => {
    expect(isDeepStaticAssetUrl("https://example.com/_next/static/chunks/app.js")).toBe(true);
    expect(isDeepStaticAssetUrl("https://example.com/styles.css?v=1")).toBe(true);
    expect(isDeepStaticAssetUrl("https://example.com/login")).toBe(false);
  });

  it("removes static CSP/CORS noise, redirect-only sensitive surfaces, and legal duplicates", () => {
    const findings = calibrateDeepFindings([
      {
        source: "Browser Security",
        title: "Content Security Policy has weakness signals",
        category: "CSP",
        severity: "Medium",
        confidence: "High",
        falsePositiveRisk: "Low" as const,
        status: "evidence-backed" as const,
        affectedUrl: "https://example.com/",
        evidenceSummary: "CSP exists but contains weakness signals.",
      },
      {
        source: "Browser Security",
        title: "Content Security Policy has weakness signals",
        category: "CSP",
        severity: "Medium",
        confidence: "High",
        falsePositiveRisk: "Low" as const,
        status: "evidence-backed" as const,
        affectedUrl: "https://example.com/_next/static/app.js",
        evidenceSummary: "CSP exists but contains weakness signals.",
      },
      {
        source: "Browser Security",
        title: "CORS wildcard origin observed",
        category: "CORS",
        severity: "Low",
        confidence: "High",
        falsePositiveRisk: "Low" as const,
        status: "evidence-backed" as const,
        affectedUrl: "https://example.com/main.css",
        evidenceSummary: "Wildcard CORS origin was observed.",
      },
      {
        source: "Authorized Vulnerability Review",
        title: "Privacy policy page was not found",
        category: "Trust/Data protection",
        severity: "Medium",
        confidence: "Medium",
        falsePositiveRisk: "Medium" as const,
        status: "review-signal" as const,
        affectedUrl: "https://example.com/",
        evidenceSummary: "Common privacy policy paths did not return a successful response.",
      },
      {
        source: "Authorized Vulnerability Review",
        title: "Public sensitive surface observed: /wp-admin/",
        category: "Public sensitive surface",
        severity: "Low",
        confidence: "Medium",
        falsePositiveRisk: "Medium" as const,
        status: "review-signal" as const,
        affectedUrl: "https://example.com/wp-admin/",
        evidenceSummary: "/wp-admin/ returned HTTP 308 during safe GET check.",
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.affectedUrl).toBe("https://example.com/");
  });

  it("deduplicates CSP semantically and prefers evidence-backed evidence", () => {
    const findings = calibrateDeepFindings([
      {
        source: "Authorized Vulnerability Review",
        title: "Content Security Policy is weak",
        category: "Security header",
        severity: "Medium",
        confidence: "Medium",
        falsePositiveRisk: "Medium" as const,
        status: "review-signal" as const,
        affectedUrl: "https://example.com/",
        evidenceSummary: "CSP includes risky patterns.",
      },
      {
        source: "Browser Security",
        title: "Content Security Policy has weakness signals",
        category: "CSP",
        severity: "Medium",
        confidence: "High",
        falsePositiveRisk: "Low" as const,
        status: "evidence-backed" as const,
        affectedUrl: "https://example.com/",
        evidenceSummary: "CSP exists but contains weakness signals.",
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.source).toBe("Browser Security");
    expect(findings[0]?.status).toBe("evidence-backed");
  });

  it("suppresses weak WordPress, WooCommerce and PHP keyword-only technology matches", () => {
    const report: CveIntelligenceReport = {
      version: "test",
      generatedAt: new Date(0).toISOString(),
      websiteUrl: "https://example.com",
      detectedTechnologies: [
        { name: "Next.js", category: "Framework", confidence: "High", evidence: ["Next.js _next public asset signal detected"] },
        { name: "WordPress", category: "CMS", confidence: "Low", evidence: ["Public evidence contains signal: wp-json", "Public evidence contains signal: wp-admin"] },
        { name: "WooCommerce", category: "Ecommerce", confidence: "Low", evidence: ["Public evidence contains signal: checkout", "Public evidence contains signal: cart"] },
        { name: "PHP", category: "Runtime", confidence: "Low", evidence: ["Public evidence contains signal: x-powered-by", "Public evidence contains signal: set-cookie"] },
      ],
      insights: [
        {
          id: "next",
          technologyName: "Next.js",
          technologyFamily: "Framework",
          detectedVersion: null,
          versionConfidence: "Low",
          riskTitle: "Next.js known-risk review",
          riskCategory: "Framework Security",
          severity: "Medium",
          confidence: "Low",
          status: "known-risk-review",
          evidence: ["Next.js _next public asset signal detected"],
          customerExplanation: "Review framework updates.",
          developerRecommendation: "Confirm the exact version.",
          safeClaim: "Next.js signal detected.",
          blockedClaim: "No CVE claim without version.",
          cveCertaintyRule: "Exact version required.",
        },
        ...["WordPress", "WooCommerce", "PHP"].map((name, index) => ({
          id: `weak-${index}`,
          technologyName: name,
          technologyFamily: "Weak",
          detectedVersion: null,
          versionConfidence: "Low" as const,
          riskTitle: `${name} known-risk review`,
          riskCategory: "Technology Risk",
          severity: "Medium" as const,
          confidence: "Low" as const,
          status: "known-risk-review" as const,
          evidence: ["keyword-only"],
          customerExplanation: "Weak signal.",
          developerRecommendation: "Review manually.",
          safeClaim: "Weak signal.",
          blockedClaim: "No CVE claim.",
          cveCertaintyRule: "Exact version required.",
        })),
      ],
      totalTechnologies: 4,
      versionKnownCount: 0,
      versionUnknownCount: 4,
      highPriorityCount: 0,
      customerSummary: "raw",
      certaintyRules: ["Exact version required."],
      developerActions: ["raw"],
    };

    const calibrated = calibrateDeepCveIntelligence(report);
    expect(calibrated.detectedTechnologies.map((technology) => technology.name)).toEqual(["Next.js"]);
    expect(calibrated.insights.map((insight) => insight.technologyName)).toEqual(["Next.js"]);
    expect(calibrated.totalTechnologies).toBe(1);
  });
});
