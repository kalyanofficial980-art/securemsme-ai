import { describe, expect, it } from "vitest";
import {
  calculatePlanAmount,
  evaluateLegalAcceptance,
  evaluateScanAuthorization,
  getLaunchPlan,
  validateManualPaymentRequest,
} from "@/lib/launch-ready-legal-payment-engine";

describe("launch ready legal payment engine", () => {
  it("calculates yearly amount", () => {
    expect(calculatePlanAmount(getLaunchPlan("growth"), "yearly")).toBe(
      24990,
    );
  });

  it("validates manual payment request", () => {
    const result = validateManualPaymentRequest({
      planKey: "starter",
      billingCycle: "monthly",
      paymentReference: "UTR123456789",
      payerName: "Kalyan",
      payerEmail: "kalyan@example.com",
    });
    expect(result.valid).toBe(true);
    expect(result.amountInr).toBe(999);
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
