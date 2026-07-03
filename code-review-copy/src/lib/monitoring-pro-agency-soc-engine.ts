export type MonitoringSeverity =
  "Critical" | "High" | "Medium" | "Low" | "Info";
export type MonitoringAlertType =
  | "regression"
  | "new-risk"
  | "fix-regressed"
  | "client-readiness-drop"
  | "monitoring-gap"
  | "evidence-gap";

export type MonitoringSourceCounts = {
  reportSnapshots: number;
  developerPortals: number;
  retestRuns: number;
  clientPortalLinks: number;
  openDeveloperTasks: number;
  failedRetestItems: number;
  passedRetestItems: number;
  openAlerts: number;
};

export type MonitoringSignalInput = {
  targetUrl: string;
  previousHealthScore?: number | null;
  reportReadinessScore?: number | null;
  executiveScore?: number | null;
  fixProgressScore?: number | null;
  retestPassRate?: number | null;
  clientReadinessScore?: number | null;
  sourceCounts: MonitoringSourceCounts;
};

export type MonitoringAlertDraft = {
  alertType: MonitoringAlertType;
  severity: MonitoringSeverity;
  alertTitle: string;
  affectedArea: string;
  beforeSummary: string;
  afterSummary: string;
  evidenceSummary: string;
  developerAction: string;
  clientSafeNote: string;
  blockedClaim: string;
  alertPayload: Record<string, unknown>;
};

export type MonitoringRunDraft = {
  healthScore: number;
  regressionScore: number;
  riskScore: number;
  clientReadinessScore: number;
  sourceCounts: MonitoringSourceCounts;
  runSummary: string;
  regressionSummary: string;
  alertSummary: string;
  monitoringSummary: string;
  clientSafeSummary: string;
  developerSummary: string;
  safetySummary: string;
  blockedClaims: string[];
  alerts: MonitoringAlertDraft[];
};

export type AgencySocSummary = {
  totalClientCount: number;
  activeMonitoringCount: number;
  openAlertCount: number;
  criticalAlertCount: number;
  highAlertCount: number;
  regressionCount: number;
  verifiedFixedCount: number;
  agencyHealthScore: number;
  agencyRiskScore: number;
  agencyResponseScore: number;
  executiveSummary: string;
  operationsSummary: string;
  clientSafeSummary: string;
  blockedClaims: string[];
};

export type AgencyClientRiskInput = {
  targetUrl: string;
  clientName?: string;
  healthScore: number;
  riskScore: number;
  openAlertCount: number;
  regressionCount: number;
  verifiedFixedCount?: number;
};

export const monitoringProBlockedClaims = [
  "Do not claim continuous monitoring proves 100% security.",
  "Do not claim a breach occurred without confirmed evidence.",
  "Do not expose private customer data in alerts.",
  "Do not include exploit payloads or destructive test steps.",
  "Do not claim legal compliance certification.",
  "Do not claim every regression was detected.",
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function riskLevel(score: number): MonitoringSeverity {
  if (score >= 85) return "Critical";
  if (score >= 65) return "High";
  if (score >= 35) return "Medium";
  if (score >= 10) return "Low";
  return "Info";
}

export function calculateMonitoringHealth(input: MonitoringSignalInput) {
  const report = input.reportReadinessScore ?? 0;
  const executive = input.executiveScore ?? 0;
  const fix = input.fixProgressScore ?? 0;
  const retest = input.retestPassRate ?? 0;
  const client = input.clientReadinessScore ?? 0;
  const coverageBonus = Math.min(
    20,
    input.sourceCounts.reportSnapshots * 4 +
      input.sourceCounts.retestRuns * 4 +
      input.sourceCounts.clientPortalLinks * 3,
  );
  const penalty =
    input.sourceCounts.openDeveloperTasks * 3 +
    input.sourceCounts.failedRetestItems * 8 +
    input.sourceCounts.openAlerts * 5;
  return clamp(
    (report + executive + fix + retest + client) / 5 + coverageBonus - penalty,
  );
}

export function calculateRegressionScore(
  input: MonitoringSignalInput,
  currentHealthScore: number,
) {
  const previous = input.previousHealthScore ?? currentHealthScore;
  const drop = Math.max(0, previous - currentHealthScore);
  const failedRetests = input.sourceCounts.failedRetestItems * 12;
  const openTasks = input.sourceCounts.openDeveloperTasks * 3;
  return clamp(drop * 2 + failedRetests + openTasks);
}

export function buildMonitoringRun(
  input: MonitoringSignalInput,
): MonitoringRunDraft {
  const healthScore = calculateMonitoringHealth(input);
  const regressionScore = calculateRegressionScore(input, healthScore);
  const riskScore = clamp(
    100 -
      healthScore +
      regressionScore * 0.5 +
      input.sourceCounts.openAlerts * 5,
  );
  const clientReadinessScore = clamp(
    input.clientReadinessScore ??
      Math.max(0, healthScore - regressionScore * 0.25),
  );
  const alerts = buildMonitoringAlerts(input, {
    healthScore,
    regressionScore,
    riskScore,
    clientReadinessScore,
  });

  const runSummary = `Monitoring health ${healthScore}/100, regression score ${regressionScore}/100 and risk score ${riskScore}/100.`;
  const regressionSummary =
    regressionScore >= 65
      ? "Regression risk is high. Review failed retests, open tasks and client readiness immediately."
      : regressionScore >= 35
        ? "Regression risk is moderate. Review open developer tasks and recent retest proof."
        : "No major regression signal was found from available safe monitoring sources.";

  const alertSummary = `${alerts.length} monitoring alert(s) generated from passive-safe signals.`;
  const monitoringSummary = `Monitoring Pro is watching report readiness, developer fix progress, retest pass rate and client portal readiness for ${input.targetUrl}.`;
  const clientSafeSummary =
    "Monitoring summaries are client-safe and do not claim complete security coverage.";
  const developerSummary =
    "Developer follow-up should focus on failed retests, open tasks and readiness drops.";
  const safetySummary =
    "Passive-safe monitoring only. No brute force, no exploit payloads, no destructive checks and no private data exposure.";

  return {
    healthScore,
    regressionScore,
    riskScore,
    clientReadinessScore,
    sourceCounts: input.sourceCounts,
    runSummary,
    regressionSummary,
    alertSummary,
    monitoringSummary,
    clientSafeSummary,
    developerSummary,
    safetySummary,
    blockedClaims: monitoringProBlockedClaims,
    alerts,
  };
}

function buildMonitoringAlerts(
  input: MonitoringSignalInput,
  scores: {
    healthScore: number;
    regressionScore: number;
    riskScore: number;
    clientReadinessScore: number;
  },
) {
  const alerts: MonitoringAlertDraft[] = [];

  if (scores.regressionScore >= 35) {
    alerts.push({
      alertType: "regression",
      severity: riskLevel(scores.regressionScore),
      alertTitle: "Security regression signal detected",
      affectedArea: input.targetUrl,
      beforeSummary: `Previous health score: ${input.previousHealthScore ?? scores.healthScore}/100`,
      afterSummary: `Current health score: ${scores.healthScore}/100 with regression score ${scores.regressionScore}/100`,
      evidenceSummary:
        "Regression inferred from failed retests, open developer tasks or score drop.",
      developerAction:
        "Review failed retests and reopen developer tasks connected to regressed fixes.",
      clientSafeNote:
        "Some security posture indicators changed and need review.",
      blockedClaim:
        "Do not claim breach or exploitation from regression score alone.",
      alertPayload: {
        source: "monitoring-pro",
        regressionScore: scores.regressionScore,
      },
    });
  }

  if (input.sourceCounts.failedRetestItems > 0) {
    alerts.push({
      alertType: "fix-regressed",
      severity: input.sourceCounts.failedRetestItems >= 2 ? "High" : "Medium",
      alertTitle: "Failed retest item needs developer attention",
      affectedArea: input.targetUrl,
      beforeSummary: "Fix was submitted or ready for retest.",
      afterSummary: `${input.sourceCounts.failedRetestItems} retest item(s) failed.`,
      evidenceSummary:
        "Failed retest items are present in Retest + Client Portal Pro.",
      developerAction:
        "Review failed retest proof and update the fix before requesting another retest.",
      clientSafeNote:
        "At least one fix requires follow-up before it can be shown as verified-fixed.",
      blockedClaim: "Do not mark verified-fixed until safe retest passes.",
      alertPayload: { failedRetestItems: input.sourceCounts.failedRetestItems },
    });
  }

  if (scores.clientReadinessScore < 50) {
    alerts.push({
      alertType: "client-readiness-drop",
      severity: "Medium",
      alertTitle: "Client readiness needs review",
      affectedArea: input.targetUrl,
      beforeSummary: "Client portal/report readiness expected to be stronger.",
      afterSummary: `Client readiness score is ${scores.clientReadinessScore}/100.`,
      evidenceSummary:
        "Client readiness is based on report, fix and retest sources.",
      developerAction:
        "Complete evidence, fix and retest tasks before client sharing.",
      clientSafeNote:
        "The client-facing portal may need more evidence or retest proof.",
      blockedClaim: "Do not share as final proof if readiness is low.",
      alertPayload: { clientReadinessScore: scores.clientReadinessScore },
    });
  }

  if (
    input.sourceCounts.reportSnapshots === 0 ||
    input.sourceCounts.retestRuns === 0
  ) {
    alerts.push({
      alertType: "monitoring-gap",
      severity: "Low",
      alertTitle: "Monitoring source gap",
      affectedArea: input.targetUrl,
      beforeSummary: "Monitoring works best with report and retest sources.",
      afterSummary: "One or more monitoring sources are missing.",
      evidenceSummary:
        "Missing report snapshot or retest run reduces monitoring confidence.",
      developerAction:
        "Generate Client Report v4 and Retest + Client Portal Pro run for better monitoring.",
      clientSafeNote:
        "Monitoring coverage can improve after more evidence sources are added.",
      blockedClaim: "Do not claim complete monitoring coverage.",
      alertPayload: { sourceCounts: input.sourceCounts },
    });
  }

  return alerts;
}

export function buildAgencySocSummary(
  clients: AgencyClientRiskInput[],
): AgencySocSummary {
  const totalClientCount = clients.length;
  const activeMonitoringCount = clients.length;
  const openAlertCount = clients.reduce(
    (sum, client) => sum + client.openAlertCount,
    0,
  );
  const criticalAlertCount = clients.filter(
    (client) => riskLevel(client.riskScore) === "Critical",
  ).length;
  const highAlertCount = clients.filter(
    (client) => riskLevel(client.riskScore) === "High",
  ).length;
  const regressionCount = clients.reduce(
    (sum, client) => sum + client.regressionCount,
    0,
  );
  const verifiedFixedCount = clients.reduce(
    (sum, client) => sum + (client.verifiedFixedCount || 0),
    0,
  );

  const averageHealth = totalClientCount
    ? clients.reduce((sum, client) => sum + client.healthScore, 0) /
      totalClientCount
    : 0;
  const averageRisk = totalClientCount
    ? clients.reduce((sum, client) => sum + client.riskScore, 0) /
      totalClientCount
    : 0;
  const agencyHealthScore = clamp(averageHealth);
  const agencyRiskScore = clamp(
    averageRisk + openAlertCount * 2 + regressionCount * 3,
  );
  const agencyResponseScore = clamp(
    100 - agencyRiskScore + verifiedFixedCount * 2,
  );

  return {
    totalClientCount,
    activeMonitoringCount,
    openAlertCount,
    criticalAlertCount,
    highAlertCount,
    regressionCount,
    verifiedFixedCount,
    agencyHealthScore,
    agencyRiskScore,
    agencyResponseScore,
    executiveSummary: `${totalClientCount} monitored client(s), ${openAlertCount} open alert(s), agency risk ${agencyRiskScore}/100 and health ${agencyHealthScore}/100.`,
    operationsSummary: `Prioritize ${criticalAlertCount} critical and ${highAlertCount} high-risk client(s), then address regression alerts.`,
    clientSafeSummary:
      "Agency SOC summarizes monitoring signals for internal prioritization. It does not claim breach detection or complete security coverage.",
    blockedClaims: monitoringProBlockedClaims,
  };
}

export function topIssueForClient(client: AgencyClientRiskInput) {
  if (client.openAlertCount > 0)
    return `${client.openAlertCount} open monitoring alert(s)`;
  if (client.regressionCount > 0)
    return `${client.regressionCount} regression signal(s)`;
  if (client.riskScore >= 65) return "High overall risk score";
  return "No urgent issue from current monitoring snapshot";
}
