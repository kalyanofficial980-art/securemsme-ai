export type ToolMode =
  "safe-passive" | "verified-passive" | "authorized-deep-passive";

export type ToolAvailability = "implemented" | "architecture-ready" | "planned";
export type ToolRunStatus =
  "queued" | "running" | "completed" | "failed" | "skipped" | "blocked";

export type ToolModule = {
  id: string;
  name: string;
  category: string;
  mode: ToolMode;
  availability: ToolAvailability;
  requiresVerification: boolean;
  customerValue: string;
  output: string;
  safeBoundary: string[];
};

export type NormalizedToolEvidence = {
  sourceToolId: string;
  sourceToolName: string;
  evidenceType:
    "public-evidence" | "risk-signal" | "claim-control" | "workflow";
  title: string;
  category: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  status: string;
  confidence: string;
  falsePositiveRisk: string;
  rawEvidence: string[];
  normalizedEvidence: string;
  claimControl: {
    canClaim: string;
    cannotClaim: string;
  };
};

export type ToolRunnerPlanItem = ToolModule & {
  runStatus: ToolRunStatus;
  reason: string;
  evidenceCount: number;
};

export type ToolRunnerReport = {
  version: string;
  generatedAt: string;
  websiteUrl: string;
  scanId?: string;
  mode: ToolMode;
  verifiedScope: boolean;
  totalTools: number;
  completedTools: number;
  blockedTools: number;
  queuedTools: number;
  architectureReadyTools: number;
  safeBoundary: string[];
  customerMessage: string;
  nextToolRoadmap: string[];
  tools: ToolRunnerPlanItem[];
  normalizedEvidence: NormalizedToolEvidence[];
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

function normalizeSeverity(value: unknown): NormalizedToolEvidence["severity"] {
  const text = String(value || "").toLowerCase();

  if (text.includes("critical")) return "Critical";
  if (text.includes("high")) return "High";
  if (text.includes("medium")) return "Medium";
  if (text.includes("low")) return "Low";

  return "Info";
}

function makeEvidenceArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  if (typeof value === "string" && value.trim()) return [value.trim()];

  return [];
}

export const TOOL_RUNNER_SAFE_BOUNDARY = [
  "No exploitation",
  "No brute force",
  "No login bypass",
  "No destructive testing",
  "No private data access",
  "No password guessing",
  "No high-volume aggressive scanning",
  "Verified scope required before deeper tool modules",
];

export function getToolRegistry(): ToolModule[] {
  return [
    {
      id: "securemsme-core-scanner",
      name: "SecureMSME Core Scanner",
      category: "Native scanner",
      mode: "safe-passive",
      availability: "implemented",
      requiresVerification: false,
      customerValue:
        "Collects HTTPS, security header, DNS, public file, sitemap, robots, and trust-page signals.",
      output: "Base score, findings, top fixes, and public security posture.",
      safeBoundary: TOOL_RUNNER_SAFE_BOUNDARY,
    },
    {
      id: "securemsme-inbuilt-audit",
      name: "Inbuilt Advanced Audit",
      category: "Inbuilt audit",
      mode: "safe-passive",
      availability: "implemented",
      requiresVerification: false,
      customerValue:
        "Turns browser/security/trust signals into customer-ready risk evidence.",
      output: "Advanced audit modules, priority fixes, and business readiness.",
      safeBoundary: TOOL_RUNNER_SAFE_BOUNDARY,
    },
    {
      id: "securemsme-vulnerability-intelligence",
      name: "Vulnerability Intelligence Engine",
      category: "Vulnerability intelligence",
      mode: "safe-passive",
      availability: "implemented",
      requiresVerification: false,
      customerValue:
        "Detects public technology signals, exposed versions, and attack surface inventory.",
      output: "Technology fingerprinting, confidence labels, and risk signals.",
      safeBoundary: TOOL_RUNNER_SAFE_BOUNDARY,
    },
    {
      id: "securemsme-evidence-calibration",
      name: "Evidence Calibration Engine",
      category: "Claim control",
      mode: "safe-passive",
      availability: "implemented",
      requiresVerification: false,
      customerValue:
        "Separates confirmed evidence from probable risk and blocks unsafe claims.",
      output:
        "False-positive guard, report quality score, and can/cannot claim rules.",
      safeBoundary: TOOL_RUNNER_SAFE_BOUNDARY,
    },
    {
      id: "securemsme-customer-value",
      name: "Customer Value Workflow",
      category: "Fix workflow",
      mode: "safe-passive",
      availability: "implemented",
      requiresVerification: false,
      customerValue:
        "Converts findings into developer tasks, status tracking, and before/after proof workflow.",
      output: "Fix workflow, owner action plan, and proof-of-fix guidance.",
      safeBoundary: TOOL_RUNNER_SAFE_BOUNDARY,
    },
    {
      id: "safe-template-runner",
      name: "Safe Template Runner",
      category: "Template engine",
      mode: "verified-passive",
      availability: "architecture-ready",
      requiresVerification: true,
      customerValue:
        "Future controlled Nuclei-style safe templates for verified customer-owned websites.",
      output: "Template evidence normalized into SecureMSME report format.",
      safeBoundary: TOOL_RUNNER_SAFE_BOUNDARY,
    },
    {
      id: "passive-zap-worker",
      name: "Passive ZAP-style Worker",
      category: "Passive worker",
      mode: "verified-passive",
      availability: "architecture-ready",
      requiresVerification: true,
      customerValue:
        "Future backend passive crawler/worker that customers do not install locally.",
      output:
        "Passive tool findings, normalized evidence, and report integration.",
      safeBoundary: TOOL_RUNNER_SAFE_BOUNDARY,
    },
    {
      id: "cve-intelligence-enricher",
      name: "CVE Intelligence Enricher",
      category: "CVE intelligence",
      mode: "safe-passive",
      availability: "planned",
      requiresVerification: false,
      customerValue:
        "Future technology-to-CVE enrichment with confidence and version safety controls.",
      output: "CVE-linked risk signals without overclaiming exploitability.",
      safeBoundary: TOOL_RUNNER_SAFE_BOUNDARY,
    },
  ];
}

function collectEvidenceCalibration(report: Record<string, unknown>) {
  const calibration = asRecord(report.evidenceCalibration);

  return asArray(calibration.items).map((raw): NormalizedToolEvidence => {
    const item = asRecord(raw);
    const title = asText(item.title, "Calibrated evidence");

    return {
      sourceToolId: "securemsme-evidence-calibration",
      sourceToolName: "Evidence Calibration Engine",
      evidenceType: "claim-control",
      title,
      category: asText(item.category, "Evidence calibration"),
      severity: normalizeSeverity(item.severity),
      status: asText(item.status, "informational"),
      confidence: asText(item.confidence, "Medium"),
      falsePositiveRisk: asText(item.falsePositiveRisk, "Medium"),
      rawEvidence: makeEvidenceArray(item.evidence),
      normalizedEvidence: `${title}: ${asText(
        item.whyThisIsReal,
        "Evidence was normalized from the SecureMSME report.",
      )}`,
      claimControl: {
        canClaim: asText(
          item.whatCanBeClaimed,
          "Can claim this is a safe public report signal.",
        ),
        cannotClaim: asText(
          item.whatCannotBeClaimed,
          "Cannot claim exploitation, compromise, or full penetration testing.",
        ),
      },
    };
  });
}

function collectVulnerabilityIntel(report: Record<string, unknown>) {
  const intel = asRecord(report.vulnerabilityIntelligence);

  return asArray(intel.findings).map((raw): NormalizedToolEvidence => {
    const finding = asRecord(raw);
    const title = asText(finding.title, "Vulnerability intelligence signal");

    return {
      sourceToolId: "securemsme-vulnerability-intelligence",
      sourceToolName: "Vulnerability Intelligence Engine",
      evidenceType: "risk-signal",
      title,
      category: asText(finding.category, "Vulnerability intelligence"),
      severity: normalizeSeverity(finding.severity),
      status: asText(finding.status, "risk-signal"),
      confidence: asText(finding.confidence, "Medium"),
      falsePositiveRisk: "Medium",
      rawEvidence: makeEvidenceArray(finding.evidence),
      normalizedEvidence: `${title}: ${asText(
        finding.customerImpact,
        "Public risk signal detected.",
      )}`,
      claimControl: {
        canClaim:
          "Can claim this is a public risk signal or technology exposure indicator.",
        cannotClaim:
          "Cannot claim a confirmed exploit unless a future authorized module validates it.",
      },
    };
  });
}

function collectInbuiltAudit(report: Record<string, unknown>) {
  const inbuilt = asRecord(report.inbuiltAdvancedAudit);

  return asArray(inbuilt.evidence).map((raw): NormalizedToolEvidence => {
    const item = asRecord(raw);
    const title = asText(item.title, "Inbuilt audit evidence");

    return {
      sourceToolId: "securemsme-inbuilt-audit",
      sourceToolName: "Inbuilt Advanced Audit",
      evidenceType: "public-evidence",
      title,
      category: asText(item.module, "Inbuilt audit"),
      severity: normalizeSeverity(item.severity),
      status: asText(item.status, "informational"),
      confidence: asText(item.confidence, "Medium"),
      falsePositiveRisk: "Medium",
      rawEvidence: makeEvidenceArray(item.evidence),
      normalizedEvidence: `${title}: ${asText(
        item.customerImpact,
        "Public security posture evidence.",
      )}`,
      claimControl: {
        canClaim:
          "Can claim this evidence was observed during a safe public audit.",
        cannotClaim:
          "Cannot claim the issue is exploitable without authorized validation.",
      },
    };
  });
}

function collectCoreFindings(report: Record<string, unknown>) {
  return asArray(report.findings).map((raw): NormalizedToolEvidence => {
    const finding = asRecord(raw);
    const title = asText(
      finding.name,
      asText(finding.title, "Core scanner finding"),
    );

    return {
      sourceToolId: "securemsme-core-scanner",
      sourceToolName: "SecureMSME Core Scanner",
      evidenceType: "public-evidence",
      title,
      category: asText(finding.category, "Core scanner"),
      severity: normalizeSeverity(finding.severity),
      status: asText(finding.status, "informational"),
      confidence: asText(finding.confidence, "Medium"),
      falsePositiveRisk: "Medium",
      rawEvidence: [
        ...makeEvidenceArray(finding.evidence),
        ...makeEvidenceArray(finding.description),
      ].slice(0, 8),
      normalizedEvidence: `${title}: ${asText(
        finding.description,
        "Public scan finding.",
      )}`,
      claimControl: {
        canClaim:
          "Can claim this public signal was checked by the core scanner.",
        cannotClaim:
          "Cannot claim full security coverage or full penetration testing.",
      },
    };
  });
}

export function normalizeToolEvidenceFromReport(
  reportInput: Record<string, unknown> | null | undefined,
) {
  const report = reportInput || {};

  const evidence = [
    ...collectCoreFindings(report),
    ...collectInbuiltAudit(report),
    ...collectVulnerabilityIntel(report),
    ...collectEvidenceCalibration(report),
  ];

  const seen = new Set<string>();

  return evidence.filter((item) => {
    const key = `${item.sourceToolId}-${item.title}-${item.category}`
      .toLowerCase()
      .replace(/\s+/g, " ");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function modeFromVerification(verifiedScope: boolean): ToolMode {
  return verifiedScope ? "verified-passive" : "safe-passive";
}

export function buildToolRunnerReport(input: {
  websiteUrl: string;
  scanId?: string;
  report?: Record<string, unknown> | null;
  verifiedScope?: boolean;
}): ToolRunnerReport {
  const verifiedScope = Boolean(input.verifiedScope);
  const mode = modeFromVerification(verifiedScope);
  const normalizedEvidence = normalizeToolEvidenceFromReport(input.report);
  const registry = getToolRegistry();

  const tools = registry.map((tool): ToolRunnerPlanItem => {
    const evidenceCount = normalizedEvidence.filter(
      (item) => item.sourceToolId === tool.id,
    ).length;

    if (tool.requiresVerification && !verifiedScope) {
      return {
        ...tool,
        runStatus: "blocked",
        reason: "Website ownership/permission verification is required.",
        evidenceCount,
      };
    }

    if (tool.availability === "implemented") {
      return {
        ...tool,
        runStatus: "completed",
        reason:
          "This SecureMSME AI inbuilt module is already active in reports.",
        evidenceCount,
      };
    }

    if (tool.availability === "architecture-ready") {
      return {
        ...tool,
        runStatus: "skipped",
        reason:
          "Architecture is ready. Worker execution will be added in the next tool module part.",
        evidenceCount,
      };
    }

    return {
      ...tool,
      runStatus: "skipped",
      reason: "Planned future enrichment module.",
      evidenceCount,
    };
  });

  const completedTools = tools.filter(
    (tool) => tool.runStatus === "completed",
  ).length;
  const blockedTools = tools.filter(
    (tool) => tool.runStatus === "blocked",
  ).length;
  const queuedTools = tools.filter(
    (tool) => tool.runStatus === "queued",
  ).length;
  const architectureReadyTools = tools.filter(
    (tool) => tool.availability === "architecture-ready",
  ).length;

  return {
    version: "25.0",
    generatedAt: new Date().toISOString(),
    websiteUrl: input.websiteUrl,
    scanId: input.scanId,
    mode,
    verifiedScope,
    totalTools: tools.length,
    completedTools,
    blockedTools,
    queuedTools,
    architectureReadyTools,
    safeBoundary: TOOL_RUNNER_SAFE_BOUNDARY,
    customerMessage:
      "SecureMSME AI now has a built-in tool-runner architecture. Customers do not install tools; backend modules normalize evidence into safe reports.",
    nextToolRoadmap: [
      "Mega Part 26: Safe Nuclei-style template engine",
      "Mega Part 27: Passive ZAP-style worker integration",
      "Mega Part 28: CVE intelligence enrichment",
      "Mega Part 29: Retest proof automation",
    ],
    tools,
    normalizedEvidence,
  };
}

export function buildToolJobRows(input: {
  userId: string;
  websiteId: string | null;
  scanId: string | null;
  report: ToolRunnerReport;
}) {
  const runRows = input.report.tools.map((tool) => ({
    user_id: input.userId,
    website_id: input.websiteId,
    scan_id: input.scanId,
    tool_id: tool.id,
    tool_name: tool.name,
    tool_category: tool.category,
    tool_mode: tool.mode,
    status: tool.runStatus,
    requires_verification: tool.requiresVerification,
    output_summary: {
      customerValue: tool.customerValue,
      output: tool.output,
      reason: tool.reason,
      availability: tool.availability,
    },
    evidence_count: tool.evidenceCount,
    safe_boundary: tool.safeBoundary,
  }));

  const evidenceRows = input.report.normalizedEvidence
    .slice(0, 80)
    .map((item) => ({
      user_id: input.userId,
      website_id: input.websiteId,
      scan_id: input.scanId,
      source_tool_id: item.sourceToolId,
      source_tool_name: item.sourceToolName,
      evidence_type: item.evidenceType,
      title: item.title,
      category: item.category,
      severity: item.severity,
      status: item.status,
      confidence: item.confidence,
      false_positive_risk: item.falsePositiveRisk,
      raw_evidence: item.rawEvidence,
      normalized_evidence: item.normalizedEvidence,
      claim_control: item.claimControl,
    }));

  return { runRows, evidenceRows };
}
