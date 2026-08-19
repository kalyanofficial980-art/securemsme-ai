export type RetestFindingSummary = {
  title: string;
  category: string;
  severity: string;
};

export type RetestComparison = {
  baselineScanId: string;
  baselineCreatedAt: string;
  baselineScore: number;
  baselineRiskLevel: string;
  currentScore: number;
  currentRiskLevel: string;
  scoreDelta: number;
  outcome: "improved" | "unchanged" | "regressed";
  resolved: RetestFindingSummary[];
  newFindings: RetestFindingSummary[];
  persistent: RetestFindingSummary[];
  counts: {
    resolved: number;
    newFindings: number;
    persistent: number;
  };
  note: string;
};

type FindingRecord = Record<string, unknown>;

type PreviousScan = {
  id: string;
  created_at: string;
  score: number;
  risk_level: string;
  report: unknown;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getFindings(report: unknown): FindingRecord[] {
  const object = asObject(report);
  return Array.isArray(object.findings)
    ? (object.findings.filter(
        (finding) => finding && typeof finding === "object",
      ) as FindingRecord[])
    : [];
}

function isActionable(finding: FindingRecord) {
  const status = normalizeText(finding.status).replace(/ /g, "_");
  const severity = normalizeText(finding.severity);

  if (
    status === "pass" ||
    status === "info" ||
    status === "not_assessed" ||
    status === "not_applicable"
  ) {
    return false;
  }

  return severity !== "info";
}

function findingTitle(finding: FindingRecord) {
  return String(finding.name || finding.title || "Security finding").trim();
}

function findingCategory(finding: FindingRecord) {
  return String(finding.category || "Security").trim();
}

function fingerprintFinding(finding: FindingRecord) {
  return `${normalizeText(findingCategory(finding))}::${normalizeText(
    findingTitle(finding),
  )}`;
}

function summarizeFinding(finding: FindingRecord): RetestFindingSummary {
  return {
    title: findingTitle(finding),
    category: findingCategory(finding),
    severity: String(finding.severity || "Review"),
  };
}

export function buildRetestComparison(input: {
  previousScan: PreviousScan | null;
  currentScore: number;
  currentRiskLevel: string;
  currentFindings: unknown[];
}): RetestComparison | null {
  if (!input.previousScan) return null;

  const previousFindings = getFindings(input.previousScan.report).filter(
    isActionable,
  );
  const currentFindings = input.currentFindings
    .filter((finding) => finding && typeof finding === "object")
    .map((finding) => finding as FindingRecord)
    .filter(isActionable);

  const previousMap = new Map(
    previousFindings.map((finding) => [fingerprintFinding(finding), finding]),
  );
  const currentMap = new Map(
    currentFindings.map((finding) => [fingerprintFinding(finding), finding]),
  );

  const resolved = previousFindings
    .filter((finding) => !currentMap.has(fingerprintFinding(finding)))
    .map(summarizeFinding);
  const newFindings = currentFindings
    .filter((finding) => !previousMap.has(fingerprintFinding(finding)))
    .map(summarizeFinding);
  const persistent = currentFindings
    .filter((finding) => previousMap.has(fingerprintFinding(finding)))
    .map(summarizeFinding);

  const scoreDelta = input.currentScore - input.previousScan.score;
  const outcome: RetestComparison["outcome"] =
    newFindings.length > resolved.length || scoreDelta < 0
      ? "regressed"
      : resolved.length > newFindings.length || scoreDelta > 0
        ? "improved"
        : "unchanged";

  return {
    baselineScanId: input.previousScan.id,
    baselineCreatedAt: input.previousScan.created_at,
    baselineScore: input.previousScan.score,
    baselineRiskLevel: input.previousScan.risk_level,
    currentScore: input.currentScore,
    currentRiskLevel: input.currentRiskLevel,
    scoreDelta,
    outcome,
    resolved,
    newFindings,
    persistent,
    counts: {
      resolved: resolved.length,
      newFindings: newFindings.length,
      persistent: persistent.length,
    },
    note:
      "Retest changes compare the same VeyraSec safe public checks between consecutive scans. Resolved means the prior actionable signal was not detected in this scan; it is not a guarantee that every attack path is fixed.",
  };
}
