import { describe, expect, it } from "vitest";
import {
  evaluateOnboarding,
  firstScanClientSummary,
  normalizeWebsiteUrl,
  recommendPlan,
} from "@/lib/customer-onboarding-engine";

describe("customer onboarding engine", () => {
  it("recommends starter for simple first scan", () => {
    const rec = recommendPlan({
      businessName: "Test MSME",
      businessType: "msme",
      teamSize: "1-5",
      primaryGoal: "first-security-check",
      securityMaturity: "beginner",
      hasWebsiteConfirmed: false,
      legalAccepted: false,
      billingStarted: false,
      firstScanReady: false,
    });

    expect(rec.recommendedPlan).toBe("starter");
  });

  it("recommends agency for agency workflow", () => {
    const rec = recommendPlan({
      businessName: "Agency",
      businessType: "agency",
      teamSize: "6-20",
      primaryGoal: "agency-workflow",
      securityMaturity: "growing",
      hasWebsiteConfirmed: true,
      legalAccepted: true,
      billingStarted: false,
      firstScanReady: true,
    });

    expect(rec.recommendedPlan).toBe("agency");
  });

  it("evaluates progress", () => {
    const result = evaluateOnboarding({
      businessName: "Shop",
      businessType: "msme",
      teamSize: "1-5",
      primaryGoal: "developer-fixes",
      securityMaturity: "basic",
      hasWebsiteConfirmed: true,
      legalAccepted: true,
      billingStarted: false,
      firstScanReady: true,
    });

    expect(result.onboardingProgress).toBeGreaterThan(50);
  });

  it("normalizes website url", () => {
    expect(normalizeWebsiteUrl("example.com")).toBe("https://example.com");
  });

  it("creates client summary", () => {
    expect(
      firstScanClientSummary("https://example.com", "confirmed-owner"),
    ).toContain("authorized");
  });
});
