import { describe, expect, it } from "vitest";
import {
  getPassiveToolCommand,
  parsePassiveToolReport,
} from "@/lib/passive-audit-connector";

describe("passive audit connector", () => {
  it("converts ZAP-style alerts into advanced audit report", () => {
    const report = parsePassiveToolReport({
      websiteUrl: "example.com",
      toolName: "ZAP Baseline Passive",
      rawReport: {
        site: [
          {
            alerts: [
              {
                alert: "Content Security Policy Header Not Set",
                risk: "Medium",
                confidence: "High",
                desc: "CSP header missing.",
                solution: "Add a strict Content-Security-Policy header.",
                instances: [{ uri: "https://example.com" }],
              },
            ],
          },
        ],
      },
    });

    expect(report.normalizedUrl).toBe("https://example.com");
    expect(report.findings).toHaveLength(1);
    expect(report.summary.medium).toBe(1);
    expect(report.advancedAudit.evidenceRecords.length).toBeGreaterThan(0);
  });

  it("generates passive baseline command", () => {
    const command = getPassiveToolCommand("example.com");

    expect(command).toContain("zap-baseline.py");
    expect(command).toContain("https://example.com");
    expect(command).toContain("-J zap-report.json");
  });
});
