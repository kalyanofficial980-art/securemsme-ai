export type DeveloperTaskStatus =
  | "open"
  | "in-progress"
  | "fixed"
  | "retest-requested"
  | "verified-fixed"
  | "blocked"
  | "accepted-risk";

export type DeveloperTaskPriority =
  "Critical" | "High" | "Medium" | "Low" | "Info";
export type DeveloperTaskConfidence =
  "Confirmed" | "High" | "Medium" | "Low" | "Needs manual review";

export type DeveloperTaskInput = {
  sourceType?:
    | "manual"
    | "workspace-bug"
    | "vulnerability-finding"
    | "api-endpoint"
    | "auth-observation"
    | "report-section";
  sourceId?: string | null;
  title: string;
  priority?: DeveloperTaskPriority;
  confidence?: DeveloperTaskConfidence;
  affectedArea?: string;
  evidenceSummary?: string;
  developerFix?: string;
  safeRetestSteps?: string;
  clientSafeNote?: string;
  status?: DeveloperTaskStatus;
};

export type DeveloperTaskDraft = {
  sourceType: string;
  sourceId?: string | null;
  taskTitle: string;
  taskStatus: DeveloperTaskStatus;
  priority: DeveloperTaskPriority;
  confidenceLevel: DeveloperTaskConfidence;
  affectedArea: string;
  developerFix: string;
  safeRetestSteps: string;
  evidenceSummary: string;
  clientSafeNote: string;
  blockedClaim: string;
  estimatedEffort: string;
  taskPayload: Record<string, unknown>;
};

export type DeveloperPortalSummary = {
  totalTaskCount: number;
  openTaskCount: number;
  inProgressTaskCount: number;
  fixedTaskCount: number;
  retestRequestedCount: number;
  verifiedFixedCount: number;
  blockedTaskCount: number;
  fixProgressScore: number;
  developerReadinessScore: number;
  retestReadinessScore: number;
  developerSummary: string;
  clientSafeSummary: string;
  retestSummary: string;
  blockedClaims: string[];
};

export const developerPortalBlockedClaims = [
  "Do not include exploit payloads in developer tasks.",
  "Do not expose private customer data.",
  "Do not share passwords, tokens or session cookies.",
  "Do not claim a fix is verified until retest evidence exists.",
  "Do not mark low-confidence signals as confirmed defects.",
  "Do not request destructive testing.",
  "Do not include payment/order mutation steps.",
];

export function sanitizeDeveloperText(value: string) {
  const forbidden = [
    /password\s*[:=]\s*\S+/gi,
    /token\s*[:=]\s*\S+/gi,
    /session\s*[:=]\s*\S+/gi,
    /cookie\s*[:=]\s*\S+/gi,
    /authorization\s*:\s*bearer\s+\S+/gi,
  ];

  let text = value || "";
  for (const pattern of forbidden)
    text = text.replace(pattern, "[redacted-secret]");
  return text.slice(0, 4000);
}

export function safeDeveloperComment(comment: string) {
  const lowered = comment.toLowerCase();
  const unsafe =
    lowered.includes("password=") ||
    lowered.includes("session=") ||
    lowered.includes("authorization: bearer") ||
    lowered.includes("<script>alert") ||
    lowered.includes("drop table") ||
    lowered.includes("delete all");

  return {
    safe: !unsafe,
    body: sanitizeDeveloperText(comment),
    blockedReason: unsafe
      ? "Comment may contain secret, exploit payload or destructive instruction."
      : "",
  };
}

export function buildDeveloperTask(
  input: DeveloperTaskInput,
): DeveloperTaskDraft {
  const priority = input.priority || "Medium";
  const confidenceLevel = input.confidence || "Medium";
  const taskStatus = input.status || "open";
  const affectedArea = sanitizeDeveloperText(
    input.affectedArea || "Website application",
  );
  const evidenceSummary = sanitizeDeveloperText(
    input.evidenceSummary ||
      "Evidence summary should be added before client delivery.",
  );
  const developerFix = sanitizeDeveloperText(
    input.developerFix || defaultFixForPriority(priority),
  );
  const safeRetestSteps = sanitizeDeveloperText(
    input.safeRetestSteps ||
      "Apply the fix in staging/production, then request a safe retest. Do not run destructive validation.",
  );
  const clientSafeNote = sanitizeDeveloperText(
    input.clientSafeNote || "Developer action is recommended for this item.",
  );
  const taskTitle = sanitizeDeveloperText(input.title || "Developer fix task");

  return {
    sourceType: input.sourceType || "manual",
    sourceId: input.sourceId || null,
    taskTitle,
    taskStatus,
    priority,
    confidenceLevel,
    affectedArea,
    developerFix,
    safeRetestSteps,
    evidenceSummary,
    clientSafeNote,
    blockedClaim: blockedClaimForConfidence(confidenceLevel),
    estimatedEffort: estimateEffort(priority),
    taskPayload: {
      sourceType: input.sourceType || "manual",
      safeLanguage: true,
      noExploitPayloads: true,
      noPrivateData: true,
    },
  };
}

function defaultFixForPriority(priority: DeveloperTaskPriority) {
  if (priority === "Critical" || priority === "High") {
    return "Prioritize server-side validation, authorization checks, secure defaults and retesting after deployment.";
  }
  if (priority === "Medium")
    return "Review configuration, apply recommended hardening and retest safely.";
  return "Schedule as a quick hardening improvement and verify after change.";
}

function blockedClaimForConfidence(confidence: DeveloperTaskConfidence) {
  if (confidence === "Confirmed" || confidence === "High")
    return "Do not claim verified fixed until retest evidence confirms it.";
  return "Do not present this as a confirmed defect until manual validation improves confidence.";
}

function estimateEffort(priority: DeveloperTaskPriority) {
  if (priority === "Critical") return "1-2 days";
  if (priority === "High") return "4-8 hours";
  if (priority === "Medium") return "2-4 hours";
  if (priority === "Low") return "30-90 minutes";
  return "15-30 minutes";
}

export function calculateDeveloperPortalSummary(
  tasks: Array<
    Pick<DeveloperTaskDraft, "taskStatus" | "priority" | "confidenceLevel">
  >,
): DeveloperPortalSummary {
  const totalTaskCount = tasks.length;
  const openTaskCount = tasks.filter(
    (task) => task.taskStatus === "open",
  ).length;
  const inProgressTaskCount = tasks.filter(
    (task) => task.taskStatus === "in-progress",
  ).length;
  const fixedTaskCount = tasks.filter(
    (task) => task.taskStatus === "fixed",
  ).length;
  const retestRequestedCount = tasks.filter(
    (task) => task.taskStatus === "retest-requested",
  ).length;
  const verifiedFixedCount = tasks.filter(
    (task) => task.taskStatus === "verified-fixed",
  ).length;
  const blockedTaskCount = tasks.filter(
    (task) => task.taskStatus === "blocked",
  ).length;
  const acceptedRiskCount = tasks.filter(
    (task) => task.taskStatus === "accepted-risk",
  ).length;

  const completed = verifiedFixedCount + acceptedRiskCount;
  const fixProgressScore = totalTaskCount
    ? Math.round((completed / totalTaskCount) * 100)
    : 0;
  const developerReadinessScore = totalTaskCount
    ? Math.min(
        100,
        Math.round(
          ((fixedTaskCount +
            retestRequestedCount +
            verifiedFixedCount +
            acceptedRiskCount) /
            totalTaskCount) *
            100,
        ),
      )
    : 0;
  const retestReadinessScore = totalTaskCount
    ? Math.min(
        100,
        Math.round(
          ((fixedTaskCount + retestRequestedCount) / totalTaskCount) * 100,
        ),
      )
    : 0;

  return {
    totalTaskCount,
    openTaskCount,
    inProgressTaskCount,
    fixedTaskCount,
    retestRequestedCount,
    verifiedFixedCount,
    blockedTaskCount,
    fixProgressScore,
    developerReadinessScore,
    retestReadinessScore,
    developerSummary: `${totalTaskCount} developer task(s), ${openTaskCount} open, ${inProgressTaskCount} in progress, ${fixedTaskCount} fixed and ${verifiedFixedCount} verified fixed.`,
    clientSafeSummary: `${completed} of ${totalTaskCount} remediation item(s) are completed or accepted. Retest evidence is required before verified-fixed claims.`,
    retestSummary: `${fixedTaskCount + retestRequestedCount} task(s) are ready or queued for safe retest.`,
    blockedClaims: developerPortalBlockedClaims,
  };
}

export function statusNextAction(status: DeveloperTaskStatus) {
  switch (status) {
    case "open":
      return "Assign owner and start fix.";
    case "in-progress":
      return "Complete fix and mark fixed.";
    case "fixed":
      return "Request safe retest.";
    case "retest-requested":
      return "Wait for safe retest result.";
    case "verified-fixed":
      return "Keep evidence in report.";
    case "blocked":
      return "Resolve blocker or accept risk.";
    case "accepted-risk":
      return "Document business acceptance.";
  }
}
