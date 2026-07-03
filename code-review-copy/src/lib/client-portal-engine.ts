export type ClientPortalAccessLevel =
  "summary-only" | "report-hub" | "monitoring-summary" | "full-client";

export type ClientPortalScan = {
  id: string;
  website_id?: string | null;
  organization_id?: string | null;
  website_url: string;
  score?: number | null;
  risk_level?: string | null;
  report?: unknown;
  created_at?: string | null;
};

export type ClientPortalSnapshot = {
  engineVersion: string;
  generatedAt: string;
  scanId: string;
  websiteUrl: string;
  score: number;
  riskLevel: string;
  scanDate?: string | null;
  executiveSummary: string;
  clientSafeFindings: Array<{
    title: string;
    severity: string;
    summary: string;
    recommendedAction: string;
    confidence: string;
  }>;
  nextActions: string[];
  safeClaims: string[];
  blockedClaims: string[];
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSeverity(value: unknown) {
  const raw = asString(value, "Info").toLowerCase();
  if (raw.includes("critical")) return "Critical";
  if (raw.includes("high")) return "High";
  if (raw.includes("medium")) return "Medium";
  if (raw.includes("low")) return "Low";
  return "Info";
}

function normalizeScore(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(asNumber(value, 0))));
}

function safeFindingText(record: UnknownRecord) {
  return (
    asString(record.safe_customer_wording) ||
    asString(record.safeCustomerWording) ||
    asString(record.evidence_summary) ||
    asString(record.evidenceSummary) ||
    asString(record.description) ||
    asString(record.summary) ||
    "This item was detected from safe scan evidence and needs review."
  );
}

function safeFixText(record: UnknownRecord) {
  return (
    asString(record.exact_developer_fix) ||
    asString(record.developerFix) ||
    asString(record.fix) ||
    asString(record.recommendation) ||
    "Review this item, apply the recommended hardening control, and retest after fixing."
  );
}

function collectFindings(report: unknown) {
  const data = asRecord(report);
  const buckets = [
    ...asArray(data.topFixes),
    ...asArray(data.findings),
    ...asArray(data.issues),
    ...asArray(data.vulnerabilities),
    ...asArray(asRecord(data.cleanedReport).cleanedFixes),
    ...asArray(asRecord(data.evidenceCalibration).items),
  ];

  const output: ClientPortalSnapshot["clientSafeFindings"] = [];
  const seen = new Set<string>();

  for (const item of buckets) {
    const record = asRecord(item);
    const title =
      asString(record.title) ||
      asString(record.name) ||
      asString(record.label) ||
      "Security item needs review";

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    output.push({
      title,
      severity: normalizeSeverity(
        record.severity || record.risk || record.priority,
      ),
      summary: safeFindingText(record),
      recommendedAction: safeFixText(record),
      confidence:
        asString(record.confidence) ||
        asString(record.evidenceStatus) ||
        asString(record.evidence_status) ||
        "Medium",
    });

    if (output.length >= 12) break;
  }

  if (!output.length) {
    output.push({
      title: "Security posture summary",
      severity: "Info",
      summary:
        "No detailed client-safe findings were available in this scan snapshot.",
      recommendedAction:
        "Run a fresh scan and use report truth cleanup before sharing final client reports.",
      confidence: "Low",
    });
  }

  return output;
}

export function allowedSectionsForAccessLevel(
  accessLevel: ClientPortalAccessLevel,
) {
  if (accessLevel === "summary-only") {
    return ["executive-summary", "score", "safe-claims", "blocked-claims"];
  }

  if (accessLevel === "monitoring-summary") {
    return [
      "executive-summary",
      "score",
      "client-safe-findings",
      "monitoring-summary",
      "next-actions",
      "safe-claims",
      "blocked-claims",
    ];
  }

  if (accessLevel === "full-client") {
    return [
      "executive-summary",
      "score",
      "client-safe-findings",
      "monitoring-summary",
      "fix-guidance",
      "next-actions",
      "safe-claims",
      "blocked-claims",
      "download-ready",
    ];
  }

  return [
    "executive-summary",
    "score",
    "client-safe-findings",
    "next-actions",
    "safe-claims",
    "blocked-claims",
  ];
}

export function buildClientPortalSnapshot(
  scan: ClientPortalScan,
): ClientPortalSnapshot {
  const score = normalizeScore(scan.score);
  const riskLevel = asString(scan.risk_level, "Unknown risk");
  const findings = collectFindings(scan.report);

  const executiveSummary =
    score >= 80
      ? "The latest scan shows a generally stronger security posture, but continued monitoring and periodic review are still recommended."
      : score >= 60
        ? "The latest scan shows moderate security posture with several items that should be reviewed and improved."
        : "The latest scan shows important security posture gaps. Priority fixes and retesting are recommended before strong trust claims.";

  return {
    engineVersion: "51.0",
    generatedAt: new Date().toISOString(),
    scanId: scan.id,
    websiteUrl: scan.website_url,
    score,
    riskLevel,
    scanDate: scan.created_at || null,
    executiveSummary,
    clientSafeFindings: findings,
    nextActions: [
      "Review priority findings with the website developer.",
      "Apply fixes for confirmed and high-confidence items first.",
      "Run retest proof after changes are completed.",
      "Enable monitoring to detect future score drift or regression.",
    ],
    safeClaims: [
      "This portal shares a client-safe evidence-based security posture summary.",
      "The score belongs to this exact scan snapshot.",
      "Findings should be reviewed and retested after fixes.",
    ],
    blockedClaims: [
      "Do not claim the website is 100% secure.",
      "Do not claim every vulnerability was found.",
      "Do not claim this is a full penetration test certificate.",
      "Do not claim compliance certification from this portal alone.",
    ],
  };
}

export function buildPortalExpiry(days: number) {
  const safeDays = Math.max(1, Math.min(90, Math.round(days || 14)));
  const date = new Date();
  date.setDate(date.getDate() + safeDays);
  return date.toISOString();
}
