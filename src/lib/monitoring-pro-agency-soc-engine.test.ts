import { describe, expect, it } from "vitest";
import {
  buildAgencySocSummary,
  buildMonitoringRun,
  calculateMonitoringHealth,
  calculateRegressionScore,
  riskLevel,
  topIssueForClient,
} from "@/lib/monitoring-pro-agency-soc-engine";

const sourceCounts = {
  reportSnapshots: 1,
  developerPortals: 1,
  retestRuns: 1,
  clientPortalLinks: 1,
  openDeveloperTasks: 2,
  failedRetestItems: 1,
  passedRetestItems: 3,
  openAlerts: 0,
};

describe("monitoring pro agency soc engine", () => {
  it("calculates monitoring health", () => {
    const health = calculateMonitoringHealth({
      targetUrl: "https://example.com",
      reportReadinessScore: 80,
      executiveScore: 75,
      fixProgressScore: 60,
      retestPassRate: 70,
      clientReadinessScore: 72,
      sourceCounts,
    });

    expect(health).toBeGreaterThan(50);
  });

  it("calculates regression score", () => {
    const score = calculateRegressionScore(
      {
        targetUrl: "https://example.com",
        previousHealthScore: 90,
        sourceCounts,
      },
      60,
    );

    expect(score).toBeGreaterThan(0);
  });

  it("builds monitoring alerts", () => {
    const run = buildMonitoringRun({
      targetUrl: "https://example.com",
      previousHealthScore: 90,
      reportReadinessScore: 40,
      executiveScore: 45,
      fixProgressScore: 20,
      retestPassRate: 10,
      clientReadinessScore: 30,
      sourceCounts: { ...sourceCounts, failedRetestItems: 2 },
    });

    expect(run.alerts.length).toBeGreaterThan(0);
    expect(run.safetySummary).toContain("Passive-safe");
  });

  it("builds agency SOC summary", () => {
    const summary = buildAgencySocSummary([
      {
        targetUrl: "https://a.com",
        healthScore: 70,
        riskScore: 30,
        openAlertCount: 1,
        regressionCount: 0,
        verifiedFixedCount: 2,
      },
      {
        targetUrl: "https://b.com",
        healthScore: 40,
        riskScore: 80,
        openAlertCount: 3,
        regressionCount: 2,
        verifiedFixedCount: 0,
      },
    ]);

    expect(summary.totalClientCount).toBe(2);
    expect(summary.openAlertCount).toBe(4);
    expect(summary.agencyRiskScore).toBeGreaterThan(50);
  });

  it("labels risk and top issue", () => {
    expect(riskLevel(90)).toBe("Critical");
    expect(
      topIssueForClient({
        targetUrl: "https://x.com",
        healthScore: 50,
        riskScore: 30,
        openAlertCount: 2,
        regressionCount: 0,
      }),
    ).toContain("open");
  });
});
