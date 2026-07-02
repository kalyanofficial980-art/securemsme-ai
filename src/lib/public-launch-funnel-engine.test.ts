import { describe, expect, it } from "vitest";
import {
  calculateLeadScore,
  isLikelyEmail,
  normalizePublicWebsiteUrl,
  pricingInterestReason,
  selectPlanForNeed,
} from "@/lib/public-launch-funnel-engine";

describe("public launch funnel engine", () => {
  it("normalizes website url", () => {
    expect(normalizePublicWebsiteUrl("example.com")).toBe(
      "https://example.com",
    );
  });

  it("validates email", () => {
    expect(isLikelyEmail("founder@example.com")).toBe(true);
    expect(isLikelyEmail("wrong")).toBe(false);
  });

  it("scores urgent agency lead higher", () => {
    const score = calculateLeadScore({
      fullName: "Founder",
      workEmail: "founder@example.com",
      companyName: "Agency",
      websiteUrl: "agency.com",
      businessType: "agency",
      teamSize: "6-20",
      primaryNeed: "agency-workflow",
      requestedPlan: "agency",
      urgency: "today",
    });

    expect(score).toBeGreaterThan(75);
  });

  it("selects growth for repo security", () => {
    expect(selectPlanForNeed("repo-security", "startup")).toBe("growth");
  });

  it("creates pricing reason", () => {
    expect(pricingInterestReason("agency", "agency-clients")).toContain(
      "Agency",
    );
  });
});
