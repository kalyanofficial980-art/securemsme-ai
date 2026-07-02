export type BusinessType =
  "msme" | "startup" | "agency" | "freelancer" | "ngo" | "enterprise" | "other";
export type PrimaryGoal =
  | "first-security-check"
  | "client-report"
  | "developer-fixes"
  | "scheduled-monitoring"
  | "repo-security"
  | "cloud-config"
  | "agency-workflow";
export type SecurityMaturity = "beginner" | "basic" | "growing" | "advanced";
export type Plan = "starter" | "growth" | "agency" | "enterprise-review";

export type OnboardingInput = {
  businessName: string;
  businessType: BusinessType;
  teamSize: string;
  primaryGoal: PrimaryGoal;
  securityMaturity: SecurityMaturity;
  hasWebsiteConfirmed: boolean;
  legalAccepted: boolean;
  billingStarted: boolean;
  firstScanReady: boolean;
};

export type OnboardingStep = {
  stepKey: string;
  stepTitle: string;
  stepStatus: "pending" | "completed" | "skipped" | "blocked" | "needs-review";
  stepOrder: number;
  stepSummary: string;
  actionUrl: string;
  requiredBeforeLaunch: boolean;
};

export type PlanRecommendation = {
  recommendedPlan: Plan;
  recommendationScore: number;
  recommendationReason: string;
  includedFeatures: string[];
  nextBestAction: string;
  billingCta: string;
};

export type OnboardingResult = {
  onboardingStatus:
    | "started"
    | "profile-completed"
    | "website-confirmed"
    | "plan-recommended"
    | "first-scan-ready"
    | "completed"
    | "paused";
  onboardingProgress: number;
  recommendedPlan: Plan;
  steps: OnboardingStep[];
  recommendation: PlanRecommendation;
  summary: string;
};

export const onboardingBlockedClaims = [
  "Do not claim a website is secure before scanning and review.",
  "Do not claim all vulnerabilities will be found.",
  "Do not claim legal compliance certification.",
  "Do not run scans without ownership or written permission.",
  "Do not collect card, UPI PIN, OTP or banking password data.",
];

export function recommendPlan(input: OnboardingInput): PlanRecommendation {
  let score = 25;
  let plan: Plan = "starter";
  const features = [
    "Authorized first scan",
    "Client-safe basic report",
    "Developer fix checklist",
  ];

  if (
    input.primaryGoal === "client-report" ||
    input.primaryGoal === "developer-fixes"
  ) {
    score += 20;
    plan = "growth";
    features.push("Advanced report workflow", "Developer remediation portal");
  }

  if (
    input.primaryGoal === "scheduled-monitoring" ||
    input.securityMaturity === "growing"
  ) {
    score += 25;
    plan = "growth";
    features.push("Scheduled scans", "Email alert queue", "Retest proof");
  }

  if (
    input.primaryGoal === "repo-security" ||
    input.primaryGoal === "cloud-config"
  ) {
    score += 18;
    if (plan === "starter") plan = "growth";
    features.push("Repo/dependency review", "Cloud config checklist");
  }

  if (
    input.businessType === "agency" ||
    input.primaryGoal === "agency-workflow"
  ) {
    score += 35;
    plan = "agency";
    features.push(
      "Multi-client workflow",
      "Admin observability",
      "Agency SOC views",
    );
  }

  if (input.businessType === "enterprise" || input.teamSize === "200+") {
    score += 45;
    plan = "enterprise-review";
    features.push(
      "Manual review",
      "Custom onboarding",
      "Security process mapping",
    );
  }

  if (input.securityMaturity === "beginner") {
    features.push("Guided setup", "Safety reminders");
  }

  const uniqueFeatures = Array.from(new Set(features));

  const reason =
    plan === "starter"
      ? "Starter is best for a first authorized website scan and simple launch security report."
      : plan === "growth"
        ? "Growth is recommended because the selected goals need reports, fixes, monitoring, repo or cloud security workflows."
        : plan === "agency"
          ? "Agency is recommended because the workflow is focused on serving multiple clients and repeated security reviews."
          : "Enterprise review is recommended because the organization size or complexity needs manual review before plan selection.";

  return {
    recommendedPlan: plan,
    recommendationScore: Math.min(100, score),
    recommendationReason: reason,
    includedFeatures: uniqueFeatures,
    nextBestAction:
      plan === "enterprise-review"
        ? "Request manual review through support before production onboarding."
        : "Complete authorization and run the first safe scan workflow.",
    billingCta:
      plan === "starter"
        ? "Start manual billing for Starter after first scan review."
        : plan === "growth"
          ? "Start manual billing for Growth when scheduled monitoring or developer fixes are needed."
          : plan === "agency"
            ? "Start manual billing for Agency after client workflow setup."
            : "Contact support for Enterprise review.",
  };
}

export function buildOnboardingSteps(input: OnboardingInput): OnboardingStep[] {
  return [
    {
      stepKey: "business-profile",
      stepTitle: "Business profile",
      stepStatus: input.businessName ? "completed" : "pending",
      stepOrder: 1,
      stepSummary: input.businessName
        ? "Business profile is saved."
        : "Add business name, industry and primary security goal.",
      actionUrl: "/onboarding",
      requiredBeforeLaunch: true,
    },
    {
      stepKey: "legal-acceptance",
      stepTitle: "Legal acceptance",
      stepStatus: input.legalAccepted ? "completed" : "pending",
      stepOrder: 2,
      stepSummary: input.legalAccepted
        ? "Legal acceptance is marked complete."
        : "Accept Terms, Privacy, Acceptable Use and disclaimer before paid launch.",
      actionUrl: "/legal-acceptance",
      requiredBeforeLaunch: true,
    },
    {
      stepKey: "website-authorization",
      stepTitle: "Website authorization",
      stepStatus: input.hasWebsiteConfirmed ? "completed" : "pending",
      stepOrder: 3,
      stepSummary: input.hasWebsiteConfirmed
        ? "Website ownership/written permission is confirmed."
        : "Confirm website ownership or written permission.",
      actionUrl: "/onboarding/first-scan",
      requiredBeforeLaunch: true,
    },
    {
      stepKey: "first-safe-scan",
      stepTitle: "First safe scan",
      stepStatus: input.firstScanReady
        ? "completed"
        : input.hasWebsiteConfirmed
          ? "pending"
          : "blocked",
      stepOrder: 4,
      stepSummary: input.firstScanReady
        ? "First scan funnel is ready."
        : "Prepare the first safe scan workflow.",
      actionUrl: "/onboarding/first-scan",
      requiredBeforeLaunch: true,
    },
    {
      stepKey: "manual-billing",
      stepTitle: "Manual billing",
      stepStatus: input.billingStarted ? "completed" : "pending",
      stepOrder: 5,
      stepSummary: input.billingStarted
        ? "Manual billing step is started."
        : "Use manual billing approval if customer is ready to pay.",
      actionUrl: "/manual-billing",
      requiredBeforeLaunch: false,
    },
  ];
}

export function evaluateOnboarding(input: OnboardingInput): OnboardingResult {
  const steps = buildOnboardingSteps(input);
  const completed = steps.filter(
    (step) => step.stepStatus === "completed",
  ).length;
  const progress = Math.round((completed / steps.length) * 100);
  const recommendation = recommendPlan(input);

  let status: OnboardingResult["onboardingStatus"] = "started";
  if (input.businessName) status = "profile-completed";
  if (input.hasWebsiteConfirmed) status = "website-confirmed";
  if (recommendation.recommendedPlan) status = "plan-recommended";
  if (input.firstScanReady) status = "first-scan-ready";
  if (progress >= 80 && input.legalAccepted && input.firstScanReady)
    status = "completed";

  return {
    onboardingStatus: status,
    onboardingProgress: progress,
    recommendedPlan: recommendation.recommendedPlan,
    steps,
    recommendation,
    summary: `Onboarding is ${progress}% complete. Recommended plan: ${recommendation.recommendedPlan}. Next action: ${recommendation.nextBestAction}`,
  };
}

export function normalizeWebsiteUrl(value: string) {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

export function firstScanClientSummary(
  websiteUrl: string,
  ownershipStatus: string,
) {
  return `First scan funnel is ready for ${websiteUrl}. Authorization status: ${ownershipStatus}. Use only safe, authorized checks.`;
}
