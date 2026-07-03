import { describe, expect, it } from "vitest";
import {
  calculateReviewCounts,
  calculateReviewProgress,
  createClientProgressSummary,
  deriveWorkspaceRisk,
  normalizeReviewItemStatus,
} from "@/lib/security-review-workspace-engine";

describe("security review workspace engine", () => {
  it("normalizes invalid status", () => {
    expect(normalizeReviewItemStatus("unknown")).toBe("open");
    expect(normalizeReviewItemStatus("verified-fixed")).toBe("verified-fixed");
  });

  it("calculates lifecycle counts and progress", () => {
    const items = [
      { severity: "High", lifecycle_status: "open" },
      { severity: "Medium", lifecycle_status: "in-progress" },
      { severity: "Low", lifecycle_status: "verified-fixed" },
      { severity: "Info", lifecycle_status: "false-positive" },
    ];

    expect(calculateReviewCounts(items).open).toBe(1);
    expect(calculateReviewProgress(items)).toBe(50);
    expect(deriveWorkspaceRisk(items)).toBe("High attention needed");
  });

  it("creates client summary", () => {
    const summary = createClientProgressSummary([
      { severity: "Low", lifecycle_status: "verified-fixed" },
    ]);

    expect(summary).toContain("100% complete");
    expect(summary).toContain("verified fixed");
  });
});
