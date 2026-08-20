import { describe, expect, it } from "vitest";
import {
  calculatePlanAmount,
  evaluateLegalAcceptance,
  evaluateScanAuthorization,
  getLaunchPlan,
  validateManualPaymentRequest,
} from "@/lib/launch-ready-legal-payment-engine";

describe("launch ready legal payment engine", () => {
  it("calculates yearly amount for future pricing use", () => {
    expect(calculatePlanAmount(getLaunchPlan("growth"), "yearly")).toBe(
      24990,
    );
  });

  it("validates monthly manual payment request", () => {
    const result = validateManualPaymentRequest({
      planKey: "starter",
      billingCycle: "monthly",
      paymentReference: "UTR123456789",
      payerName: "Kalyan",
      payerEmail: "kalyan@example.com",
    });
    expect(result.valid).toBe(true);
    expect(result.amountInr).toBe(999);
    expect(result.billingCycle).toBe("monthly");
  });

  it("rejects yearly activation during assisted launch", () => {
    const result = validateManualPaymentRequest({
      planKey: "growth",
      billingCycle: "yearly",
      paymentReference: "UTR123456789",
      payerName: "Kalyan",
      payerEmail: "kalyan@example.com",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Only monthly activation");
  });

  it("rejects a crafted unknown plan instead of silently treating it as Starter", () => {
    const result = validateManualPaymentRequest({
      planKey: "enterprise" as never,
      billingCycle: "monthly",
      paymentReference: "UTR123456789",
      payerName: "Kalyan",
      payerEmail: "kalyan@example.com",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("valid paid plan");
  });

  it("blocks private credentials in payment fields", () => {
    const result = validateManualPaymentRequest({
      planKey: "starter",
      billingCycle: "monthly",
      paymentReference: "otp=123456",
      payerName: "Kalyan",
      payerEmail: "kalyan@example.com",
    });
    expect(result.valid).toBe(false);
  });

  it("checks legal acceptance", () => {
    const result = evaluateLegalAcceptance({
      hasAcceptedTerms: true,
      hasAcceptedPrivacy: true,
      hasAcceptedAcceptableUse: true,
      hasAcceptedRefund: true,
      hasAcceptedDataProcessing: true,
      hasAcceptedDisclaimer: true,
    });
    expect(result.accepted).toBe(true);
  });

  it("requires scan authorization", () => {
    const result = evaluateScanAuthorization({
      targetUrl: "example.com",
      ownsOrHasPermission: true,
      safeChecksOnly: true,
      noUnauthorizedTesting: true,
    });
    expect(result.allowed).toBe(true);
    expect(result.targetUrl).toBe("https://example.com");
  });
});
