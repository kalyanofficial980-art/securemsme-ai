export type RetestSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";
export type RetestItemStatus =
  "fixed" | "improved" | "still-open" | "new-issue";

export type EvidenceItem = {
  fingerprint: string;
  title: string;
  category: string;
  severity: RetestSeverity;
  source: string;
  evidence: string[];
  customerImpact: string;
  developerFix: string;
};

export type RetestDiffItem = EvidenceItem & {
  status: RetestItemStatus;
  beforeSeverity?: RetestSeverity;
  afterSeverity?: RetestSeverity;
  beforeEvidence?: string[];
  afterEvidence?: string[];
  proofNote: string;
};

export type RetestProofReport = {
  version: string;
  generatedAt: string;
  websiteUrl: string;
  beforeScanId: string;
  afterScanId: string;
  beforeCreatedAt?: string;
  afterCreatedAt?: string;
  scoreBefore: number | null;
  scoreAfter: number | null;
  scoreChange: number;
  proofStatus:
    | "generated"
    | "verified-improvement"
    | "no-change"
    | "regression-risk"
    | "needs-review";
  fixedItems: RetestDiffItem[];
  improvedItems: RetestDiffItem[];
  stillOpenItems: RetestDiffItem[];
  newIssues: RetestDiffItem[];
  fixedCount: number;
  improvedCount: number;
  stillOpenCount: number;
  newIssueCount: number;
  highPriorityCount: number;
  proofStatements: string[];
  developerNextActions: string[];
  customerSummary: string;
  safeClaim: string;
  blockedClaim: string;
};

export type ScanSnapshot = {
  id: string;
  websiteUrl: string;
  score: number | null;
  riskLevel?: string | null;
  createdAt?: string;
  report?: Record<string, unknown> | null;
};

export type ModuleEvidenceRow = {
  id?: string;
  module_id?: string;
  module_name?: string;
  module_category?: string;
  status?: string;
  evidence?: unknown;
  output_summary?: unknown;
  safe_claim?: string;
  blocked_claim?: string;
  created_at?: string;
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

function makeTextArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item))
      .filter(Boolean)
      .slice(0, 12);
  }

  if (typeof value === "string" && value.trim()) return [value.trim()];

  return [];
}

function normalizeSeverity(value: unknown): RetestSeverity {
  const text = String(value || "").toLowerCase();

  if (text.includes("critical")) return "Critical";
  if (text.includes("high")) return "High";
  if (text.includes("medium")) return "Medium";
  if (text.includes("low")) return "Low";

  return "Info";
}

function severityWeight(severity: RetestSeverity) {
  return {
    Critical: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Info: 1,
  }[severity];
}

function fingerprint(input: string) {
  return input
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function evidenceItem(input: {
  title: string;
  category: string;
  severity?: unknown;
  source: string;
  evidence?: unknown;
  customerImpact?: unknown;
  developerFix?: unknown;
}): EvidenceItem | null {
  const title = input.title.trim();
  const category = input.category.trim() || "Security Finding";

  if (!title || title.length < 3) return null;

  return {
    fingerprint: fingerprint(`${category}-${title}`),
    title,
    category,
    severity: normalizeSeverity(input.severity),
    source: input.source,
    evidence: makeTextArray(input.evidence),
    customerImpact: asText(
      input.customerImpact,
      "This item affects website security posture or customer trust.",
    ),
    developerFix: asText(
      input.developerFix,
      "Review this item and apply the recommended fix. Retest after changes.",
    ),
  };
}

function collectFromReport(
  report: Record<string, unknown>,
  sourcePrefix: string,
) {
  const items: EvidenceItem[] = [];

  const topFixes = asArray(report.topFixes);
  for (const raw of topFixes) {
    const item = asRecord(raw);
    const normalized = evidenceItem({
      title: asText(item.name, asText(item.title, "Recommended fix")),
      category: asText(item.category, "Priority Fix"),
      severity: item.severity,
      source: `${sourcePrefix}: priority fixes`,
      evidence: item.evidence,
      customerImpact: item.businessImpact || item.customerImpact,
      developerFix: item.developerFix || item.recommendation,
    });
    if (normalized) items.push(normalized);
  }

  const findings = asArray(report.findings);
  for (const raw of findings) {
    const item = asRecord(raw);
    const normalized = evidenceItem({
      title: asText(item.name, asText(item.title, "Security finding")),
      category: asText(item.category, "Security Finding"),
      severity: item.severity,
      source: `${sourcePrefix}: scan findings`,
      evidence: item.evidence || item.observedEvidence,
      customerImpact: item.businessImpact || item.customerImpact,
      developerFix: item.developerFix || item.fix || item.recommendation,
    });
    if (normalized) items.push(normalized);
  }

  const calibration = asRecord(report.evidenceCalibration);
  for (const raw of asArray(calibration.items)) {
    const item = asRecord(raw);
    const normalized = evidenceItem({
      title: asText(item.title, asText(item.name, "Evidence item")),
      category: asText(item.category, "Evidence Confidence"),
      severity: item.severity,
      source: `${sourcePrefix}: evidence confidence`,
      evidence: item.evidence,
      customerImpact: item.whyThisMatters || item.customerImpact,
      developerFix: item.recommendedAction || item.developerFix,
    });
    if (normalized) items.push(normalized);
  }

  const vulnerabilityIntel = asRecord(report.vulnerabilityIntelligence);
  for (const raw of asArray(vulnerabilityIntel.findings)) {
    const item = asRecord(raw);
    const normalized = evidenceItem({
      title: asText(item.title, asText(item.name, "Technology risk")),
      category: asText(item.category, "Vulnerability Intelligence"),
      severity: item.severity,
      source: `${sourcePrefix}: vulnerability intelligence`,
      evidence: item.evidence,
      customerImpact: item.customerImpact || item.businessImpact,
      developerFix: item.developerFix || item.recommendation,
    });
    if (normalized) items.push(normalized);
  }

  return items;
}

function collectFromModuleRows(
  rows: ModuleEvidenceRow[],
  sourcePrefix: string,
) {
  const items: EvidenceItem[] = [];

  for (const row of rows) {
    const output = asRecord(row.output_summary);
    const findings = asArray(output.findings);

    for (const raw of findings) {
      const item = asRecord(raw);
      const normalized = evidenceItem({
        title: asText(item.title, asText(item.customerName, "Module finding")),
        category: asText(
          item.category,
          asText(row.module_category, "Real Module"),
        ),
        severity: item.severity,
        source: `${sourcePrefix}: ${row.module_name || row.module_id || "module"}`,
        evidence: item.evidence,
        customerImpact: item.customerImpact,
        developerFix: item.developerFix,
      });
      if (normalized) items.push(normalized);
    }

    const rowEvidence = makeTextArray(row.evidence);
    if (row.status === "blocked" || row.status === "failed") {
      const normalized = evidenceItem({
        title: `${row.module_name || row.module_id || "Module"} ${row.status}`,
        category: asText(row.module_category, "Module Status"),
        severity: row.status === "blocked" ? "High" : "Medium",
        source: `${sourcePrefix}: module status`,
        evidence: rowEvidence,
        customerImpact:
          "The module could not complete successfully and may need review.",
        developerFix:
          "Review the module status and rerun after fixing the target or configuration issue.",
      });
      if (normalized) items.push(normalized);
    }
  }

  return items;
}

export function extractEvidenceItems(input: {
  scan: ScanSnapshot;
  moduleRows?: ModuleEvidenceRow[];
  sourcePrefix: string;
}) {
  const reportItems = collectFromReport(
    input.scan.report || {},
    input.sourcePrefix,
  );
  const moduleItems = collectFromModuleRows(
    input.moduleRows || [],
    input.sourcePrefix,
  );
  const merged = [...reportItems, ...moduleItems];
  const byFingerprint = new Map<string, EvidenceItem>();

  for (const item of merged) {
    const existing = byFingerprint.get(item.fingerprint);
    if (
      !existing ||
      severityWeight(item.severity) > severityWeight(existing.severity)
    ) {
      byFingerprint.set(item.fingerprint, item);
    }
  }

  return [...byFingerprint.values()].sort(
    (a, b) => severityWeight(b.severity) - severityWeight(a.severity),
  );
}

function makeFixedItem(before: EvidenceItem): RetestDiffItem {
  return {
    ...before,
    status: "fixed",
    beforeSeverity: before.severity,
    beforeEvidence: before.evidence,
    afterEvidence: [],
    proofNote:
      "This item was present in the earlier evidence but was not observed in the retest evidence.",
  };
}

function makeStillOpenItem(
  before: EvidenceItem,
  after: EvidenceItem,
): RetestDiffItem {
  const improved =
    severityWeight(after.severity) < severityWeight(before.severity);

  return {
    ...after,
    status: improved ? "improved" : "still-open",
    beforeSeverity: before.severity,
    afterSeverity: after.severity,
    beforeEvidence: before.evidence,
    afterEvidence: after.evidence,
    proofNote: improved
      ? "This item is still present, but the severity appears lower after retest."
      : "This item is still present in the retest evidence and needs more work.",
  };
}

function makeNewIssueItem(after: EvidenceItem): RetestDiffItem {
  return {
    ...after,
    status: "new-issue",
    afterSeverity: after.severity,
    beforeEvidence: [],
    afterEvidence: after.evidence,
    proofNote:
      "This item was not present in the earlier evidence but appeared in the retest evidence.",
  };
}

export function buildRetestProofReport(input: {
  websiteUrl: string;
  beforeScan: ScanSnapshot;
  afterScan: ScanSnapshot;
  beforeModuleRows?: ModuleEvidenceRow[];
  afterModuleRows?: ModuleEvidenceRow[];
}): RetestProofReport {
  const beforeItems = extractEvidenceItems({
    scan: input.beforeScan,
    moduleRows: input.beforeModuleRows || [],
    sourcePrefix: "Before",
  });

  const afterItems = extractEvidenceItems({
    scan: input.afterScan,
    moduleRows: input.afterModuleRows || [],
    sourcePrefix: "After",
  });

  const beforeMap = new Map(
    beforeItems.map((item) => [item.fingerprint, item]),
  );
  const afterMap = new Map(afterItems.map((item) => [item.fingerprint, item]));

  const fixedItems: RetestDiffItem[] = [];
  const improvedItems: RetestDiffItem[] = [];
  const stillOpenItems: RetestDiffItem[] = [];
  const newIssues: RetestDiffItem[] = [];

  for (const before of beforeItems) {
    const after = afterMap.get(before.fingerprint);

    if (!after) {
      fixedItems.push(makeFixedItem(before));
      continue;
    }

    const diffItem = makeStillOpenItem(before, after);
    if (diffItem.status === "improved") improvedItems.push(diffItem);
    else stillOpenItems.push(diffItem);
  }

  for (const after of afterItems) {
    if (!beforeMap.has(after.fingerprint)) {
      newIssues.push(makeNewIssueItem(after));
    }
  }

  const scoreBefore = input.beforeScan.score;
  const scoreAfter = input.afterScan.score;
  const scoreChange =
    typeof scoreBefore === "number" && typeof scoreAfter === "number"
      ? scoreAfter - scoreBefore
      : 0;

  const highPriorityCount = [...stillOpenItems, ...newIssues].filter(
    (item) => severityWeight(item.severity) >= severityWeight("High"),
  ).length;

  let proofStatus: RetestProofReport["proofStatus"] = "generated";

  if (
    newIssues.some(
      (item) => severityWeight(item.severity) >= severityWeight("High"),
    )
  ) {
    proofStatus = "regression-risk";
  } else if (fixedItems.length || improvedItems.length || scoreChange > 0) {
    proofStatus = "verified-improvement";
  } else if (!fixedItems.length && !improvedItems.length && !scoreChange) {
    proofStatus = "no-change";
  } else {
    proofStatus = "needs-review";
  }

  const proofStatements = [
    `Before score: ${scoreBefore ?? "unknown"}`,
    `After score: ${scoreAfter ?? "unknown"}`,
    `Score change: ${scoreChange >= 0 ? "+" : ""}${scoreChange}`,
    `Fixed items: ${fixedItems.length}`,
    `Improved items: ${improvedItems.length}`,
    `Still open items: ${stillOpenItems.length}`,
    `New issues: ${newIssues.length}`,
  ];

  const developerNextActions = [
    ...stillOpenItems
      .slice(0, 5)
      .map((item) => `Still open: ${item.title} — ${item.developerFix}`),
    ...newIssues
      .slice(0, 5)
      .map((item) => `New issue: ${item.title} — ${item.developerFix}`),
  ];

  if (!developerNextActions.length) {
    developerNextActions.push(
      "No high-priority follow-up was generated from this comparison. Continue monitoring and retest after future changes.",
    );
  }

  const customerSummary =
    proofStatus === "verified-improvement"
      ? "Retest proof shows measurable improvement after fixes."
      : proofStatus === "regression-risk"
        ? "Retest proof found new high-priority risk signals that need review."
        : proofStatus === "no-change"
          ? "Retest proof did not find a clear improvement yet."
          : "Retest proof was generated and should be reviewed.";

  return {
    version: "34.0",
    generatedAt: new Date().toISOString(),
    websiteUrl: input.websiteUrl,
    beforeScanId: input.beforeScan.id,
    afterScanId: input.afterScan.id,
    beforeCreatedAt: input.beforeScan.createdAt,
    afterCreatedAt: input.afterScan.createdAt,
    scoreBefore,
    scoreAfter,
    scoreChange,
    proofStatus,
    fixedItems,
    improvedItems,
    stillOpenItems,
    newIssues,
    fixedCount: fixedItems.length,
    improvedCount: improvedItems.length,
    stillOpenCount: stillOpenItems.length,
    newIssueCount: newIssues.length,
    highPriorityCount,
    proofStatements,
    developerNextActions,
    customerSummary,
    safeClaim:
      "Can claim before/after evidence was compared and visible improvements or remaining issues were summarized.",
    blockedClaim:
      "Cannot claim every vulnerability was fixed, exploitation was impossible, or the website is 100% secure.",
  };
}
