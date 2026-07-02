import { describe, expect, it } from "vitest";
import {
  buildMonitoringPolicy,
  evaluateMonitoringRun,
  normalizeMonitoringRisk,
} from "@/lib/continuous-monitoring-engine";

describe("continuous monitoring engine", () => {
  it("normalizes risk labels from score", () => {
    expect(normalizeMonitoringRisk("", 90)).toBe("Low risk");
    expect(normalizeMonitoringRisk("", 70)).toBe("Medium risk");
    expect(normalizeMonitoringRisk("", 40)).toBe("High risk");
  });

  it("detects score drop regression", () => {
    const policy = buildMonitoringPolicy({
      websiteUrl: "https://example.com",
      cadence: "daily",
      scoreDropThreshold: 10,
      riskThreshold: "Medium risk",
    });

    const evaluation = evaluateMonitoringRun({
      policy,
      current: {
        id: "scan-2",
        website_url: "https://example.com",
        score: 55,
        risk_level: "Medium risk",
        report: { findings: [{ severity: "High" }] },
      },
      previous: {
        id: "scan-1",
        website_url: "https://example.com",
        score: 80,
        risk_level: "Low risk",
        report: { findings: [] },
      },
    });

    expect(evaluation.regressionDetected).toBe(true);
    expect(evaluation.driftStatus).toBe("risk-increased");
    expect(evaluation.scoreDelta).toBe(-25);
  });

  it("creates baseline without previous scan", () => {
    const policy = buildMonitoringPolicy({
      websiteUrl: "https://example.com",
      cadence: "daily",
      scoreDropThreshold: 10,
      riskThreshold: "Medium risk",
    });

    const evaluation = evaluateMonitoringRun({
      policy,
      current: {
        id: "scan-1",
        website_url: "https://example.com",
        score: 77,
        risk_level: "Medium risk",
        report: { findings: [{ severity: "Medium" }] },
      },
      previous: null,
    });

    expect(evaluation.scoreBefore).toBeNull();
    expect(evaluation.riskTransition).toBe("no-previous-baseline");
  });
});
