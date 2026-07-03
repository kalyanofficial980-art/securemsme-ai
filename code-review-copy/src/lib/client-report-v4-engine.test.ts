import { describe, expect, it } from "vitest";
import {
  buildClientReportV4,
  calculateBusinessRisk,
  calculateExecutiveScore,
  calculateReportReadiness,
  clientReportV4BlockedClaims,
} from "@/lib/client-report-v4-engine";

const sourceCounts = {
  crawlerRuns: 1,
  apiRuns: 1,
  authRuns: 1,
  evidenceItems: 5,
  proofChains: 1,
  accuracyAssessments: 4,
  vulnerabilityFindings: 3,
  advancedClusters: 1,
  workspaceBugs: 2,
};

describe("client report v4 engine", () => {
  it("calculates report readiness", () => {
    expect(
      calculateReportReadiness({
        targetUrl: "https://example.com",
        sourceCounts,
      }),
    ).toBeGreaterThan(70);
  });

  it("calculates business risk", () => {
    const risk = calculateBusinessRisk({
      targetUrl: "https://example.com",
      sourceCounts,
      apiRiskScore: 60,
      authRiskScore: 40,
      crawlerRiskScore: 30,
      confirmedCount: 2,
      highConfidenceCount: 3,
      openActionCount: 4,
    });

    expect(risk).toBeGreaterThan(40);
  });

  it("calculates executive score safely", () => {
    const score = calculateExecutiveScore({
      targetUrl: "https://example.com",
      baseScore: 70,
      sourceCounts,
      apiRiskScore: 25,
      authRiskScore: 20,
      crawlerRiskScore: 10,
      evidenceStrengthScore: 80,
    });

    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("builds report with blocked claims and sections", () => {
    const report = buildClientReportV4({
      targetUrl: "https://example.com",
      baseScore: 75,
      sourceCounts,
      confirmedCount: 1,
      highConfidenceCount: 2,
      needsManualReviewCount: 1,
      openActionCount: 3,
      quickWinCount: 2,
      developerTaskCount: 4,
    });

    expect(report.sections.length).toBeGreaterThanOrEqual(5);
    expect(report.metrics.length).toBeGreaterThanOrEqual(4);
    expect(report.limitationsSummary).toContain(
      "not a legal compliance certificate",
    );
    expect(clientReportV4BlockedClaims.join(" ")).toContain("100% secure");
  });
});
