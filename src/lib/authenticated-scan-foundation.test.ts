import { describe, expect, it } from "vitest";
import {
  AUTHENTICATED_SCAN_BLOCKED_ACTIONS,
  buildAuthenticatedScanPlan,
  getAuthenticatedScanSafetyChecklist,
} from "@/lib/authenticated-scan-foundation";

describe("authenticated scan foundation", () => {
  it("blocks request when website is not verified", () => {
    const plan = buildAuthenticatedScanPlan({
      targetUrl: "https://example.com",
      loginUrl: "https://example.com/login",
      verifiedScope: false,
    });

    expect(plan.canRequest).toBe(false);
    expect(plan.blockedReason).toContain("verification");
  });

  it("creates safe request plan for verified scope", () => {
    const plan = buildAuthenticatedScanPlan({
      targetUrl: "https://example.com",
      loginUrl: "https://example.com/login",
      verifiedScope: true,
      allowedPathsText: "/dashboard\n/profile",
      blockedPathsText: "/danger",
    });

    expect(plan.canRequest).toBe(true);
    expect(plan.credentialHandlingMode).toBe("do-not-store-password");
    expect(plan.allowedPaths).toContain("/dashboard");
    expect(plan.blockedPaths).toContain("/danger");
  });

  it("keeps destructive actions blocked", () => {
    expect(AUTHENTICATED_SCAN_BLOCKED_ACTIONS.join(" ")).toContain(
      "No payment/order mutation",
    );
    expect(AUTHENTICATED_SCAN_BLOCKED_ACTIONS.join(" ")).toContain(
      "No password guessing",
    );
    expect(getAuthenticatedScanSafetyChecklist().length).toBeGreaterThan(8);
  });
});
