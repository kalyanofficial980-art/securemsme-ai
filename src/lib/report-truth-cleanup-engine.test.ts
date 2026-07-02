import { describe, expect, it } from "vitest";
import {
  buildReportTruthCleanup,
  isGenericTitle,
} from "@/lib/report-truth-cleanup-engine";

describe("report truth cleanup engine", () => {
  it("detects generic old wording and creates exact fixes", () => {
    const cleanup = buildReportTruthCleanup({
      id: "scan-1",
      website_url: "https://example.com",
      score: 77,
      risk_level: "Medium risk",
      report: {
        topFixes: [
          {
            title: "Security headers",
            severity: "High",
            businessImpact: "This can affect business trust.",
            fix: "Review this issue and apply the recommended hardening control.",
          },
        ],
      },
    });

    expect(cleanup.genericTextCount).toBeGreaterThan(0);
    expect(cleanup.cleanedFixCount).toBe(1);
    expect(cleanup.cleanedReport.cleanedFixes[0].exactDeveloperFix).toContain(
      "Content-Security-Policy",
    );
  });

  it("marks weak evidence as needs-review for unknown issues", () => {
    const cleanup = buildReportTruthCleanup({
      id: "scan-1",
      website_url: "https://example.com",
      report: {
        findings: [{ title: "Unknown custom risk", severity: "Medium" }],
      },
    });

    expect(cleanup.missingEvidenceCount).toBeGreaterThanOrEqual(1);
    expect(cleanup.cleanedReport.cleanedFixes[0].evidenceStatus).toBe(
      "needs-review",
    );
  });

  it("identifies generic titles", () => {
    expect(isGenericTitle("Security headers")).toBe(true);
    expect(isGenericTitle("Very specific issue")).toBe(false);
  });
});
