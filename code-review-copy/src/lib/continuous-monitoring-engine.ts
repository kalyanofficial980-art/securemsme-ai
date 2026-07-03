export type MonitoringCadence = "daily" | "weekly" | "manual";
export type RiskLabel =
  "Low risk" | "Medium risk" | "High risk" | "Critical risk" | "Unknown";

export type MonitoringScanRecord = {
  id: string;
  website_id?: string | null;
  website_url: string;
  score?: number | null;
  risk_level?: string | null;
  report?: unknown;
  created_at?: string | null;
};

export type MonitoringPolicy = {
  workerVersion: string;
  cadence: MonitoringCadence;
  scoreDropThreshold: number;
  riskThreshold: string;
  checks: string[];
  alertRules: string[];
  safetyNotes: string[];
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

export function normalizeMonitoringScore(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(asNumber(value, 0))));
}

export function normalizeMonitoringRisk(
  value: unknown,
  score?: number | null,
): RiskLabel {
  const raw = asString(value).toLowerCase();

  if (raw.includes("critical")) return "Critical risk";
  if (raw.includes("high")) return "High risk";
  if (raw.includes("medium")) return "Medium risk";
  if (raw.includes("low")) return "Low risk";

  if (typeof score !== "number") return "Unknown";
  if (score < 30) return "Critical risk";
  if (score < 50) return "High risk";
  if (score < 80) return "Medium risk";
  return "Low risk";
}

function riskRank(risk: RiskLabel) {
  if (risk === "Critical risk") return 4;
  if (risk === "High risk") return 3;
  if (risk === "Medium risk") return 2;
  if (risk === "Low risk") return 1;
  return 0;
}

function countFindings(report: unknown) {
  const record = asRecord(report);

  return [
    ...asArray(record.findings),
    ...asArray(record.topFixes),
    ...asArray(record.issues),
    ...asArray(record.vulnerabilities),
    ...asArray(asRecord(record.evidenceCalibration).items),
    ...asArray(asRecord(record.vulnerabilityIntelligence).findings),
    ...asArray(asRecord(record.inbuiltAdvancedAudit).findings),
    ...asArray(asRecord(record.advancedAudit).findings),
  ].length;
}

export function buildMonitoringPolicy(input: {
  websiteUrl: string;
  cadence: MonitoringCadence;
  scoreDropThreshold: number;
  riskThreshold: string;
  seedScanId?: string | null;
}): MonitoringPolicy {
  const threshold = Math.max(
    1,
    Math.min(100, Math.round(input.scoreDropThreshold || 10)),
  );

  return {
    workerVersion: "45.0",
    cadence: input.cadence,
    scoreDropThreshold: threshold,
    riskThreshold: input.riskThreshold || "Medium risk",
    checks: [
      "Compare latest scan score with previous baseline",
      "Detect score drift",
      "Detect risk-level regression",
      "Create monitoring event",
      "Keep old scans as history and latest scan as baseline",
    ],
    alertRules: [
      `Alert if score drops by ${threshold}+ points`,
      "Alert if risk level increases",
      "Alert if latest scan needs manual review",
    ],
    safetyNotes: [
      "Foundation compares saved scan snapshots",
      "Automatic background queue comes in next layer",
      "This does not claim full continuous pentesting",
    ],
  };
}

export function nextRunDate(cadence: MonitoringCadence, from = new Date()) {
  const date = new Date(from);

  if (cadence === "daily") date.setDate(date.getDate() + 1);
  else if (cadence === "weekly") date.setDate(date.getDate() + 7);
  else date.setFullYear(date.getFullYear() + 10);

  return date.toISOString();
}

function evidenceQuality(
  scan: MonitoringScanRecord,
): "High" | "Medium" | "Low" {
  const findings = countFindings(scan.report);
  const report = asRecord(scan.report);
  const hasAdvanced =
    Boolean(report.evidenceCalibration) ||
    Boolean(report.vulnerabilityIntelligence) ||
    Boolean(report.inbuiltAdvancedAudit) ||
    Boolean(report.advancedAudit);

  if (hasAdvanced && findings >= 5) return "High";
  if (findings >= 2 || hasAdvanced) return "Medium";
  return "Low";
}

function getRiskTransition(
  currentRisk: RiskLabel,
  previousRisk: RiskLabel | null,
  scoreDelta: number | null,
) {
  if (!previousRisk || scoreDelta === null)
    return "no-previous-baseline" as const;

  const currentRank = riskRank(currentRisk);
  const previousRank = riskRank(previousRisk);

  if (currentRank > previousRank || scoreDelta < -5) return "worsened" as const;
  if (currentRank < previousRank || scoreDelta > 5) return "improved" as const;
  return "same" as const;
}

export function evaluateMonitoringRun(input: {
  current: MonitoringScanRecord;
  previous?: MonitoringScanRecord | null;
  policy: MonitoringPolicy;
}) {
  const currentScore = normalizeMonitoringScore(input.current.score);
  const previousScore = input.previous
    ? normalizeMonitoringScore(input.previous.score)
    : null;
  const scoreDelta =
    previousScore === null ? null : currentScore - previousScore;
  const currentRisk = normalizeMonitoringRisk(
    input.current.risk_level,
    currentScore,
  );
  const previousRisk = input.previous
    ? normalizeMonitoringRisk(input.previous.risk_level, previousScore)
    : null;
  const riskTransition = getRiskTransition(
    currentRisk,
    previousRisk,
    scoreDelta,
  );

  const regressionReasons: Array<{
    title: string;
    severity: "Critical" | "High" | "Medium" | "Low" | "Info";
    details: string;
  }> = [];

  if (scoreDelta !== null && scoreDelta <= -input.policy.scoreDropThreshold) {
    regressionReasons.push({
      title: "Score dropped",
      severity: scoreDelta <= -25 ? "High" : "Medium",
      details: `Score dropped by ${Math.abs(scoreDelta)} points compared with previous baseline.`,
    });
  }

  if (previousRisk && riskRank(currentRisk) > riskRank(previousRisk)) {
    regressionReasons.push({
      title: "Risk increased",
      severity: riskRank(currentRisk) >= 3 ? "High" : "Medium",
      details: `Risk changed from ${previousRisk} to ${currentRisk}.`,
    });
  }

  if (evidenceQuality(input.current) === "Low") {
    regressionReasons.push({
      title: "Low evidence quality",
      severity: "Low",
      details:
        "Latest scan has limited evidence detail. Run advanced modules for stronger monitoring confidence.",
    });
  }

  const regressionDetected = regressionReasons.some((reason) =>
    ["Critical", "High", "Medium"].includes(reason.severity),
  );

  const driftStatus = regressionReasons.some(
    (reason) => reason.title === "Risk increased",
  )
    ? "risk-increased"
    : regressionReasons.some((reason) => reason.title === "Score dropped")
      ? "score-dropped"
      : scoreDelta !== null && scoreDelta > 5
        ? "score-improved"
        : regressionReasons.length
          ? "needs-review"
          : "stable";

  const eventType =
    driftStatus === "risk-increased"
      ? "risk-increase"
      : driftStatus === "score-dropped"
        ? "score-drop"
        : regressionDetected
          ? "regression"
          : "baseline-updated";

  const severity = regressionReasons.some(
    (reason) => reason.severity === "Critical",
  )
    ? "Critical"
    : regressionReasons.some((reason) => reason.severity === "High")
      ? "High"
      : regressionReasons.some((reason) => reason.severity === "Medium")
        ? "Medium"
        : "Info";

  const customerSummary =
    scoreDelta === null
      ? `Monitoring baseline created for ${input.current.website_url}. Current score is ${currentScore}.`
      : regressionDetected
        ? `Monitoring detected a possible security regression. Current score is ${currentScore}, previous baseline was ${previousScore}.`
        : driftStatus === "score-improved"
          ? `Security posture improved. Current score is ${currentScore}, previous baseline was ${previousScore}.`
          : `Monitoring is stable. Current score is ${currentScore}, previous baseline was ${previousScore}.`;

  return {
    workerVersion: "45.0",
    websiteUrl: input.current.website_url,
    sourceScanId: input.current.id,
    previousScanId: input.previous?.id || null,
    scoreBefore: previousScore,
    scoreCurrent: currentScore,
    scoreDelta,
    riskBefore: previousRisk,
    riskCurrent: currentRisk,
    riskTransition,
    driftStatus,
    regressionDetected,
    regressionReasons,
    runSummary: {
      customerSummary,
      developerSummary:
        "Monitoring worker compared score, risk and evidence quality between scan snapshots. It does not perform destructive testing.",
      nextAction: regressionDetected
        ? "Review changed findings, run Truth Cleanup and retest after fixing."
        : "Keep monitoring active and use latest scan as baseline.",
      canClaim: [
        "Can claim monitoring compared latest scan against previous baseline.",
        "Can claim score drift and risk transition were calculated from saved scan snapshots.",
        "Can claim regression signals require review when score drops or risk increases.",
      ],
      cannotClaim: [
        "Cannot claim all vulnerabilities are continuously tested yet.",
        "Cannot claim full background automation until queue/cron layer is added.",
        "Cannot claim exploitation or compromise from score drift alone.",
      ],
    },
    evidenceSnapshot: {
      currentScanDate: input.current.created_at || null,
      previousScanDate: input.previous?.created_at || null,
      currentRisk,
      previousRisk,
      currentScore,
      previousScore,
      scoreDelta,
      findingSignals: countFindings(input.current.report),
      evidenceQuality: evidenceQuality(input.current),
    },
    event: {
      eventType,
      severity,
      title:
        eventType === "score-drop"
          ? "Monitoring detected score drop"
          : eventType === "risk-increase"
            ? "Monitoring detected risk increase"
            : eventType === "regression"
              ? "Monitoring detected regression signal"
              : "Monitoring baseline updated",
      details: customerSummary,
      metadata: {
        driftStatus,
        scoreDelta,
        riskBefore: previousRisk,
        riskCurrent: currentRisk,
        regressionReasons,
      },
    },
  };
}
