import { describe, expect, it } from "vitest";
import {
  buildAuthenticatedObservation,
  buildRoleComparison,
  calculateAuthCoverageScore,
  calculateAuthRiskScore,
  classifyAuthenticatedPage,
} from "@/lib/authenticated-safe-review-v2";

describe("authenticated safe review v2", () => {
  it("classifies authenticated pages", () => {
    expect(
      classifyAuthenticatedPage({ pageUrl: "https://example.com/admin" }),
    ).toBe("admin-candidate");
    expect(
      classifyAuthenticatedPage({ pageUrl: "https://example.com/checkout" }),
    ).toBe("checkout-account");
    expect(
      classifyAuthenticatedPage({ pageUrl: "https://example.com/login" }),
    ).toBe("login");
  });

  it("builds safe manual observation", () => {
    const obs = buildAuthenticatedObservation({
      pageUrl: "https://example.com/account/profile",
      roleName: "customer",
      hasCustomerDataField: true,
      notes: "Profile page shows name/email fields in approved test account.",
    });

    expect(obs.containsSensitiveDataSignal).toBe(true);
    expect(obs.blockedClaim).toContain("Do not claim");
  });

  it("detects risky role comparison signal", () => {
    const comparison = buildRoleComparison({
      pageUrl: "https://example.com/admin/orders",
      roleA: "customer",
      roleB: "admin",
      expectedDifference: "Only admin should access this page",
      observedDifference: "Both can access same page",
    });

    expect(comparison.accessControlSignal).toBe("unexpected-same-access");
    expect(comparison.severity).toBe("High");
  });

  it("calculates scores safely", () => {
    expect(
      calculateAuthCoverageScore({
        pageCount: 3,
        checklistCount: 7,
        checkedChecklistCount: 4,
        roleComparisonCount: 1,
        cookieReviewCount: 1,
      }),
    ).toBeGreaterThan(50);

    expect(
      calculateAuthRiskScore({
        sensitivePages: 2,
        accountActionPages: 1,
        roleWarnings: 1,
        checklistNeedsFix: 2,
      }),
    ).toBeGreaterThan(50);
  });
});
