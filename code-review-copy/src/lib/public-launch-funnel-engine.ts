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
    priceLabel: "Manual billing",
    description:
      "For first-time MSME security check and simple client-safe report.",
    bestFor: "One website, first scan, beginner-friendly setup",
    features: [
      "Authorized website scan",
      "Client-safe report",
      "Basic developer fix checklist",
      "Legal and authorization reminders",
    ],
    cta: "Start first scan",
    safetyNote: "Best for safe first review. Not a compliance certificate.",
  },
  {
    plan: "growth",
    name: "Growth",
    priceLabel: "Manual billing",
    description:
      "For businesses that need fixes, retest proof, monitoring and repo/cloud review.",
    bestFor: "Growing business with developer workflow",
    features: [
      "Everything in Starter",
      "AI Copilot over reports",
      "Scheduled scans",
      "Repo dependency/secrets review",
      "Cloud config checklist",
    ],
    cta: "Request growth demo",
    safetyNote:
      "Security review with safe evidence, not a guarantee all issues are found.",
  },
  {
    plan: "agency",
    name: "Agency",
    priceLabel: "Manual billing",
    description: "For agencies managing multiple client security workflows.",
    bestFor: "Multi-client reporting and repeated reviews",
    features: [
      "Multi-client workflow",
      "Agency SOC views",
      "Admin observability",
      "Reusable client-safe reports",
      "Manual payment approval",
    ],
    cta: "Request agency demo",
    safetyNote: "Client scans require ownership or written permission.",
  },
  {
    plan: "enterprise-review",
    name: "Enterprise Review",
    priceLabel: "Contact support",
    description: "For larger teams that need manual review before onboarding.",
    bestFor: "Complex environments and custom review",
    features: [
      "Manual scoping",
      "Custom onboarding",
      "Cloud/process checklist",
      "Support workflow",
      "Enterprise-safe messaging",
    ],
    cta: "Contact support",
    safetyNote:
      "Manual review is required before any enterprise security claim.",
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
    return "Growth interest captured for deeper remediation, monitoring, repo or cloud config workflow.";
  if (plan === "agency")
    return `Agency interest captured for ${expectedUsage} usage. Confirm client authorization workflow before launch.`;
  return "Enterprise review interest captured. Manual scoping is recommended before pricing or security claims.";
}
