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
    description: "For one website that needs repeatable reviews, reports and retests.",
    bestFor: "Small businesses starting a paid security workflow",
    features: [
      "20 scans per month",
      "1 website",
      "Client-ready report and PDF",
      "Retest comparison",
    ],
    cta: "Choose Starter",
    safetyNote: "Paid access starts only after transaction verification.",
  },
  {
    plan: "growth",
    name: "Growth",
    priceLabel: "₹2,499/month",
    description: "For teams that need deeper ownership-verified evidence and repeated remediation cycles.",
    bestFor: "Growing product and engineering teams",
    features: [
      "100 scans per month",
      "5 websites",
      "Everything in Starter",
      "Ownership-verified Deep Scan",
      "Priority remediation workflow",
    ],
    cta: "Choose Growth",
    safetyNote: "Deep Scan still requires current ownership proof.",
  },
  {
    plan: "agency",
    name: "Agency",
    priceLabel: "₹6,999/month",
    description: "For agencies running repeatable authorized reviews across client websites.",
    bestFor: "High-volume client security review workflows",
    features: [
      "500 scans per month",
      "25 websites",
      "Everything in Growth",
      "Multi-client website workflow",
      "Reusable client-ready reports",
    ],
    cta: "Choose Agency",
    safetyNote: "Every client website still requires ownership or written permission.",
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
  if (businessType === "enterprise") return "agency";
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
  return "Custom interest captured. Route the lead to the standard Agency or Growth plans before payment activation.";
}
