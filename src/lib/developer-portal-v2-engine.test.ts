import { describe, expect, it } from "vitest";
import {
  buildDeveloperTask,
  calculateDeveloperPortalSummary,
  safeDeveloperComment,
  sanitizeDeveloperText,
  statusNextAction,
} from "@/lib/developer-portal-v2-engine";

describe("developer portal v2 engine", () => {
  it("sanitizes secrets", () => {
    expect(sanitizeDeveloperText("token=abc123")).toContain(
      "[redacted-secret]",
    );
  });

  it("blocks unsafe comments", () => {
    const result = safeDeveloperComment("authorization: bearer secret-value");
    expect(result.safe).toBe(false);
    expect(result.body).toContain("[redacted-secret]");
  });

  it("builds safe developer task", () => {
    const task = buildDeveloperTask({
      title: "Fix missing security header",
      priority: "High",
      confidence: "High",
      affectedArea: "Headers",
    });

    expect(task.estimatedEffort).toBe("4-8 hours");
    expect(task.blockedClaim).toContain("Do not claim");
  });

  it("calculates summary", () => {
    const tasks = [
      buildDeveloperTask({ title: "A", status: "open" }),
      buildDeveloperTask({ title: "B", status: "fixed" }),
      buildDeveloperTask({ title: "C", status: "verified-fixed" }),
    ];

    const summary = calculateDeveloperPortalSummary(tasks);
    expect(summary.totalTaskCount).toBe(3);
    expect(summary.verifiedFixedCount).toBe(1);
    expect(summary.retestReadinessScore).toBeGreaterThan(0);
  });

  it("returns next action", () => {
    expect(statusNextAction("fixed")).toBe("Request safe retest.");
  });
});
