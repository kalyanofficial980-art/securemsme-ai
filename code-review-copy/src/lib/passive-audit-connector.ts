import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";

export type PassiveAuditStatus = "pass" | "warning" | "fail" | "info";
export type PassiveAuditSeverity =
  "Critical" | "High" | "Medium" | "Low" | "Info";

export type PassiveToolFinding = {
  name: string;
  category: string;
  status: PassiveAuditStatus;
  severity: PassiveAuditSeverity;
  businessImpact: string;
  recommendation: string;
  sourceTool: string;
  evidence: string;
  confidence: "High" | "Medium" | "Low";
  externalRisk: string;
  alertCount: number;
};

export type PassiveAuditSummary = {
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
};

export type PassiveAuditReport = {
  source: "external-passive-audit";
  toolName: string;
  toolMode: "passive";
  normalizedUrl: string;
  generatedAt: string;
  findings: PassiveToolFinding[];
  score: number;
  riskLevel: "Low" | "Medium" | "High";
  summary: PassiveAuditSummary;
  executiveSummary: string;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  topFixes: string[];
  advancedAudit: ReturnType<typeof buildAdvancedSecurityAudit>;
};

type ZapAlert = {
  alert?: unknown;
  name?: unknown;
  risk?: unknown;
  riskdesc?: unknown;
  confidence?: unknown;
  desc?: unknown;
  description?: unknown;
  solution?: unknown;
  reference?: unknown;
  cweid?: unknown;
  wascid?: unknown;
  instances?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeWebsiteUrl(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Website URL is required.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const url = new URL(withProtocol);
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function getRiskText(alert: ZapAlert) {
  const risk = asText(alert.risk);
  const riskdesc = asText(alert.riskdesc);

  return risk || riskdesc || "Informational";
}

function severityFromRisk(riskValue: string): PassiveAuditSeverity {
  const risk = riskValue.toLowerCase();

  if (risk.includes("critical")) return "Critical";
  if (risk.includes("high")) return "High";
  if (risk.includes("medium")) return "Medium";
  if (risk.includes("low")) return "Low";

  return "Info";
}

function statusFromSeverity(
  severity: PassiveAuditSeverity,
): PassiveAuditStatus {
  if (severity === "Critical" || severity === "High") return "fail";
  if (severity === "Medium" || severity === "Low") return "warning";
  return "info";
}

function confidenceFromText(value: unknown): "High" | "Medium" | "Low" {
  const text = String(value || "").toLowerCase();

  if (text.includes("high")) return "High";
  if (text.includes("low")) return "Low";

  return "Medium";
}

function getAlertInstances(alert: ZapAlert) {
  return Array.isArray(alert.instances) ? alert.instances : [];
}

function extractZapAlerts(rawReport: unknown): ZapAlert[] {
  const root = asRecord(rawReport);
  const alerts: ZapAlert[] = [];

  if (Array.isArray(root.alerts)) {
    root.alerts.forEach((item) => alerts.push(asRecord(item) as ZapAlert));
  }

  if (Array.isArray(root.site)) {
    root.site.forEach((site) => {
      const siteRecord = asRecord(site);
      const siteAlerts = Array.isArray(siteRecord.alerts)
        ? siteRecord.alerts
        : [];
      siteAlerts.forEach((item) => alerts.push(asRecord(item) as ZapAlert));
    });
  }

  if (Array.isArray(root.findings)) {
    root.findings.forEach((item) => alerts.push(asRecord(item) as ZapAlert));
  }

  return alerts;
}

function categoryFromAlertName(alertName: string) {
  const name = alertName.toLowerCase();

  if (name.includes("content security policy") || name.includes("header")) {
    return "Security Headers";
  }

  if (name.includes("cookie") || name.includes("session")) {
    return "Session Security";
  }

  if (name.includes("x-frame") || name.includes("clickjack")) {
    return "Browser Protection";
  }

  if (name.includes("server") || name.includes("powered")) {
    return "Information Exposure";
  }

  if (name.includes("cors")) {
    return "Cross-Origin Policy";
  }

  if (name.includes("cache")) {
    return "Data Exposure";
  }

  return "Passive Tool Finding";
}

function makeBusinessImpact(alertName: string, severity: PassiveAuditSeverity) {
  if (severity === "Critical" || severity === "High") {
    return `${alertName} can create serious security or trust risk and should be fixed before customer-facing production launch.`;
  }

  if (severity === "Medium") {
    return `${alertName} can reduce security posture and customer trust if left unfixed.`;
  }

  if (severity === "Low") {
    return `${alertName} is a lower-risk hardening issue but still useful for MSME trust improvement.`;
  }

  return `${alertName} is informational evidence from passive testing and should be reviewed for context.`;
}

function convertAlertToFinding(
  alert: ZapAlert,
  toolName: string,
): PassiveToolFinding {
  const alertName = asText(
    alert.alert,
    asText(alert.name, "Passive audit finding"),
  );
  const risk = getRiskText(alert);
  const severity = severityFromRisk(risk);
  const status = statusFromSeverity(severity);
  const description = asText(alert.desc, asText(alert.description));
  const solution = asText(
    alert.solution,
    "Review the finding, validate it on the owned website, and apply the recommended hardening control.",
  );
  const references = asText(alert.reference);
  const instances = getAlertInstances(alert);

  const evidenceParts = [
    description ? `Description: ${description}` : "",
    references ? `Reference: ${references}` : "",
    instances.length ? `Observed instances: ${instances.length}` : "",
    alert.cweid ? `CWE: ${String(alert.cweid)}` : "",
    alert.wascid ? `WASC: ${String(alert.wascid)}` : "",
  ].filter(Boolean);

  return {
    name: alertName,
    category: categoryFromAlertName(alertName),
    status,
    severity,
    businessImpact: makeBusinessImpact(alertName, severity),
    recommendation: solution,
    sourceTool: toolName,
    evidence: evidenceParts.join(" | ") || "Passive tool reported this issue.",
    confidence: confidenceFromText(alert.confidence),
    externalRisk: risk,
    alertCount: Math.max(1, instances.length || 1),
  };
}

export function summarizePassiveFindings(
  findings: PassiveToolFinding[],
): PassiveAuditSummary {
  return {
    high: findings.filter(
      (finding) =>
        finding.severity === "Critical" || finding.severity === "High",
    ).length,
    medium: findings.filter((finding) => finding.severity === "Medium").length,
    low: findings.filter((finding) => finding.severity === "Low").length,
    info: findings.filter((finding) => finding.severity === "Info").length,
    total: findings.length,
  };
}

export function scorePassiveFindings(summary: PassiveAuditSummary) {
  const score =
    100 -
    summary.high * 14 -
    summary.medium * 7 -
    summary.low * 3 -
    Math.min(summary.info, 10);

  return Math.max(0, Math.min(100, score));
}

export function passiveRiskLevel(score: number, summary: PassiveAuditSummary) {
  if (summary.high > 0 || score < 60) return "High";
  if (summary.medium > 0 || score < 82) return "Medium";
  return "Low";
}

export function parsePassiveToolReport(input: {
  websiteUrl: string;
  toolName: string;
  rawReport: unknown;
}): PassiveAuditReport {
  const normalizedUrl = normalizeWebsiteUrl(input.websiteUrl);
  const toolName = input.toolName.trim() || "External Passive Tool";
  const alerts = extractZapAlerts(input.rawReport);

  const findings = alerts.map((alert) =>
    convertAlertToFinding(alert, toolName),
  );

  if (!findings.length) {
    findings.push({
      name: "Passive tool report imported with no alerts",
      category: "Passive Tool Import",
      status: "pass",
      severity: "Info",
      businessImpact:
        "The imported passive tool report did not include alert records. This can mean no alerts were detected or the JSON format was not the expected report format.",
      recommendation:
        "Verify that the imported JSON is the full passive scanner report and keep monitoring the website.",
      sourceTool: toolName,
      evidence: "No alert records found in the imported JSON.",
      confidence: "Medium",
      externalRisk: "Informational",
      alertCount: 0,
    });
  }

  const summary = summarizePassiveFindings(findings);
  const score = scorePassiveFindings(summary);
  const riskLevel = passiveRiskLevel(score, summary);

  const baseReport = {
    source: "external-passive-audit" as const,
    toolName,
    toolMode: "passive" as const,
    normalizedUrl,
    generatedAt: new Date().toISOString(),
    findings,
    score,
    riskLevel: riskLevel as PassiveAuditReport["riskLevel"],
    summary,
    executiveSummary:
      riskLevel === "High"
        ? "External passive testing found high-priority security posture issues. Fix these before production or customer trust claims."
        : riskLevel === "Medium"
          ? "External passive testing found medium-priority hardening issues. Improve these before scaling to customers."
          : "External passive testing shows a low-risk public posture, but authenticated/manual testing is still required for full assurance.",
    severityCounts: {
      critical: findings.filter((finding) => finding.severity === "Critical")
        .length,
      high: findings.filter((finding) => finding.severity === "High").length,
      medium: summary.medium,
      low: summary.low,
      info: summary.info,
    },
    topFixes: findings
      .filter((finding) => finding.status !== "pass")
      .slice(0, 5)
      .map((finding) => finding.recommendation),
  };

  return {
    ...baseReport,
    advancedAudit: buildAdvancedSecurityAudit(baseReport),
  };
}

export function getPassiveToolCommand(websiteUrl: string) {
  const target = normalizeWebsiteUrl(websiteUrl);

  return `docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t ${target} -J zap-report.json`;
}
