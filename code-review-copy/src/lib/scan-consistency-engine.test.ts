import { describe, expect, it } from "vitest";
import {
  buildScanConsistencyReport,
  normalizeRisk,
} from "@/lib/scan-consistency-engine";

describe("scan consistency engine", () => {
  it("normalizes risk from score when risk string is missing", () => {
    expect(normalizeRisk("", 90)).toBe("Low risk");
    expect(normalizeRisk("", 70)).toBe("Medium risk");
    expect(normalizeRisk("", 40)).toBe("High risk");
  });

  it("explains first scan without previous comparison", () => {
    const report = buildScanConsistencyReport({
      current: {
        id: "scan-1",
        website_url: "https://example.com",
        score: 77,
        risk_level: "Medium risk",
        report: { findings: [{ severity: "High" }, { severity: "Medium" }] },
        created_at: "2026-07-02T07:00:00.000Z",
      },
      previous: null,
      isLatestKnownScan: true,
    });

    expect(report.previousScore).toBeNull();
    expect(report.riskTransition).toBe("no-previous-scan");
    expect(report.scoreBreakdown.totalFindings).toBe(2);
  });

  it("detects improved score compared with previous scan", () => {
    const report = buildScanConsistencyReport({
      current: {
        id: "scan-2",
        website_url: "https://example.com",
        score: 77,
        risk_level: "Medium risk",
        report: { findings: [{ severity: "Medium" }] },
      },
      previous: {
        id: "scan-1",
        website_url: "https://example.com",
        score: 38,
        risk_level: "High risk",
        report: { findings: [{ severity: "High" }, { severity: "High" }] },
      },
      isLatestKnownScan: true,
    });

    expect(report.previousScore).toBe(38);
    expect(report.scoreDelta).toBe(39);
    expect(report.riskTransition).toBe("improved");
  });
});
