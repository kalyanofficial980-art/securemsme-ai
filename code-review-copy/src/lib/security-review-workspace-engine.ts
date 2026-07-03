export type ReviewItemStatus =
  | "open"
  | "in-progress"
  | "fixed-by-developer"
  | "needs-retest"
  | "verified-fixed"
  | "accepted-risk"
  | "false-positive";

export type ReviewStage =
  | "intake"
  | "scope-confirmed"
  | "scanning"
  | "triage"
  | "developer-fix"
  | "retest"
  | "client-approval"
  | "completed";

export type ReviewItem = {
  severity?: string | null;
  lifecycle_status?: ReviewItemStatus | string | null;
};

export const reviewStatusLabels: Record<ReviewItemStatus, string> = {
  open: "Open",
  "in-progress": "In Progress",
  "fixed-by-developer": "Fixed by Developer",
  "needs-retest": "Needs Retest",
  "verified-fixed": "Verified Fixed",
  "accepted-risk": "Accepted Risk",
  "false-positive": "False Positive",
};

export const reviewStageLabels: Record<ReviewStage, string> = {
  intake: "Intake",
  "scope-confirmed": "Scope Confirmed",
  scanning: "Scanning",
  triage: "Triage",
  "developer-fix": "Developer Fix",
  retest: "Retest",
  "client-approval": "Client Approval",
  completed: "Completed",
};

export const reviewStatusOrder: ReviewItemStatus[] = [
  "open",
  "in-progress",
  "fixed-by-developer",
  "needs-retest",
  "verified-fixed",
  "accepted-risk",
  "false-positive",
];

export function normalizeReviewItemStatus(
  value?: string | null,
): ReviewItemStatus {
  if (
    value === "open" ||
    value === "in-progress" ||
    value === "fixed-by-developer" ||
    value === "needs-retest" ||
    value === "verified-fixed" ||
    value === "accepted-risk" ||
    value === "false-positive"
  ) {
    return value;
  }

  return "open";
}

export function calculateReviewCounts(items: ReviewItem[]) {
  const counts = {
    total: items.length,
    open: 0,
    inProgress: 0,
    fixedByDeveloper: 0,
    needsRetest: 0,
    verifiedFixed: 0,
    acceptedRisk: 0,
    falsePositive: 0,
    activeHighRisk: 0,
    activeMediumRisk: 0,
  };

  for (const item of items) {
    const status = normalizeReviewItemStatus(item.lifecycle_status);
    if (status === "open") counts.open += 1;
    if (status === "in-progress") counts.inProgress += 1;
    if (status === "fixed-by-developer") counts.fixedByDeveloper += 1;
    if (status === "needs-retest") counts.needsRetest += 1;
    if (status === "verified-fixed") counts.verifiedFixed += 1;
    if (status === "accepted-risk") counts.acceptedRisk += 1;
    if (status === "false-positive") counts.falsePositive += 1;

    const isClosed =
      status === "verified-fixed" ||
      status === "accepted-risk" ||
      status === "false-positive";
    if (!isClosed && (item.severity === "Critical" || item.severity === "High"))
      counts.activeHighRisk += 1;
    if (!isClosed && item.severity === "Medium") counts.activeMediumRisk += 1;
  }

  return counts;
}

export function calculateReviewProgress(items: ReviewItem[]) {
  if (!items.length) return 0;
  const counts = calculateReviewCounts(items);
  const closed =
    counts.verifiedFixed + counts.acceptedRisk + counts.falsePositive;
  return Math.round((closed / items.length) * 100);
}

export function deriveWorkspaceRisk(items: ReviewItem[]) {
  const counts = calculateReviewCounts(items);
  if (!items.length) return "Unknown";
  if (counts.activeHighRisk > 0) return "High attention needed";
  if (counts.activeMediumRisk > 0) return "Needs attention";
  if (
    counts.open ||
    counts.inProgress ||
    counts.fixedByDeveloper ||
    counts.needsRetest
  )
    return "Improving";
  return "Review completed";
}

export function deriveWorkspaceStage(items: ReviewItem[]): ReviewStage {
  const counts = calculateReviewCounts(items);
  if (!items.length) return "intake";
  if (counts.needsRetest || counts.fixedByDeveloper) return "retest";
  if (counts.inProgress) return "developer-fix";
  if (counts.open && counts.total > 0) return "triage";
  return "client-approval";
}

export function createClientProgressSummary(items: ReviewItem[]) {
  const counts = calculateReviewCounts(items);
  const progress = calculateReviewProgress(items);
  const risk = deriveWorkspaceRisk(items);

  return `${progress}% complete. ${counts.total} total item(s), ${counts.open} open, ${counts.inProgress} in progress, ${counts.fixedByDeveloper} fixed by developer, ${counts.needsRetest} needs retest, ${counts.verifiedFixed} verified fixed. Current risk: ${risk}.`;
}
