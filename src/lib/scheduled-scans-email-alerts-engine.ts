export type ScheduleFrequency = "daily" | "weekly" | "monthly";
export type ScheduleStatus = "active" | "paused" | "disabled" | "archived";
export type Severity = "Critical" | "High" | "Medium" | "Low" | "Info";

export type ScheduleInput = {
  targetUrl: string;
  targetName: string;
  frequency: ScheduleFrequency;
  preferredHour: number;
  alertEmail: string;
  authorizationConfirmed: boolean;
  emailAlertsEnabled: boolean;
  riskThreshold: Severity;
};

export type ScheduleDecision = {
  valid: boolean;
  normalizedUrl: string;
  errors: string[];
  nextRunAt: string;
  blockedClaims: string[];
};

export type ScheduledRunSourceCounts = {
  latestScans: number;
  monitoringAlerts: number;
  highRiskAlerts: number;
  openDeveloperTasks: number;
  aiTriageRuns: number;
};

export type ScheduledRunDecision = {
  riskLevel: Severity;
  riskScore: number;
  summary: string;
  detectedChangeSummary: string;
  safeNextAction: string;
  emailShouldSend: boolean;
  emailReason: string;
  alertType:
    "scan-summary" | "high-risk" | "regression" | "digest" | "manual-review";
};

export type EmailTemplateInput = {
  targetUrl: string;
  riskLevel: Severity;
  riskScore: number;
  summary: string;
  safeNextAction: string;
  alertType: string;
};

export const scheduledScanBlockedClaims = [
  "Do not claim scheduled scans prove 100% security.",
  "Do not claim all vulnerabilities were found.",
  "Do not perform unauthorized scanning.",
  "Do not run aggressive or destructive checks.",
  "Do not email exploit payloads or private secrets.",
  "Do not treat monitoring signals as confirmed exploitation.",
];

export function normalizeTargetUrl(url: string) {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  return `https://${trimmed}`;
}

export function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test((email || "").trim());
}

export function calculateNextRunAt(
  frequency: ScheduleFrequency,
  preferredHour: number,
  fromDate = new Date(),
) {
  const next = new Date(fromDate);
  next.setMinutes(0, 0, 0);
  next.setHours(Math.max(0, Math.min(23, preferredHour)));

  if (next <= fromDate) {
    if (frequency === "daily") next.setDate(next.getDate() + 1);
    if (frequency === "weekly") next.setDate(next.getDate() + 7);
    if (frequency === "monthly") next.setMonth(next.getMonth() + 1);
  }

  if (frequency === "weekly" && next <= fromDate)
    next.setDate(next.getDate() + 7);
  if (frequency === "monthly" && next <= fromDate)
    next.setMonth(next.getMonth() + 1);

  return next.toISOString();
}

export function validateScheduleInput(input: ScheduleInput): ScheduleDecision {
  const normalizedUrl = normalizeTargetUrl(input.targetUrl);
  const errors: string[] = [];

  if (!normalizedUrl) errors.push("Target URL is required.");
  if (
    normalizedUrl &&
    !/^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(normalizedUrl)
  )
    errors.push("Enter a valid website URL.");
  if (!input.authorizationConfirmed)
    errors.push(
      "Authorization confirmation is required before scheduled scans.",
    );
  if (
    input.emailAlertsEnabled &&
    input.alertEmail &&
    !isValidEmail(input.alertEmail)
  )
    errors.push("Enter a valid alert email.");
  if (input.preferredHour < 0 || input.preferredHour > 23)
    errors.push("Preferred hour must be between 0 and 23.");

  return {
    valid: errors.length === 0,
    normalizedUrl,
    errors,
    nextRunAt: calculateNextRunAt(input.frequency, input.preferredHour),
    blockedClaims: scheduledScanBlockedClaims,
  };
}

function severityRank(value: Severity) {
  return { Info: 0, Low: 1, Medium: 2, High: 3, Critical: 4 }[value];
}

export function evaluateScheduledRun(
  sourceCounts: ScheduledRunSourceCounts,
  threshold: Severity,
): ScheduledRunDecision {
  let riskScore = 20;
  riskScore += sourceCounts.highRiskAlerts * 20;
  riskScore += sourceCounts.monitoringAlerts * 10;
  riskScore += Math.min(20, sourceCounts.openDeveloperTasks * 4);
  riskScore += sourceCounts.aiTriageRuns > 0 ? 5 : 0;
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

  const riskLevel: Severity =
    riskScore >= 85
      ? "Critical"
      : riskScore >= 65
        ? "High"
        : riskScore >= 40
          ? "Medium"
          : riskScore >= 20
            ? "Low"
            : "Info";

  const regression = sourceCounts.monitoringAlerts > 0;
  const highRisk = severityRank(riskLevel) >= severityRank(threshold);

  return {
    riskLevel,
    riskScore,
    summary: `Scheduled safe check completed. Risk score ${riskScore}/100 with ${sourceCounts.monitoringAlerts} monitoring alert(s), ${sourceCounts.highRiskAlerts} high-risk alert(s), and ${sourceCounts.openDeveloperTasks} open developer task(s).`,
    detectedChangeSummary: regression
      ? "One or more monitoring signals may need review before client-safe status is claimed."
      : "No open monitoring regression signal was detected from available sources.",
    safeNextAction: highRisk
      ? "Review high-risk items, assign developer fixes, and run retest proof before making client-facing fixed claims."
      : "Continue monitoring and keep report evidence updated.",
    emailShouldSend: highRisk || regression,
    emailReason: highRisk
      ? `Risk level ${riskLevel} meets threshold ${threshold}.`
      : regression
        ? "Regression alert exists."
        : "No alert email needed.",
    alertType: highRisk
      ? "high-risk"
      : regression
        ? "regression"
        : "scan-summary",
  };
}

export function buildEmailTemplate(input: EmailTemplateInput) {
  const subject = `[SecureMSME AI] ${input.riskLevel} alert for ${input.targetUrl}`;
  const body = [
    `Security monitoring update for ${input.targetUrl}`,
    "",
    `Alert type: ${input.alertType}`,
    `Risk level: ${input.riskLevel}`,
    `Risk score: ${input.riskScore}/100`,
    "",
    "Summary:",
    input.summary,
    "",
    "Safe next action:",
    input.safeNextAction,
    "",
    "Important limitations:",
    "- This is an authorized safe monitoring alert.",
    "- This does not guarantee 100% security.",
    "- This does not mean all vulnerabilities were found.",
    "- This is not legal compliance certification.",
  ].join("\n");

  return { subject, body };
}
