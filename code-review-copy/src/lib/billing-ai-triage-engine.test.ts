import { describe, expect, it } from "vitest";
import {
  buildTriageItem,
  buildTriageRun,
  defaultBillingPlans,
  evaluateUsageLimit,
  sanitizeTriageText,
} from "@/lib/billing-ai-triage-engine";

describe("billing ai triage engine", () => {
  it("evaluates usage limit", () => {
    const decision = evaluateUsageLimit(
      defaultBillingPlans[0],
      {
        scansUsed: 2,
        websitesUsed: 1,
        reportsUsed: 0,
        clientPortalsUsed: 0,
        monitoringTargetsUsed: 0,
        aiTriageUsed: 0,
      },
      "scans",
      1,
    );

    expect(decision.allowed).toBe(true);
    expect(decision.percentage).toBe(100);
  });

  it("blocks usage over limit", () => {
    const decision = evaluateUsageLimit(
      defaultBillingPlans[0],
      {
        scansUsed: 3,
        websitesUsed: 1,
        reportsUsed: 0,
        clientPortalsUsed: 0,
        monitoringTargetsUsed: 0,
        aiTriageUsed: 0,
      },
      "scans",
      1,
    );

    expect(decision.allowed).toBe(false);
    expect(decision.status).toBe("blocked");
  });

  it("sanitizes secrets", () => {
    expect(sanitizeTriageText("token=abc123")).toContain("[redacted-secret]");
  });

  it("builds urgent triage item", () => {
    const item = buildTriageItem({
      sourceType: "monitoring-alert",
      title: "Critical failed retest",
      severity: "Critical",
      confidence: "Confirmed",
      retestStatus: "failed",
    });

    expect(item.priority).toBe("Urgent");
    expect(item.triageScore).toBeGreaterThan(70);
  });

  it("builds triage run with ordered items", () => {
    const run = buildTriageRun([
      {
        sourceType: "developer-task",
        title: "Low header fix",
        severity: "Low",
        confidence: "High",
      },
      {
        sourceType: "monitoring-alert",
        title: "Critical regression",
        severity: "Critical",
        confidence: "Confirmed",
      },
      {
        sourceType: "retest-item",
        title: "Needs manual review",
        severity: "Medium",
        confidence: "Needs manual review",
      },
    ]);

    expect(run.totalItemCount).toBe(3);
    expect(run.items[0].priority).toBe("Urgent");
    expect(run.needsReviewCount).toBe(1);
  });
});
