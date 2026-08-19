export type LaunchPlanKey = "free" | "starter" | "growth" | "agency";

export type LaunchPlan = {
  key: LaunchPlanKey;
  name: string;
  amountInr: number;
  monthlyScans: number;
  websites: number;
  reports: number;
  monitoringTargets: number;
  supportLevel: string;
  bestFor: string;
};

export type ManualPaymentRequestInput = {
  planKey: LaunchPlanKey;
  billingCycle: "monthly" | "yearly";
  paymentReference: string;
  payerName: string;
  payerEmail: string;
  payerPhone?: string;
  paymentNote?: string;
};

export const launchPlans: LaunchPlan[] = [
  {
    key: "free",
    name: "Free",
    amountInr: 0,
    monthlyScans: 3,
    websites: 1,
    reports: 3,
    monitoringTargets: 1,
    supportLevel: "Basic support",
    bestFor: "Evaluation",
  },
  {
    key: "starter",
    name: "Starter",
    amountInr: 999,
    monthlyScans: 20,
    websites: 1,
    reports: 20,
    monitoringTargets: 1,
    supportLevel: "Email support",
    bestFor: "First paid security workflow",
  },
  {
    key: "growth",
    name: "Growth",
    amountInr: 2499,
    monthlyScans: 100,
    websites: 5,
    reports: 100,
    monitoringTargets: 5,
    supportLevel: "Priority email",
    bestFor: "Developer remediation and repeated reviews",
  },
  {
    key: "agency",
    name: "Agency",
    amountInr: 6999,
    monthlyScans: 500,
    websites: 25,
    reports: 500,
    monitoringTargets: 25,
    supportLevel: "Agency support",
    bestFor: "High-volume client reporting workflow",
  },
];

export const manualPaymentBlockedClaims = [
  "Do not claim payment is approved until admin review is completed.",
  "Do not collect card data in manual payment flow.",
  "Do not store bank passwords, UPI PINs or private payment credentials.",
  "Do not activate paid limits before payment approval.",
];

export const legalBlockedClaims = [
  "Do not claim these templates replace legal advice.",
  "Do not claim VeyraSec guarantees 100% security.",
  "Do not claim all vulnerabilities will be found.",
  "Do not claim legal compliance certification.",
  "Do not allow unauthorized scanning.",
];

export function getLaunchPlan(planKey: string): LaunchPlan {
  return launchPlans.find((plan) => plan.key === planKey) || launchPlans[1];
}

export function calculatePlanAmount(
  plan: LaunchPlan,
  billingCycle: "monthly" | "yearly",
) {
  return billingCycle === "yearly"
    ? Math.round(plan.amountInr * 10)
    : plan.amountInr;
}

export function validateManualPaymentRequest(input: ManualPaymentRequestInput) {
  const plan = getLaunchPlan(input.planKey);
  const amountInr = calculatePlanAmount(plan, input.billingCycle);
  const errors: string[] = [];
  const combined =
    `${input.paymentReference} ${input.paymentNote || ""}`.toLowerCase();

  if (plan.key === "free")
    errors.push("Free plan does not require a payment request.");
  if (!input.paymentReference.trim())
    errors.push("Payment reference or UTR number is required.");
  if (!input.payerName.trim()) errors.push("Payer name is required.");
  if (!/^\S+@\S+\.\S+$/.test(input.payerEmail.trim()))
    errors.push("Valid payer email is required.");
  if (
    combined.includes("password") ||
    combined.includes("upi pin") ||
    combined.includes("otp")
  ) {
    errors.push(
      "Do not submit passwords, UPI PINs, OTPs or private payment credentials.",
    );
  }

  return {
    valid: errors.length === 0,
    status: errors.length === 0 ? "submitted_for_review" : "pending_payment",
    plan,
    amountInr,
    errors,
    instructions: `Pay ₹${amountInr} manually by UPI or bank transfer. Submit the UTR/reference number. Your plan activates only after admin approval.`,
    blockedClaims: manualPaymentBlockedClaims,
  };
}

export function evaluateLegalAcceptance(state: {
  hasAcceptedTerms: boolean;
  hasAcceptedPrivacy: boolean;
  hasAcceptedAcceptableUse: boolean;
  hasAcceptedRefund: boolean;
  hasAcceptedDataProcessing: boolean;
  hasAcceptedDisclaimer: boolean;
}) {
  const missing: string[] = [];
  if (!state.hasAcceptedTerms) missing.push("Terms and Conditions");
  if (!state.hasAcceptedPrivacy) missing.push("Privacy Policy");
  if (!state.hasAcceptedAcceptableUse) missing.push("Acceptable Use Policy");
  if (!state.hasAcceptedRefund) missing.push("Refund Policy");
  if (!state.hasAcceptedDataProcessing) missing.push("Data Processing Notice");
  if (!state.hasAcceptedDisclaimer) missing.push("Disclaimer");

  return {
    accepted: missing.length === 0,
    missing,
    message: missing.length
      ? `Please accept: ${missing.join(", ")}.`
      : "Required legal documents accepted.",
    blockedClaims: legalBlockedClaims,
  };
}

export function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

export function evaluateScanAuthorization(input: {
  targetUrl: string;
  ownsOrHasPermission: boolean;
  safeChecksOnly: boolean;
  noUnauthorizedTesting: boolean;
}) {
  const targetUrl = normalizeUrl(input.targetUrl);
  const errors: string[] = [];

  if (!targetUrl) errors.push("Target URL is required.");
  if (!input.ownsOrHasPermission)
    errors.push("You must own the website or have written permission.");
  if (!input.safeChecksOnly) errors.push("You must confirm safe checks only.");
  if (!input.noUnauthorizedTesting)
    errors.push("You must confirm no unauthorized testing.");
  if (targetUrl && !/^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(targetUrl))
    errors.push("Enter a valid website URL.");

  return {
    allowed: errors.length === 0,
    targetUrl,
    errors,
    confirmationText:
      "I confirm I own this website or have written permission, I request safe checks only, and I will not use VeyraSec for unauthorized testing.",
  };
}
