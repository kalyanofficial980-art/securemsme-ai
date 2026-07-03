export type FixItemStatus =
  "open" | "in_progress" | "fixed" | "needs_review" | "accepted_risk";

export type CustomerFixTask = {
  id?: string;
  userId: string;
  websiteId: string | null;
  scanId: string;
  fingerprint: string;
  title: string;
  category: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  source: string;
  status: FixItemStatus;
  evidence: string[];
  customerImpact: string;
  developerFix: string;
  ownerAction: string;
  proofHint: string;
  notes?: string | null;
  firstSeenAt?: string;
  lastSeenAt?: string;
  fixedAt?: string | null;
};

export type CustomerValueReport = {
  generatedAt: string;
  websiteUrl: string;
  currentScore: number;
  currentRiskLevel: string;
  previousScore: number | null;
  previousRiskLevel: string | null;
  scoreChange: number | null;
  improvementLabel: string;
  totalTasks: number;
  openTasks: number;
  inProgressTasks: number;
  fixedTasks: number;
  needsReviewTasks: number;
  acceptedRiskTasks: number;
  completionPercent: number;
  customerMessage: string;
  ownerActionPlan: string[];
  developerChecklist: CustomerFixTask[];
  proofOfFixSummary: string;
  retestRecommendation: string;
};

type ScanLike = {
  id: string;
  website_url?: string | null;
  score?: number | null;
  risk_level?: string | null;
  report?: Record<string, unknown> | null;
  created_at?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeSeverity(value: unknown): CustomerFixTask["severity"] {
  const text = String(value || "").toLowerCase();

  if (text.includes("critical")) return "Critical";
  if (text.includes("high")) return "High";
  if (text.includes("medium")) return "Medium";
  if (text.includes("low")) return "Low";

  return "Info";
}

function statusRank(status: FixItemStatus) {
  if (status === "open") return 5;
  if (status === "needs_review") return 4;
  if (status === "in_progress") return 3;
  if (status === "accepted_risk") return 2;
  return 1;
}

function severityRank(severity: CustomerFixTask["severity"]) {
  if (severity === "Critical") return 5;
  if (severity === "High") return 4;
  if (severity === "Medium") return 3;
  if (severity === "Low") return 2;
  return 1;
}

function cleanFingerprint(input: string) {
  return input
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function makeFingerprint(input: {
  source: string;
  title: string;
  category: string;
  severity: string;
}) {
  const raw = `${input.source}:${input.category}:${input.severity}:${input.title}`;

  return cleanFingerprint(raw) || "security-fix-item";
}

function makeEvidenceArray(...values: unknown[]) {
  const evidence = values.flatMap((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return [value];
    return [];
  });

  return evidence
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 8);
}

function defaultOwnerAction(severity: CustomerFixTask["severity"]) {
  if (severity === "Critical" || severity === "High") {
    return "Ask your developer or website vendor to fix this urgently, then run a retest.";
  }

  if (severity === "Medium") {
    return "Add this to this week's website security improvement list and request a retest after fixing.";
  }

  return "Track this as a hardening item and fix when the developer updates the website.";
}

function defaultProofHint(title: string) {
  return `After fixing "${title}", run a retest. The before/after report should show changed evidence or reduced risk.`;
}

function addTask(
  tasks: CustomerFixTask[],
  input: Omit<CustomerFixTask, "fingerprint" | "status"> & {
    fingerprint?: string;
    status?: FixItemStatus;
  },
) {
  const fingerprint =
    input.fingerprint ||
    makeFingerprint({
      source: input.source,
      title: input.title,
      category: input.category,
      severity: input.severity,
    });

  if (tasks.some((task) => task.fingerprint === fingerprint)) return;

  tasks.push({
    ...input,
    fingerprint,
    status: input.status || "open",
  });
}

function extractFromTopFixes(input: {
  report: Record<string, unknown>;
  userId: string;
  websiteId: string | null;
  scanId: string;
  tasks: CustomerFixTask[];
}) {
  asArray(input.report.topFixes).forEach((raw) => {
    const fix = asRecord(raw);
    const title = asText(
      fix.name,
      asText(fix.title, "Recommended security fix"),
    );
    const severity = normalizeSeverity(fix.severity);

    addTask(input.tasks, {
      userId: input.userId,
      websiteId: input.websiteId,
      scanId: input.scanId,
      title,
      category: asText(fix.category, "Top fix"),
      severity,
      source: "SecureMSME AI score engine",
      evidence: makeEvidenceArray(fix.evidence, fix.description),
      customerImpact: asText(
        fix.businessImpact,
        "This fix can improve website trust and reduce public security risk.",
      ),
      developerFix: asText(
        fix.developerFix,
        asText(fix.recommendation, "Apply the recommended security fix."),
      ),
      ownerAction: defaultOwnerAction(severity),
      proofHint: defaultProofHint(title),
    });
  });
}

function extractFromFindings(input: {
  report: Record<string, unknown>;
  userId: string;
  websiteId: string | null;
  scanId: string;
  tasks: CustomerFixTask[];
}) {
  asArray(input.report.findings).forEach((raw) => {
    const finding = asRecord(raw);
    const severity = normalizeSeverity(finding.severity);
    const status = String(finding.status || "").toLowerCase();

    if (severity === "Info" || status === "pass") return;

    const title = asText(
      finding.name,
      asText(finding.title, "Security finding"),
    );

    addTask(input.tasks, {
      userId: input.userId,
      websiteId: input.websiteId,
      scanId: input.scanId,
      title,
      category: asText(finding.category, "Security finding"),
      severity,
      source: "Native scanner",
      evidence: makeEvidenceArray(
        finding.evidence,
        finding.description,
        finding.observedValue,
      ),
      customerImpact: asText(
        finding.businessImpact,
        "This issue may affect customer trust or security posture.",
      ),
      developerFix: asText(
        finding.developerFix,
        asText(finding.recommendation, "Review and fix this item."),
      ),
      ownerAction: defaultOwnerAction(severity),
      proofHint: defaultProofHint(title),
    });
  });
}

function extractFromEvidenceCalibration(input: {
  report: Record<string, unknown>;
  userId: string;
  websiteId: string | null;
  scanId: string;
  tasks: CustomerFixTask[];
}) {
  const calibration = asRecord(input.report.evidenceCalibration);

  asArray(calibration.items).forEach((raw) => {
    const item = asRecord(raw);
    const severity = normalizeSeverity(item.severity);
    const status = String(item.status || "").toLowerCase();

    if (severity === "Info" || status === "informational") return;

    const title = asText(item.title, "Evidence-based fix item");

    addTask(input.tasks, {
      userId: input.userId,
      websiteId: input.websiteId,
      scanId: input.scanId,
      title,
      category: asText(item.category, "Evidence calibration"),
      severity,
      source: asText(item.source, "Evidence calibration"),
      evidence: makeEvidenceArray(item.evidence),
      customerImpact: asText(
        item.customerImpact,
        "This evidence may affect security posture or customer trust.",
      ),
      developerFix: asText(
        item.developerFix,
        "Review evidence and apply the recommended security fix.",
      ),
      ownerAction:
        status === "manual-review"
          ? "Ask your developer to manually validate this before making a strong claim."
          : defaultOwnerAction(severity),
      proofHint: defaultProofHint(title),
    });
  });
}

function extractFromVulnerabilityIntelligence(input: {
  report: Record<string, unknown>;
  userId: string;
  websiteId: string | null;
  scanId: string;
  tasks: CustomerFixTask[];
}) {
  const intel = asRecord(input.report.vulnerabilityIntelligence);

  asArray(intel.findings).forEach((raw) => {
    const finding = asRecord(raw);
    const severity = normalizeSeverity(finding.severity);

    if (severity === "Info") return;

    const title = asText(finding.title, "Vulnerability intelligence item");

    addTask(input.tasks, {
      userId: input.userId,
      websiteId: input.websiteId,
      scanId: input.scanId,
      title,
      category: asText(finding.category, "Vulnerability intelligence"),
      severity,
      source: "Vulnerability intelligence",
      evidence: makeEvidenceArray(finding.evidence),
      customerImpact: asText(
        finding.customerImpact,
        "This public risk signal can affect website security posture.",
      ),
      developerFix: asText(
        finding.recommendedFix,
        "Validate this signal and apply the recommended fix.",
      ),
      ownerAction: defaultOwnerAction(severity),
      proofHint: defaultProofHint(title),
    });
  });
}

export function extractFixTasksFromReport(input: {
  report: Record<string, unknown>;
  userId: string;
  websiteId: string | null;
  scanId: string;
}) {
  const tasks: CustomerFixTask[] = [];

  extractFromTopFixes({ ...input, tasks });
  extractFromFindings({ ...input, tasks });
  extractFromEvidenceCalibration({ ...input, tasks });
  extractFromVulnerabilityIntelligence({ ...input, tasks });

  return tasks
    .sort((a, b) => {
      const severityDiff = severityRank(b.severity) - severityRank(a.severity);
      if (severityDiff !== 0) return severityDiff;

      return a.title.localeCompare(b.title);
    })
    .slice(0, 30);
}

export function mapDatabaseFixItem(
  row: Record<string, unknown>,
): CustomerFixTask {
  return {
    id: asText(row.id),
    userId: asText(row.user_id),
    websiteId: asText(row.website_id) || null,
    scanId: asText(row.scan_id),
    fingerprint: asText(row.fingerprint),
    title: asText(row.title, "Fix item"),
    category: asText(row.category, "Security"),
    severity: normalizeSeverity(row.severity),
    source: asText(row.source, "SecureMSME AI"),
    status: asText(row.status, "open") as FixItemStatus,
    evidence: makeEvidenceArray(row.evidence),
    customerImpact: asText(row.customer_impact),
    developerFix: asText(row.developer_fix),
    ownerAction: asText(row.owner_action),
    proofHint: asText(row.proof_hint),
    notes: typeof row.notes === "string" ? row.notes : null,
    firstSeenAt: asText(row.first_seen_at),
    lastSeenAt: asText(row.last_seen_at),
    fixedAt: typeof row.fixed_at === "string" ? row.fixed_at : null,
  };
}

export function buildCustomerValueReport(input: {
  currentScan: ScanLike;
  previousScan?: ScanLike | null;
  tasks: CustomerFixTask[];
}): CustomerValueReport {
  const tasks = [...input.tasks].sort((a, b) => {
    const statusDiff = statusRank(b.status) - statusRank(a.status);
    if (statusDiff !== 0) return statusDiff;

    const severityDiff = severityRank(b.severity) - severityRank(a.severity);
    if (severityDiff !== 0) return severityDiff;

    return a.title.localeCompare(b.title);
  });

  const currentScore = Number(input.currentScan.score || 0);
  const previousScore =
    typeof input.previousScan?.score === "number"
      ? input.previousScan.score
      : null;
  const scoreChange =
    previousScore === null ? null : Math.round(currentScore - previousScore);

  const openTasks = tasks.filter((task) => task.status === "open").length;
  const inProgressTasks = tasks.filter(
    (task) => task.status === "in_progress",
  ).length;
  const fixedTasks = tasks.filter((task) => task.status === "fixed").length;
  const needsReviewTasks = tasks.filter(
    (task) => task.status === "needs_review",
  ).length;
  const acceptedRiskTasks = tasks.filter(
    (task) => task.status === "accepted_risk",
  ).length;

  const actionableCount = tasks.filter(
    (task) => task.status !== "accepted_risk",
  ).length;
  const completionPercent = actionableCount
    ? Math.round((fixedTasks / actionableCount) * 100)
    : 0;

  let improvementLabel = "Baseline scan";
  if (scoreChange !== null && scoreChange > 0)
    improvementLabel = `Improved by ${scoreChange} points`;
  if (scoreChange !== null && scoreChange === 0)
    improvementLabel = "No score change yet";
  if (scoreChange !== null && scoreChange < 0)
    improvementLabel = `Dropped by ${Math.abs(scoreChange)} points`;

  const urgentTasks = tasks.filter(
    (task) =>
      task.status !== "fixed" &&
      task.status !== "accepted_risk" &&
      (task.severity === "Critical" || task.severity === "High"),
  );

  const ownerActionPlan = [
    urgentTasks.length
      ? `Fix ${urgentTasks.length} critical/high priority item(s) first.`
      : "No critical/high open fix items are currently in this workflow.",
    inProgressTasks
      ? `Follow up on ${inProgressTasks} item(s) already marked in progress.`
      : "Mark items as in progress once your developer starts work.",
    needsReviewTasks
      ? `Review ${needsReviewTasks} item(s) that need manual validation.`
      : "Use needs-review only when a fix cannot be confirmed automatically.",
    "After fixes are done, run a retest and compare before/after evidence.",
  ];

  return {
    generatedAt: new Date().toISOString(),
    websiteUrl: input.currentScan.website_url || "Website",
    currentScore,
    currentRiskLevel: input.currentScan.risk_level || "Unknown",
    previousScore,
    previousRiskLevel: input.previousScan?.risk_level || null,
    scoreChange,
    improvementLabel,
    totalTasks: tasks.length,
    openTasks,
    inProgressTasks,
    fixedTasks,
    needsReviewTasks,
    acceptedRiskTasks,
    completionPercent,
    customerMessage:
      completionPercent >= 80
        ? "Most tracked issues are fixed. Run a retest to keep proof fresh."
        : "Your report is now converted into a fix workflow. Fix items, retest, and show before/after proof.",
    ownerActionPlan,
    developerChecklist: tasks,
    proofOfFixSummary:
      fixedTasks > 0
        ? `${fixedTasks} item(s) are marked fixed. Retest to confirm changed evidence and improved score.`
        : "No fixes are marked fixed yet. Use this page to track work and create proof after retesting.",
    retestRecommendation:
      openTasks || inProgressTasks || needsReviewTasks
        ? "Retest after fixing priority items. Do not claim issues are fixed until evidence changes or developer proof is added."
        : "All actionable items are closed or accepted. Run a final retest and keep the report as proof.",
  };
}
