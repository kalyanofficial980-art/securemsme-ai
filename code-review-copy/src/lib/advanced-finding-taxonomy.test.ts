import { describe, expect, it } from "vitest";
import {
  assessFindingAccuracy,
  calculateConfirmedAccuracyMetric,
  calculateFalsePositiveRate,
  mapBugKeyToTaxonomyKey,
} from "@/lib/advanced-finding-taxonomy";

describe("advanced finding taxonomy accuracy foundation", () => {
  it("maps common scanner bug keys to taxonomy", () => {
    expect(mapBugKeyToTaxonomyKey({ bugKey: "missing-csp" })).toBe(
      "missing-csp",
    );
    expect(
      mapBugKeyToTaxonomyKey({ title: "Cookie security flags need review" }),
    ).toBe("cookie-security-flags-missing");
  });

  it("marks weak evidence as needs manual review", () => {
    const result = assessFindingAccuracy({
      bugKey: "sensitive-public-path-/backup",
      title: "Potential sensitive path accessible",
      severity: "High",
      confidence: "Medium",
      falsePositiveRisk: "High",
      affectedUrl: "https://example.com/backup.zip",
      evidenceType: "head-status-check",
      evidenceSummary: "Path returned HTTP 200",
    });

    expect(result.accuracyStatus).toBe("needs-manual-review");
    expect(result.needsExpertReview).toBe(true);
  });

  it("can mark strong low-risk evidence as confirmed", () => {
    const result = assessFindingAccuracy({
      bugKey: "missing-csp",
      title: "Content Security Policy is missing",
      severity: "High",
      confidence: "Confirmed",
      falsePositiveRisk: "Low",
      affectedUrl: "https://example.com",
      evidenceType: "missing-header",
      evidenceSummary:
        "Content-Security-Policy header was not observed on homepage response.",
      observedValue: "Missing",
      expectedValue: "Content-Security-Policy should be present.",
      developerFix: "Add restrictive CSP header.",
      retestSteps: "Reload and confirm CSP header exists.",
    });

    expect(result.accuracyStatus).toBe("confirmed");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(90);
  });

  it("calculates metrics safely", () => {
    expect(
      calculateConfirmedAccuracyMetric({
        confirmedCount: 99,
        falsePositiveCount: 1,
      }),
    ).toBe(99);
    expect(
      calculateFalsePositiveRate({
        totalAssessments: 100,
        falsePositiveCount: 2,
      }),
    ).toBe(2);
  });
});
