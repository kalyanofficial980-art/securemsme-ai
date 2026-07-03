import type { NormalizedToolEvidence } from "@/lib/tool-runner";

export type PassiveWorkerSeverity =
  "Critical" | "High" | "Medium" | "Low" | "Info";
export type PassiveWorkerStatus =
  "observed" | "not-observed" | "blocked" | "manual-review" | "informational";
export type PassiveWorkerConfidence = "Confirmed" | "High" | "Medium" | "Low";

export type PassiveWorkerPolicy = {
  maxPages: number;
  maxLinksPerPage: number;
  sameOriginOnly: boolean;
  allowedMethods: string[];
  blockedActions: string[];
  timeoutMs: number;
};

export type PassivePageObservation = {
  url: string;
  statusCode?: number;
  title?: string;
  contentType?: string;
  discoveredLinks: string[];
  signals: string[];
};

export type PassiveAlert = {
  id: string;
  title: string;
  category: string;
  severity: PassiveWorkerSeverity;
  status: PassiveWorkerStatus;
  confidence: PassiveWorkerConfidence;
  falsePositiveRisk: "Low" | "Medium" | "High";
  evidence: string[];
  customerImpact: string;
  developerFix: string;
  canClaim: string;
  cannotClaim: string;
};

export type PassiveZapWorkerReport = {
  version: string;
  generatedAt: string;
  websiteUrl: string;
  verifiedScope: boolean;
  mode: "safe-passive" | "verified-passive";
  policy: PassiveWorkerPolicy;
  pagesObserved: number;
  linksDiscovered: number;
  alertsObserved: number;
  blockedActions: number;
  summary: string;
  safeBoundary: string[];
  observations: PassivePageObservation[];
  alerts: PassiveAlert[];
  normalizedEvidence: NormalizedToolEvidence[];
};

type ReportEvidence = {
  title: string;
  category: string;
  severity: PassiveWorkerSeverity;
  text: string;
  evidence: string[];
  source: string;
};

export const PASSIVE_WORKER_SAFE_BOUNDARY = [
  "GET-style passive discovery only",
  "Same-origin page discovery only",
  "No form submission",
  "No login attempts",
  "No brute force",
  "No exploit payloads",
  "No destructive testing",
  "No private data access",
  "Low crawl limits",
  "Evidence is normalized with can/cannot claim rules",
];

export function getPassiveWorkerPolicy(
  verifiedScope = false,
): PassiveWorkerPolicy {
  return {
    maxPages: verifiedScope ? 12 : 4,
    maxLinksPerPage: verifiedScope ? 20 : 8,
    sameOriginOnly: true,
    allowedMethods: ["GET", "HEAD"],
    blockedActions: [
      "POST form submission",
      "Authentication testing",
      "Password guessing",
      "Exploit payloads",
      "High-volume crawling",
      "Private/admin brute forcing",
      "Mutation/destructive requests",
    ],
    timeoutMs: 8000,
  };
}

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

function normalizeSeverity(value: unknown): PassiveWorkerSeverity {
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

function safeUrl(input: string) {
  const withProtocol = /^https?:\/\//i.test(input.trim())
    ? input.trim()
    : `https://${input.trim()}`;

  return new URL(withProtocol);
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function textHas(text: string, terms: string[]) {
  const lower = text.toLowerCase();

  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function collectReportEvidence(
  reportInput: Record<string, unknown> | null | undefined,
) {
  const report = reportInput || {};
  const evidence: ReportEvidence[] = [];

  asArray(report.findings).forEach((raw) => {
    const item = asRecord(raw);
    const title = asText(item.name, asText(item.title, "Scanner finding"));
    const rawEvidence = [
      ...makeEvidenceArray(item.evidence),
      ...makeEvidenceArray(item.description),
      ...makeEvidenceArray(item.recommendation),
      ...makeEvidenceArray(item.observedValue),
    ];

    evidence.push({
      title,
      category: asText(item.category, "Core scanner"),
      severity: normalizeSeverity(item.severity),
      text: `${title} ${rawEvidence.join(" ")}`,
      evidence: rawEvidence,
      source: "core-scanner",
    });
  });

  const inbuilt = asRecord(report.inbuiltAdvancedAudit);
  asArray(inbuilt.evidence).forEach((raw) => {
    const item = asRecord(raw);
    const title = asText(item.title, "Inbuilt audit evidence");
    const rawEvidence = makeEvidenceArray(item.evidence);

    evidence.push({
      title,
      category: asText(item.module, "Inbuilt audit"),
      severity: normalizeSeverity(item.severity),
      text: `${title} ${rawEvidence.join(" ")}`,
      evidence: rawEvidence,
      source: "inbuilt-audit",
    });
  });

  const intel = asRecord(report.vulnerabilityIntelligence);
  asArray(intel.findings).forEach((raw) => {
    const item = asRecord(raw);
    const title = asText(item.title, "Vulnerability intelligence finding");
    const rawEvidence = makeEvidenceArray(item.evidence);

    evidence.push({
      title,
      category: asText(item.category, "Vulnerability intelligence"),
      severity: normalizeSeverity(item.severity),
      text: `${title} ${rawEvidence.join(" ")}`,
      evidence: rawEvidence,
      source: "vulnerability-intelligence",
    });
  });

  asArray(intel.technologies).forEach((raw) => {
    const item = asRecord(raw);
    const title = `${asText(item.name, "Technology")} detected`;
    const rawEvidence = [
      ...makeEvidenceArray(item.evidence),
      item.version ? `Version: ${String(item.version)}` : "",
    ].filter(Boolean);

    evidence.push({
      title,
      category: asText(item.category, "Technology"),
      severity: item.version ? "Low" : "Info",
      text: `${title} ${rawEvidence.join(" ")}`,
      evidence: rawEvidence,
      source: "technology",
    });
  });

  const calibration = asRecord(report.evidenceCalibration);
  asArray(calibration.items).forEach((raw) => {
    const item = asRecord(raw);
    const title = asText(item.title, "Evidence calibration");
    const rawEvidence = makeEvidenceArray(item.evidence);

    evidence.push({
      title,
      category: asText(item.category, "Evidence calibration"),
      severity: normalizeSeverity(item.severity),
      text: `${title} ${rawEvidence.join(" ")}`,
      evidence: rawEvidence,
      source: "evidence-calibration",
    });
  });

  return evidence;
}

function extractCandidateLinks(
  reportEvidence: ReportEvidence[],
  websiteUrl: string,
) {
  const origin = safeUrl(websiteUrl).origin;
  const raw = reportEvidence.flatMap((item) => item.evidence);

  const urlMatches = raw.flatMap((item) => {
    const matches = item.match(
      /https?:\/\/[^\s"'<>]+|\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]+/g,
    );

    return matches || [];
  });

  const links = urlMatches
    .map((candidate) => {
      try {
        return new URL(candidate, origin).toString();
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value))
    .filter((url) => {
      try {
        return new URL(url).origin === origin;
      } catch {
        return false;
      }
    });

  return unique([origin, ...links]).slice(0, 20);
}

function buildObservations(input: {
  websiteUrl: string;
  reportEvidence: ReportEvidence[];
  verifiedScope: boolean;
}) {
  const policy = getPassiveWorkerPolicy(input.verifiedScope);
  const links = extractCandidateLinks(
    input.reportEvidence,
    input.websiteUrl,
  ).slice(0, policy.maxPages);

  if (!links.length) {
    links.push(safeUrl(input.websiteUrl).origin);
  }

  return links.map((url): PassivePageObservation => {
    const relatedEvidence = input.reportEvidence
      .filter(
        (item) =>
          item.text.includes(url) || url.includes(item.title.toLowerCase()),
      )
      .slice(0, 4);

    const signals = unique(
      relatedEvidence
        .flatMap((item) => [item.title, item.category, ...item.evidence])
        .filter(Boolean),
    ).slice(0, 10);

    return {
      url,
      discoveredLinks: links
        .filter((item) => item !== url)
        .slice(0, policy.maxLinksPerPage),
      signals: signals.length
        ? signals
        : ["Passive observation generated from report evidence."],
    };
  });
}

function addAlert(alerts: PassiveAlert[], input: Omit<PassiveAlert, "id">) {
  const id = `PZ-${String(alerts.length + 1).padStart(3, "0")}`;

  if (
    alerts.some(
      (alert) =>
        alert.title.toLowerCase() === input.title.toLowerCase() &&
        alert.category.toLowerCase() === input.category.toLowerCase(),
    )
  ) {
    return;
  }

  alerts.push({ id, ...input });
}

function buildAlerts(input: {
  evidence: ReportEvidence[];
  observations: PassivePageObservation[];
  verifiedScope: boolean;
}) {
  const alerts: PassiveAlert[] = [];
  const allText = input.evidence
    .map((item) => item.text)
    .join(" ")
    .toLowerCase();
  const allEvidence = input.evidence.flatMap((item) => item.evidence);

  if (
    textHas(allText, ["content-security-policy", "csp", "header not found"])
  ) {
    addAlert(alerts, {
      title: "Passive alert: Content Security Policy not observed",
      category: "Browser security",
      severity: "Medium",
      status: "observed",
      confidence: "High",
      falsePositiveRisk: "Low",
      evidence: allEvidence
        .filter((item) => /content-security-policy|csp|header/i.test(item))
        .slice(0, 6),
      customerImpact:
        "A missing or weak CSP can increase browser-side attack impact if another weakness exists.",
      developerFix:
        "Add a tested CSP header. Start with report-only mode if the site has many scripts.",
      canClaim:
        "Can claim the passive worker did not observe CSP evidence in the report.",
      cannotClaim:
        "Cannot claim confirmed XSS or exploitation without authorized validation.",
    });
  }

  if (textHas(allText, ["strict-transport-security", "hsts"])) {
    addAlert(alerts, {
      title: "Passive alert: HSTS signal needs review",
      category: "Transport security",
      severity: "Medium",
      status: "observed",
      confidence: "High",
      falsePositiveRisk: "Low",
      evidence: allEvidence
        .filter((item) => /strict-transport-security|hsts/i.test(item))
        .slice(0, 6),
      customerImpact:
        "HSTS improves HTTPS enforcement for returning visitors and reduces downgrade risk.",
      developerFix:
        "Confirm HTTPS is stable across the site, then add or strengthen Strict-Transport-Security.",
      canClaim: "Can claim HSTS evidence was reviewed by the passive worker.",
      cannotClaim:
        "Cannot claim traffic interception or active attack occurred.",
    });
  }

  if (
    textHas(allText, ["x-frame-options", "frame-ancestors", "clickjacking"])
  ) {
    addAlert(alerts, {
      title: "Passive alert: Frame protection signal needs review",
      category: "Browser security",
      severity: "Medium",
      status: "observed",
      confidence: "Medium",
      falsePositiveRisk: "Medium",
      evidence: allEvidence
        .filter((item) =>
          /x-frame-options|frame-ancestors|clickjacking/i.test(item),
        )
        .slice(0, 6),
      customerImpact:
        "Frame protection helps reduce clickjacking risk for sensitive pages.",
      developerFix:
        "Add CSP frame-ancestors or X-Frame-Options depending on the app's embedding needs.",
      canClaim:
        "Can claim frame protection evidence was reviewed from passive signals.",
      cannotClaim:
        "Cannot claim confirmed clickjacking without manual page-level validation.",
    });
  }

  if (textHas(allText, ["swagger", "openapi", "/api/docs", "swagger-ui"])) {
    addAlert(alerts, {
      title: "Passive alert: API documentation surface observed",
      category: "API surface",
      severity: "Medium",
      status: input.verifiedScope ? "observed" : "manual-review",
      confidence: input.verifiedScope ? "High" : "Medium",
      falsePositiveRisk: "Medium",
      evidence: allEvidence
        .filter((item) => /swagger|openapi|api\/docs|swagger-ui/i.test(item))
        .slice(0, 6),
      customerImpact:
        "Public API documentation can reveal endpoint structure and speed up attacker reconnaissance.",
      developerFix:
        "Restrict API docs if not intentionally public, and avoid exposing sensitive endpoint details.",
      canClaim:
        "Can claim API documentation surface was observed or needs review from passive evidence.",
      cannotClaim:
        "Cannot claim API vulnerabilities exist without authorized API testing.",
    });
  }

  if (
    textHas(allText, [
      "/admin",
      "/login",
      "/wp-admin",
      "admin path",
      "login path",
    ])
  ) {
    addAlert(alerts, {
      title: "Passive alert: Public admin/login surface observed",
      category: "Attack surface",
      severity: "Medium",
      status: "observed",
      confidence: "High",
      falsePositiveRisk: "Medium",
      evidence: allEvidence
        .filter((item) =>
          /\/admin|\/login|\/wp-admin|admin path|login path/i.test(item),
        )
        .slice(0, 6),
      customerImpact:
        "Public login/admin surfaces increase exposure and should have MFA, rate limits, and monitoring.",
      developerFix:
        "Restrict admin paths, add MFA/rate limiting, and monitor login abuse.",
      canClaim:
        "Can claim public admin/login surface was observed from passive evidence.",
      cannotClaim:
        "Cannot claim authentication bypass, credential compromise, or account takeover.",
    });
  }

  if (
    textHas(allText, [
      "/.env",
      "backup.zip",
      "backup.sql",
      "config.php",
      "phpinfo",
      "/debug",
    ])
  ) {
    addAlert(alerts, {
      title: "Passive alert: Sensitive debug/config path signal",
      category: "Sensitive surface",
      severity: "High",
      status: input.verifiedScope ? "manual-review" : "blocked",
      confidence: input.verifiedScope ? "Medium" : "Confirmed",
      falsePositiveRisk: "High",
      evidence: allEvidence
        .filter((item) =>
          /\.env|backup\.zip|backup\.sql|config\.php|phpinfo|\/debug/i.test(
            item,
          ),
        )
        .slice(0, 6),
      customerImpact:
        "Debug/config path signals can be serious if files are actually accessible.",
      developerFix:
        "Remove debug/config/backup files from the public web root and block access at server/CDN.",
      canClaim: input.verifiedScope
        ? "Can claim sensitive path signal needs manual validation."
        : "Can claim this deeper validation is blocked until verified scope.",
      cannotClaim:
        "Cannot claim secrets were exposed unless authorized evidence proves it without collecting private data.",
    });
  }

  if (input.observations.length > 1) {
    addAlert(alerts, {
      title: "Passive alert: Multiple public pages discovered",
      category: "Passive discovery",
      severity: "Info",
      status: "informational",
      confidence: "Medium",
      falsePositiveRisk: "Low",
      evidence: input.observations.map((item) => item.url).slice(0, 8),
      customerImpact:
        "Page discovery helps create a clearer public attack surface inventory.",
      developerFix:
        "Review public pages and ensure sensitive/admin pages are protected.",
      canClaim:
        "Can claim passive worker built a limited public page inventory.",
      cannotClaim:
        "Cannot claim the crawl covered every page or hidden authenticated area.",
    });
  }

  return alerts;
}

function toNormalizedEvidence(alert: PassiveAlert): NormalizedToolEvidence {
  return {
    sourceToolId: "passive-zap-worker",
    sourceToolName: "Passive ZAP-style Worker",
    evidenceType: alert.status === "observed" ? "risk-signal" : "claim-control",
    title: alert.title,
    category: alert.category,
    severity: alert.severity,
    status: alert.status,
    confidence: alert.confidence,
    falsePositiveRisk: alert.falsePositiveRisk,
    rawEvidence: alert.evidence.length
      ? alert.evidence
      : ["No raw evidence saved for this alert."],
    normalizedEvidence: `${alert.title}: ${alert.customerImpact}`,
    claimControl: {
      canClaim: alert.canClaim,
      cannotClaim: alert.cannotClaim,
    },
  };
}

export function runPassiveZapStyleWorker(input: {
  websiteUrl: string;
  report?: Record<string, unknown> | null;
  verifiedScope?: boolean;
}): PassiveZapWorkerReport {
  const verifiedScope = Boolean(input.verifiedScope);
  const policy = getPassiveWorkerPolicy(verifiedScope);
  const evidence = collectReportEvidence(input.report);
  const observations = buildObservations({
    websiteUrl: input.websiteUrl,
    reportEvidence: evidence,
    verifiedScope,
  });
  const alerts = buildAlerts({ evidence, observations, verifiedScope });
  const blockedActions = policy.blockedActions.length;

  return {
    version: "27.0",
    generatedAt: new Date().toISOString(),
    websiteUrl: input.websiteUrl,
    verifiedScope,
    mode: verifiedScope ? "verified-passive" : "safe-passive",
    policy,
    pagesObserved: observations.length,
    linksDiscovered: unique(
      observations.flatMap((item) => item.discoveredLinks),
    ).length,
    alertsObserved: alerts.length,
    blockedActions,
    summary:
      "Passive ZAP-style worker normalized public report evidence into passive alerts with strict safety boundaries. No attack payloads or active exploitation were used.",
    safeBoundary: PASSIVE_WORKER_SAFE_BOUNDARY,
    observations,
    alerts,
    normalizedEvidence: alerts.map(toNormalizedEvidence),
  };
}
