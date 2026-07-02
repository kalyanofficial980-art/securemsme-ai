export type PlanKey = "free" | "starter" | "agency" | "pro";
export type UsageKey =
  | "scans"
  | "websites"
  | "reports"
  | "clientPortals"
  | "monitoringTargets"
  | "aiTriage"
  | "teamMembers";

export type BillingPlan = {
  planKey: PlanKey;
  planName: string;
  monthlyPriceInr: number;
  monthlyPriceUsd: number;
  scanLimit: number;
  websiteLimit: number;
  reportLimit: number;
  clientPortalLimit: number;
  monitoringTargetLimit: number;
  aiTriageLimit: number;
  teamMemberLimit: number;
};

export type UsageSnapshot = {
  scansUsed: number;
  websitesUsed: number;
  reportsUsed: number;
  clientPortalsUsed: number;
  monitoringTargetsUsed: number;
  aiTriageUsed: number;
  teamMembersUsed?: number;
};

export type UsageDecision = {
  allowed: boolean;
  warning: boolean;
  usageKey: UsageKey;
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  status: "allowed" | "warning" | "blocked";
  message: string;
};

export type TriageSourceType =
  | "manual"
  | "developer-task"
  | "monitoring-alert"
  | "retest-item"
  | "workspace-bug"
  | "vulnerability-finding";

export type TriageInputItem = {
  sourceType: TriageSourceType;
  sourceId?: string | null;
  title: string;
  status?: string;
  severity?: "Critical" | "High" | "Medium" | "Low" | "Info";
  confidence?: "Confirmed" | "High" | "Medium" | "Low" | "Needs manual review";
  affectedArea?: string;
  evidenceSummary?: string;
  developerAction?: string;
  clientSafeNote?: string;
  retestStatus?: string;
  alertStatus?: string;
};

export type TriageItemDraft = {
  sourceType: TriageSourceType;
  sourceId?: string | null;
  itemTitle: string;
  itemStatus: string;
  priority: "Urgent" | "High" | "Medium" | "Low" | "Quick Win" | "Needs Review";
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  confidenceLevel:
    "Confirmed" | "High" | "Medium" | "Low" | "Needs manual review";
  triageRank: number;
  triageScore: number;
  businessImpactScore: number;
  fixEffortScore: number;
  confidenceScore: number;
  affectedArea: string;
  reasonSummary: string;
  developerAction: string;
  clientSafeNote: string;
  blockedClaim: string;
  itemPayload: Record<string, unknown>;
};

export type TriageRunDraft = {
  totalItemCount: number;
  urgentCount: number;
  highPriorityCount: number;
  quickWinCount: number;
  needsReviewCount: number;
  acceptedRiskCount: number;
  triageScore: number;
  businessImpactScore: number;
  remediationEfficiencyScore: number;
  confidenceScore: number;
  executiveSummary: string;
  developerSummary: string;
  clientSafeSummary: string;
  limitationsSummary: string;
  blockedClaims: string[];
  sourceCounts: Record<string, number>;
  items: TriageItemDraft[];
};

export const billingAiTriageBlockedClaims = [
  "Do not claim AI triage proves a vulnerability is real.",
  "Do not claim 100% security.",
  "Do not claim all vulnerabilities were found.",
  "Do not rank exploit payloads or destructive actions.",
  "Do not expose private customer data in triage.",
  "Do not treat low-confidence signals as confirmed defects.",
  "Do not claim legal compliance certification.",
];

export const defaultBillingPlans: BillingPlan[] = [
  {
    planKey: "free",
    planName: "Free",
    monthlyPriceInr: 0,
    monthlyPriceUsd: 0,
    scanLimit: 3,
    websiteLimit: 1,
    reportLimit: 3,
    clientPortalLimit: 1,
    monitoringTargetLimit: 1,
    aiTriageLimit: 5,
    teamMemberLimit: 1,
  },
  {
    planKey: "starter",
    planName: "Starter",
    monthlyPriceInr: 999,
    monthlyPriceUsd: 12,
    scanLimit: 25,
    websiteLimit: 5,
    reportLimit: 25,
    clientPortalLimit: 10,
    monitoringTargetLimit: 5,
    aiTriageLimit: 50,
    teamMemberLimit: 2,
  },
  {
    planKey: "agency",
    planName: "Agency",
    monthlyPriceInr: 4999,
    monthlyPriceUsd: 60,
    scanLimit: 250,
    websiteLimit: 50,
    reportLimit: 250,
    clientPortalLimit: 100,
    monitoringTargetLimit: 50,
    aiTriageLimit: 500,
    teamMemberLimit: 10,
  },
  {
    planKey: "pro",
    planName: "Pro",
    monthlyPriceInr: 9999,
    monthlyPriceUsd: 120,
    scanLimit: 1000,
    websiteLimit: 200,
    reportLimit: 1000,
    clientPortalLimit: 500,
    monitoringTargetLimit: 200,
    aiTriageLimit: 2000,
    teamMemberLimit: 25,
  },
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function usageValue(usage: UsageSnapshot, key: UsageKey) {
  switch (key) {
    case "scans":
      return usage.scansUsed;
    case "websites":
      return usage.websitesUsed;
    case "reports":
      return usage.reportsUsed;
    case "clientPortals":
      return usage.clientPortalsUsed;
    case "monitoringTargets":
      return usage.monitoringTargetsUsed;
    case "aiTriage":
      return usage.aiTriageUsed;
    case "teamMembers":
      return usage.teamMembersUsed || 1;
  }
}

function limitValue(plan: BillingPlan, key: UsageKey) {
  switch (key) {
    case "scans":
      return plan.scanLimit;
    case "websites":
      return plan.websiteLimit;
    case "reports":
      return plan.reportLimit;
    case "clientPortals":
      return plan.clientPortalLimit;
    case "monitoringTargets":
      return plan.monitoringTargetLimit;
    case "aiTriage":
      return plan.aiTriageLimit;
    case "teamMembers":
      return plan.teamMemberLimit;
  }
}

export function evaluateUsageLimit(
  plan: BillingPlan,
  usage: UsageSnapshot,
  usageKey: UsageKey,
  increment = 1,
): UsageDecision {
  const used = usageValue(usage, usageKey);
  const limit = limitValue(plan, usageKey);
  const usedAfter = used + increment;
  const remaining = Math.max(0, limit - usedAfter);
  const percentage = limit > 0 ? clamp((usedAfter / limit) * 100) : 100;
  const allowed = limit === 0 ? false : usedAfter <= limit;
  const warning = allowed && percentage >= 80;
  const status = !allowed ? "blocked" : warning ? "warning" : "allowed";

  return {
    allowed,
    warning,
    usageKey,
    used: usedAfter,
    limit,
    remaining,
    percentage,
    status,
    message: !allowed
      ? `${usageKey} limit reached for ${plan.planName}. Upgrade or wait for the next billing period.`
      : warning
        ? `${usageKey} usage is above 80% for ${plan.planName}.`
        : `${usageKey} usage is within ${plan.planName} limits.`,
  };
}

function severityScore(severity: string) {
  if (severity === "Critical") return 95;
  if (severity === "High") return 80;
  if (severity === "Medium") return 55;
  if (severity === "Low") return 30;
  return 10;
}

function confidenceScore(confidence: string) {
  if (confidence === "Confirmed") return 95;
  if (confidence === "High") return 80;
  if (confidence === "Medium") return 55;
  if (confidence === "Low") return 30;
  return 20;
}

function sourceWeight(sourceType: TriageSourceType) {
  if (sourceType === "monitoring-alert") return 15;
  if (sourceType === "retest-item") return 12;
  if (sourceType === "developer-task") return 10;
  if (sourceType === "workspace-bug") return 8;
  if (sourceType === "vulnerability-finding") return 8;
  return 3;
}

function effortScore(input: TriageInputItem) {
  const title = `${input.title} ${input.developerAction || ""}`.toLowerCase();
  if (
    title.includes("header") ||
    title.includes("cookie") ||
    title.includes("csp") ||
    title.includes("redirect")
  )
    return 25;
  if (
    title.includes("authorization") ||
    title.includes("access control") ||
    title.includes("payment")
  )
    return 80;
  if (title.includes("api") || title.includes("auth")) return 65;
  return 50;
}

export function buildTriageItem(
  input: TriageInputItem,
  rankSeed = 0,
): TriageItemDraft {
  const severity = input.severity || "Medium";
  const confidenceLevel = input.confidence || "Medium";
  const confidence = confidenceScore(confidenceLevel);
  const effort = effortScore(input);
  const businessImpact = clamp(
    severityScore(severity) * 0.7 +
      sourceWeight(input.sourceType) +
      (input.retestStatus === "failed" ? 15 : 0),
  );
  const triageScore = clamp(
    businessImpact * 0.45 + confidence * 0.35 + (100 - effort) * 0.2,
  );
  const needsReview =
    confidenceLevel === "Low" || confidenceLevel === "Needs manual review";
  const priority = determinePriority(
    triageScore,
    severity,
    effort,
    needsReview,
    input.status || input.alertStatus || input.retestStatus || "",
  );

  return {
    sourceType: input.sourceType,
    sourceId: input.sourceId || null,
    itemTitle: sanitizeTriageText(input.title || "Triage item"),
    itemStatus: sanitizeTriageText(
      input.status || input.alertStatus || input.retestStatus || "open",
    ),
    priority,
    severity,
    confidenceLevel,
    triageRank: rankSeed,
    triageScore,
    businessImpactScore: businessImpact,
    fixEffortScore: effort,
    confidenceScore: confidence,
    affectedArea: sanitizeTriageText(input.affectedArea || ""),
    reasonSummary: buildReasonSummary({
      severity,
      confidenceLevel,
      effort,
      businessImpact,
      triageScore,
      sourceType: input.sourceType,
    }),
    developerAction: sanitizeTriageText(
      input.developerAction ||
        "Review evidence, apply safe remediation and request retest when fixed.",
    ),
    clientSafeNote: sanitizeTriageText(
      input.clientSafeNote ||
        "This item is prioritized for remediation planning. It is not a standalone proof of breach.",
    ),
    blockedClaim: blockedClaimForTriage(confidenceLevel),
    itemPayload: {
      safeTriage: true,
      noExploitPayloads: true,
      sourceType: input.sourceType,
      evidenceSummary: sanitizeTriageText(input.evidenceSummary || ""),
    },
  };
}

function determinePriority(
  score: number,
  severity: string,
  effort: number,
  needsReview: boolean,
  status: string,
): TriageItemDraft["priority"] {
  if (needsReview) return "Needs Review";
  if (status === "accepted-risk") return "Low";
  if (severity === "Critical" || score >= 85) return "Urgent";
  if (severity === "High" || score >= 70) return "High";
  if (effort <= 30 && score >= 45) return "Quick Win";
  if (score >= 40) return "Medium";
  return "Low";
}

function buildReasonSummary(input: {
  severity: string;
  confidenceLevel: string;
  effort: number;
  businessImpact: number;
  triageScore: number;
  sourceType: TriageSourceType;
}) {
  return `Priority is based on ${input.severity} severity, ${input.confidenceLevel} confidence, ${input.effort}/100 effort estimate, ${input.businessImpact}/100 business impact and ${input.sourceType} source.`;
}

function blockedClaimForTriage(confidence: string) {
  if (confidence === "Confirmed" || confidence === "High") {
    return "Do not claim final security assurance; this item is only prioritized for remediation.";
  }
  return "Do not claim this is a confirmed vulnerability until manual validation improves confidence.";
}

export function sanitizeTriageText(value: string) {
  const patterns = [
    /password\s*[:=]\s*\S+/gi,
    /token\s*[:=]\s*\S+/gi,
    /session\s*[:=]\s*\S+/gi,
    /cookie\s*[:=]\s*\S+/gi,
    /authorization\s*:\s*bearer\s+\S+/gi,
    /api[_-]?key\s*[:=]\s*\S+/gi,
  ];

  let text = value || "";
  for (const pattern of patterns)
    text = text.replace(pattern, "[redacted-secret]");
  return text.slice(0, 5000);
}

export function buildTriageRun(items: TriageInputItem[]): TriageRunDraft {
  const triageItems = items
    .map((item, index) => buildTriageItem(item, index + 1))
    .sort((a, b) => b.triageScore - a.triageScore)
    .map((item, index) => ({ ...item, triageRank: index + 1 }));

  const totalItemCount = triageItems.length;
  const urgentCount = triageItems.filter(
    (item) => item.priority === "Urgent",
  ).length;
  const highPriorityCount = triageItems.filter(
    (item) => item.priority === "High",
  ).length;
  const quickWinCount = triageItems.filter(
    (item) => item.priority === "Quick Win",
  ).length;
  const needsReviewCount = triageItems.filter(
    (item) => item.priority === "Needs Review",
  ).length;
  const acceptedRiskCount = triageItems.filter(
    (item) => item.itemStatus === "accepted-risk",
  ).length;

  const average = (
    key: keyof Pick<
      TriageItemDraft,
      | "triageScore"
      | "businessImpactScore"
      | "fixEffortScore"
      | "confidenceScore"
    >,
  ) =>
    totalItemCount
      ? clamp(
          triageItems.reduce((sum, item) => sum + Number(item[key]), 0) /
            totalItemCount,
        )
      : 0;

  const triageScore = average("triageScore");
  const businessImpactScore = average("businessImpactScore");
  const confidence = average("confidenceScore");
  const remediationEfficiencyScore = totalItemCount
    ? clamp(100 - average("fixEffortScore") + quickWinCount * 5)
    : 0;

  const sourceCounts = triageItems.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.sourceType] = (acc[item.sourceType] || 0) + 1;
      return acc;
    },
    {},
  );

  return {
    totalItemCount,
    urgentCount,
    highPriorityCount,
    quickWinCount,
    needsReviewCount,
    acceptedRiskCount,
    triageScore,
    businessImpactScore,
    remediationEfficiencyScore,
    confidenceScore: confidence,
    executiveSummary: `${totalItemCount} item(s) triaged. ${urgentCount} urgent, ${highPriorityCount} high priority, ${quickWinCount} quick win and ${needsReviewCount} need manual review.`,
    developerSummary:
      "Work in rank order: urgent/high first, then quick wins, then manual-review items after validation.",
    clientSafeSummary:
      "AI triage is a prioritization aid only. It does not confirm exploitation or guarantee complete security coverage.",
    limitationsSummary:
      "This triage is rule-based and evidence-aware. Manual expert validation is still required for low-confidence or business-critical items.",
    blockedClaims: billingAiTriageBlockedClaims,
    sourceCounts,
    items: triageItems,
  };
}
