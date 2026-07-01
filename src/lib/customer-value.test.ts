import { describe, expect, it } from "vitest";
import {
  buildCustomerValueReport,
  extractFixTasksFromReport,
} from "@/lib/customer-value";

describe("customer value report", () => {
  it("extracts actionable tasks from evidence calibration", () => {
    const tasks = extractFixTasksFromReport({
      userId: "user-1",
      websiteId: "website-1",
      scanId: "scan-1",
      report: {
        evidenceCalibration: {
          items: [
            {
              title: "Content Security Policy missing",
              category: "Headers",
              severity: "Medium",
              source: "Native scanner",
              status: "confirmed",
              evidence: ["Content-Security-Policy header not found"],
              customerImpact: "Browser security is weaker.",
              developerFix: "Add CSP header.",
            },
          ],
        },
      },
    });

    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toContain("Content Security Policy");
  });

  it("calculates before after score change and completion", () => {
    const report = buildCustomerValueReport({
      currentScan: {
        id: "scan-2",
        website_url: "https://example.com",
        score: 84,
        risk_level: "Low",
      },
      previousScan: {
        id: "scan-1",
        score: 70,
        risk_level: "Medium",
      },
      tasks: [
        {
          id: "task-1",
          userId: "user-1",
          websiteId: "website-1",
          scanId: "scan-2",
          fingerprint: "csp-missing",
          title: "CSP missing",
          category: "Headers",
          severity: "Medium",
          source: "Native scanner",
          status: "fixed",
          evidence: ["Header not found"],
          customerImpact: "Impact",
          developerFix: "Fix",
          ownerAction: "Ask developer",
          proofHint: "Retest",
        },
      ],
    });

    expect(report.scoreChange).toBe(14);
    expect(report.completionPercent).toBe(100);
    expect(report.improvementLabel).toContain("Improved");
  });
});
