import { describe, expect, it } from "vitest";
import { buildEvidenceCalibrationReport } from "@/lib/evidence-calibration";

describe("evidence calibration", () => {
  it("marks concrete header evidence as confirmed", () => {
    const report = buildEvidenceCalibrationReport({
      findings: [
        {
          name: "Content Security Policy missing",
          category: "Security Headers",
          severity: "Medium",
          status: "warning",
          description: "Content-Security-Policy header not found.",
          businessImpact: "Browser-side protection is weaker.",
          recommendation: "Add CSP header.",
        },
      ],
    });

    expect(report.items.length).toBeGreaterThan(0);
    expect(report.confirmedCount).toBeGreaterThan(0);
    expect(report.blockedClaims.join(" ")).toContain("fully secure");
  });

  it("keeps weak claims guarded", () => {
    const report = buildEvidenceCalibrationReport({
      advancedAudit: {
        owaspTop10: [
          {
            id: "A03",
            title: "Injection",
            status: "warning",
            severity: "High",
            evidence: ["No direct evidence from passive public scan."],
            businessRisk: "Injection requires deeper validation.",
            recommendation: "Run authorized testing.",
          },
        ],
      },
    });

    expect(report.items.some((item) => item.manualValidationNeeded)).toBe(true);
  });
});
