export type PublicPlan = "starter" | "growth" | "agency" | "enterprise-review";

export type PublicDemoInput = {
  fullName: string;
  workEmail: string;
  companyName: string;
  websiteUrl: string;
  businessType:
    | "msme"
    | "startup"
    | "agency"
    | "freelancer"
    | "ngo"
    | "enterprise"
    | "other";
  teamSize: "1" | "1-5" | "6-20" | "21-50" | "51-200" | "200+" | "unknown";
  primaryNeed:
    | "first-security-check"
    | "client-report"
    | "developer-fixes"
    | "scheduled-monitoring"
    | "repo-security"
    | "cloud-config"
    | "agency-workflow"
    | "not-sure";
  requestedPlan: PublicPlan | "not-sure";
  urgency: "today" | "this-week" | "this-month" | "researching";
};

export type PricingPlan = {
  plan: PublicPlan;
  name: string;
  priceLabel: string;
  description: string;
  bestFor: string;
  features: string[];
  cta: string;
  safetyNote: string;
};

export const publicLaunchBlockedClaims = [
  "Do not claim 100% security.",
  "Do not claim all vulnerabilities are found.",
  "Do not claim legal compliance certification.",
  "Do not collect card, OTP, UPI PIN, banking password or cloud secrets.",
  "Do not imply scans can be run without authorization.",
];

export const pricingPlans: PricingPlan[] = [
  {
    plan: "starter",
    name: "Starter",
    priceLabel: "₹999/month",
    description:
      "For a small business that wants repeatable website checks, reports and retests without enterprise complexity.",
    bestFor: "First paid security workflow",
    features: [
      "20 scans per month",
      "Authorized website scans",
      "Client-safe report and PDF",
      "Fix checklist and retest comparison",
    ],
    cta: "Subscribe to Starter",
    safetyNote:
      "Recurring monthly plan. Security review only; not a compliance certificate.",
  },
  {
    plan: "growth",
    name: "Growth",
    priceLabel: "₹2,499/month",
    description:
      "For growing teams that need more scan capacity and ownership-verified deeper passive evidence.",
    bestFor: "Developer remediation and repeated reviews",
    features: [
      "100 scans per month",
      "Everything in Starter",
      "Ownership-verified deep passive scans",
      "Technology and attack-surface evidence",
      "Retest comparison history",
    ],
    cta: "Subscribe to Growth",
    safetyNote:
      "Deep scans require current ownership proof and permission. No exploitation or destructive testing.",
  },
  {
    plan: "agency",
    name: "Agency",
    priceLabel: "₹6,999/month",
    description:
      "For agencies operating repeatable authorized security reviews across multiple client websites.",
    bestFor: "High-volume client reporting workflow",
    features: [
      "500 scans per month",
      "Everything in Growth",
      "Multi-website workflow",
      "Reusable client-ready reports",
      "Ownership and permission controls for client websites",
    ],
    cta: "Subscribe to Agency",
    safetyNote:
      "Every client website still requires ownership or written permission before authorized deep scanning.",
  },
  {
    plan: "enterprise-review",
    name: "Enterprise Review",
    priceLabel: "Custom",
    description: "For larger teams that need manual review before onboarding.",
    bestFor: "Complex environments and custom review",
    features: [
      "Manual scoping",
      "Custom onboarding",
      "Security workflow review",
      "Support coordination",
      "Enterprise-safe reporting",
    ],
    cta: "Contact support",
    safetyNote:
      "Manual review is required before any enterprise security or compliance claim.",
  },
];

export function normalizePublicWebsiteUrl(value: string) {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

export function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());
}

export function calculateLeadScore(input: PublicDemoInput) {
  let score = 15;

  if (isLikelyEmail(input.workEmail)) score += 15;
  if (input.companyName.trim()) score += 10;
  if (input.websiteUrl.trim()) score += 15;

  if (input.urgency === "today") score += 25;
  if (input.urgency === "this-week") score += 20;
  if (input.urgency === "this-month") score += 10;

  if (input.primaryNeed === "agency-workflow") score += 20;
  if (
    input.primaryNeed === "scheduled-monitoring" ||
    input.primaryNeed === "developer-fixes"
  )
    score += 15;
  if (
    input.primaryNeed === "repo-security" ||
    input.primaryNeed === "cloud-config"
  )
    score += 12;

  if (input.requestedPlan === "agency") score += 20;
  if (input.requestedPlan === "growth") score += 15;
  if (input.requestedPlan === "enterprise-review") score += 18;

  if (input.businessType === "agency" || input.businessType === "enterprise")
    score += 15;
  if (input.teamSize === "51-200" || input.teamSize === "200+") score += 10;

  return Math.min(100, score);
}

export function leadStatusFromScore(score: number) {
  if (score >= 75) return "qualified";
  if (score >= 45) return "new";
  return "new";
}

export function buildClientSafeDemoSummary(
  input: PublicDemoInput,
  score: number,
) {
  const website =
    normalizePublicWebsiteUrl(input.websiteUrl) || "website not provided";
  return `Demo request received for ${input.companyName || input.fullName || "new lead"} (${website}). Primary need: ${input.primaryNeed}. Suggested follow-up priority: ${score >= 75 ? "high" : score >= 45 ? "medium" : "normal"}.`;
}

export function selectPlanForNeed(
  need: PublicDemoInput["primaryNeed"],
  businessType: PublicDemoInput["businessType"],
): PublicPlan {
  if (businessType === "enterprise") return "enterprise-review";
  if (businessType === "agency" || need === "agency-workflow") return "agency";
  if (
    need === "developer-fixes" ||
    need === "scheduled-monitoring" ||
    need === "repo-security" ||
    need === "cloud-config" ||
    need === "client-report"
  )
    return "growth";
  return "starter";
}

export function pricingInterestReason(plan: PublicPlan, expectedUsage: string) {
  if (plan === "starter")
    return "Starter interest captured for first website scan and simple report workflow.";
  if (plan === "growth")
    return "Growth interest captured for deeper remediation and repeated authorized review workflow.";
  if (plan === "agency")
    return `Agency interest captured for ${expectedUsage} usage. Confirm client authorization workflow before launch.`;
  return "Enterprise review interest captured. Manual scoping is recommended before pricing or security claims.";
}
