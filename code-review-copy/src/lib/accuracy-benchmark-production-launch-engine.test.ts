import { describe, expect, it } from "vitest";
import {
  buildBenchmarkRun,
  buildLaunchSnapshot,
  defaultLaunchChecks,
} from "@/lib/accuracy-benchmark-production-launch-engine";

describe("accuracy benchmark production launch engine", () => {
  it("builds benchmark run", () => {
    const run = buildBenchmarkRun({
      scans: 5,
      reports: 1,
      evidenceItems: 10,
      proofChains: 2,
      accuracyAssessments: 3,
      developerTasks: 4,
      retestRuns: 1,
      monitoringAlerts: 0,
      aiTriageRuns: 1,
    });

    expect(run.totalCaseCount).toBeGreaterThan(5);
    expect(run.accuracyScore).toBeGreaterThan(80);
    expect(run.blockedClaims).toContain(
      "Do not claim the SaaS is 100% secure.",
    );
  });

  it("flags missing evidence as warning", () => {
    const run = buildBenchmarkRun({
      scans: 1,
      reports: 0,
      evidenceItems: 0,
      proofChains: 0,
      accuracyAssessments: 0,
      developerTasks: 0,
      retestRuns: 0,
      monitoringAlerts: 2,
      aiTriageRuns: 0,
    });

    expect(run.warningCaseCount + run.manualReviewCount).toBeGreaterThan(0);
  });

  it("creates default launch checks", () => {
    const checks = defaultLaunchChecks();
    expect(checks.map((item) => item.checkKey)).toContain(
      "production-build-e2e-passed",
    );
  });

  it("blocks launch when critical checks are pending", () => {
    const snapshot = buildLaunchSnapshot(defaultLaunchChecks());
    expect(snapshot.snapshotStatus).toBe("blocked");
    expect(snapshot.blockedCheckCount).toBeGreaterThan(0);
  });

  it("marks ready when checks pass", () => {
    const checks = defaultLaunchChecks().map((item) => ({
      ...item,
      checkStatus: "pass" as const,
    }));
    const snapshot = buildLaunchSnapshot(checks, {
      benchmarkConfidenceScore: 95,
      accuracyScore: 95,
    });
    expect(snapshot.snapshotStatus).toBe("ready");
    expect(snapshot.launchReadinessScore).toBeGreaterThan(80);
  });
});
