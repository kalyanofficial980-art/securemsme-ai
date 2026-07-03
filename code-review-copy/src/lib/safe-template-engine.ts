import type { NormalizedToolEvidence } from "@/lib/tool-runner";

export type SafeTemplateSeverity =
  "Critical" | "High" | "Medium" | "Low" | "Info";
export type SafeTemplateConfidence = "Confirmed" | "High" | "Medium" | "Low";
export type SafeTemplateCategory =
  | "security-headers"
  | "trust-surface"
  | "dns-email"
  | "technology-exposure"
  | "attack-surface"
  | "claim-control";

export type SafeTemplateScope = "public-safe" | "verified-passive";

export type SafeTemplateDefinition = {
  id: string;
  name: string;
  category: SafeTemplateCategory;
  severity: SafeTemplateSeverity;
  scope: SafeTemplateScope;
  enabled: boolean;
  unsafeBlocked: boolean;
  description: string;
  customerImpact: string;
  developerFix: string;
  canClaim: string;
  cannotClaim: string;
  matchHints: string[];
};

export type SafeTemplateFinding = {
  templateId: string;
  templateName: string;
  category: SafeTemplateCategory;
  severity: SafeTemplateSeverity;
  scope: SafeTemplateScope;
  status: "matched" | "not-matched" | "blocked" | "manual-review";
  confidence: SafeTemplateConfidence;
  falsePositiveRisk: "Low" | "Medium" | "High";
  evidence: string[];
  customerImpact: string;
  developerFix: string;
  canClaim: string;
  cannotClaim: string;
};

export type SafeTemplateEngineReport = {
  version: string;
  generatedAt: string;
  websiteUrl: string;
  verifiedScope: boolean;
  totalTemplates: number;
  executedTemplates: number;
  matchedTemplates: number;
  blockedTemplates: number;
  manualReviewTemplates: number;
  safeBoundary: string[];
  summary: string;
  templates: SafeTemplateDefinition[];
  findings: SafeTemplateFinding[];
  normalizedEvidence: NormalizedToolEvidence[];
};

type EvidenceSearchItem = {
  title: string;
  category: string;
  severity: SafeTemplateSeverity;
  evidence: string[];
  source: string;
};

const SAFE_TEMPLATE_BOUNDARY = [
  "No exploit payloads",
  "No brute force",
  "No login bypass",
  "No destructive testing",
  "No private data access",
  "No password guessing",
  "No high-volume crawling",
  "Only public evidence and verified passive checks",
];

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

function normalizeSeverity(value: unknown): SafeTemplateSeverity {
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

export function getSafeTemplateCatalog(): SafeTemplateDefinition[] {
  return [
    {
      id: "ssl-hsts-missing",
      name: "HSTS header missing or weak",
      category: "security-headers",
      severity: "Medium",
      scope: "public-safe",
      enabled: true,
      unsafeBlocked: false,
      description:
        "Checks whether the report evidence indicates missing Strict-Transport-Security protection.",
      customerImpact:
        "HSTS helps browsers force HTTPS and reduces downgrade risk for returning visitors.",
      developerFix:
        "Add Strict-Transport-Security with a safe max-age after confirming the site fully supports HTTPS.",
      canClaim: "Can claim HSTS was not observed in public response evidence.",
      cannotClaim:
        "Cannot claim traffic was intercepted or users were attacked.",
      matchHints: [
        "strict-transport-security",
        "hsts",
        "header not found",
        "missing hsts",
      ],
    },
    {
      id: "csp-missing",
      name: "Content Security Policy missing",
      category: "security-headers",
      severity: "Medium",
      scope: "public-safe",
      enabled: true,
      unsafeBlocked: false,
      description:
        "Checks whether Content-Security-Policy is missing from public header evidence.",
      customerImpact:
        "A good CSP can reduce browser-side attack impact such as injected scripts.",
      developerFix:
        "Add a tested Content-Security-Policy header. Start with report-only mode if needed.",
      canClaim: "Can claim CSP header was not observed in public evidence.",
      cannotClaim:
        "Cannot claim the website is vulnerable to confirmed XSS without exploit validation.",
      matchHints: [
        "content-security-policy",
        "csp",
        "header not found",
        "missing csp",
      ],
    },
    {
      id: "clickjacking-protection-missing",
      name: "Clickjacking protection missing",
      category: "security-headers",
      severity: "Medium",
      scope: "public-safe",
      enabled: true,
      unsafeBlocked: false,
      description:
        "Checks whether frame protection signals like X-Frame-Options or frame-ancestors are missing.",
      customerImpact:
        "Frame protection helps stop malicious sites from embedding sensitive pages.",
      developerFix:
        "Add X-Frame-Options or CSP frame-ancestors according to the application need.",
      canClaim:
        "Can claim frame protection header/signal was not observed in public evidence.",
      cannotClaim:
        "Cannot claim a clickjacking attack is confirmed without manual validation.",
      matchHints: [
        "x-frame-options",
        "frame-ancestors",
        "clickjacking",
        "frame protection",
      ],
    },
    {
      id: "security-txt-missing",
      name: "security.txt missing",
      category: "trust-surface",
      severity: "Low",
      scope: "public-safe",
      enabled: true,
      unsafeBlocked: false,
      description:
        "Checks whether public evidence shows missing /.well-known/security.txt.",
      customerImpact:
        "security.txt gives researchers a safe contact path for reporting issues.",
      developerFix:
        "Create /.well-known/security.txt with contact, policy, and preferred language details.",
      canClaim: "Can claim security.txt was not observed publicly.",
      cannotClaim:
        "Cannot claim the site is insecure only because security.txt is missing.",
      matchHints: ["security.txt", ".well-known/security.txt", "not found"],
    },
    {
      id: "dmarc-missing",
      name: "DMARC record missing or weak",
      category: "dns-email",
      severity: "Medium",
      scope: "public-safe",
      enabled: true,
      unsafeBlocked: false,
      description:
        "Checks whether email-domain posture evidence indicates missing/weak DMARC.",
      customerImpact:
        "DMARC helps reduce spoofing risk for business email and customer trust.",
      developerFix:
        "Add DMARC TXT record. Start with p=none for monitoring, then move to quarantine/reject when ready.",
      canClaim: "Can claim DMARC was missing or weak in public DNS evidence.",
      cannotClaim: "Cannot claim email compromise or phishing attack occurred.",
      matchHints: ["dmarc", "_dmarc", "p=none", "missing dmarc"],
    },
    {
      id: "exposed-version-signal",
      name: "Public technology version exposure",
      category: "technology-exposure",
      severity: "Low",
      scope: "public-safe",
      enabled: true,
      unsafeBlocked: false,
      description:
        "Checks whether technology/version signals are visible in report evidence.",
      customerImpact:
        "Visible technology versions can make attacker reconnaissance faster.",
      developerFix:
        "Hide unnecessary version banners where possible and keep all detected technologies updated.",
      canClaim: "Can claim public technology/version signals were observed.",
      cannotClaim:
        "Cannot claim the version is vulnerable unless CVE and version matching is validated.",
      matchHints: ["version:", "x-powered-by", "server:", "detected"],
    },
    {
      id: "public-admin-surface",
      name: "Public admin or login surface detected",
      category: "attack-surface",
      severity: "Medium",
      scope: "public-safe",
      enabled: true,
      unsafeBlocked: false,
      description:
        "Checks whether public evidence indicates admin/login/API surface exposed to the internet.",
      customerImpact:
        "Public admin and login surfaces increase attack surface and should be intentionally protected.",
      developerFix:
        "Restrict admin areas, add MFA, rate limiting, logging, and avoid exposing unnecessary admin paths.",
      canClaim: "Can claim an admin/login/API surface was observed publicly.",
      cannotClaim: "Cannot claim authentication bypass or account compromise.",
      matchHints: [
        "/admin",
        "/login",
        "/wp-admin",
        "/api",
        "admin path",
        "login path",
      ],
    },
    {
      id: "swagger-openapi-surface",
      name: "Public API documentation surface",
      category: "attack-surface",
      severity: "Medium",
      scope: "verified-passive",
      enabled: true,
      unsafeBlocked: false,
      description:
        "Checks whether API documentation surfaces like Swagger/OpenAPI were observed.",
      customerImpact:
        "Public API documentation can reveal endpoints and business logic to attackers.",
      developerFix:
        "Restrict API docs to authorized users or internal networks if not intentionally public.",
      canClaim:
        "Can claim public API documentation surface was observed if evidence confirms it.",
      cannotClaim:
        "Cannot claim API vulnerabilities exist without authorized testing.",
      matchHints: ["swagger", "openapi", "/api/docs", "swagger-ui"],
    },
    {
      id: "debug-config-surface",
      name: "Debug or config surface signal",
      category: "attack-surface",
      severity: "High",
      scope: "verified-passive",
      enabled: true,
      unsafeBlocked: false,
      description:
        "Checks whether public evidence indicates debug/config backup surface signals.",
      customerImpact:
        "Debug/config surfaces can lead to sensitive exposure if actually accessible.",
      developerFix:
        "Remove debug/config/backup files from public web root and block access at web server/CDN.",
      canClaim:
        "Can claim debug/config surface signal was observed from safe public evidence.",
      cannotClaim:
        "Cannot claim secrets were exposed unless the report explicitly captures non-sensitive proof and authorization exists.",
      matchHints: [
        "/debug",
        "/.env",
        "config.php",
        "backup.zip",
        "backup.sql",
        "phpinfo",
      ],
    },
    {
      id: "unsafe-template-blocker",
      name: "Unsafe exploit template blocker",
      category: "claim-control",
      severity: "Info",
      scope: "verified-passive",
      enabled: true,
      unsafeBlocked: true,
      description: "Blocks exploit-style templates from this safe SaaS mode.",
      customerImpact:
        "Protects customers and the SaaS from unsafe scanning behavior.",
      developerFix:
        "Keep exploit payloads, brute force checks, and destructive templates outside customer-safe automation.",
      canClaim: "Can claim unsafe exploit templates are blocked by design.",
      cannotClaim: "Cannot claim exploit testing was performed.",
      matchHints: ["exploit", "payload", "bruteforce", "rce", "sqli-payload"],
    },
  ];
}

function collectReportEvidence(
  reportInput: Record<string, unknown> | null | undefined,
) {
  const report = reportInput || {};
  const items: EvidenceSearchItem[] = [];

  asArray(report.findings).forEach((raw) => {
    const item = asRecord(raw);
    items.push({
      title: asText(item.name, asText(item.title, "Finding")),
      category: asText(item.category, "Core scanner"),
      severity: normalizeSeverity(item.severity),
      evidence: [
        ...makeEvidenceArray(item.evidence),
        ...makeEvidenceArray(item.description),
        ...makeEvidenceArray(item.recommendation),
      ],
      source: "core",
    });
  });

  const inbuilt = asRecord(report.inbuiltAdvancedAudit);
  asArray(inbuilt.evidence).forEach((raw) => {
    const item = asRecord(raw);
    items.push({
      title: asText(item.title, "Inbuilt evidence"),
      category: asText(item.module, "Inbuilt audit"),
      severity: normalizeSeverity(item.severity),
      evidence: makeEvidenceArray(item.evidence),
      source: "inbuilt",
    });
  });

  const intel = asRecord(report.vulnerabilityIntelligence);
  asArray(intel.findings).forEach((raw) => {
    const item = asRecord(raw);
    items.push({
      title: asText(item.title, "Vulnerability intelligence"),
      category: asText(item.category, "Vulnerability intelligence"),
      severity: normalizeSeverity(item.severity),
      evidence: makeEvidenceArray(item.evidence),
      source: "vulnerability-intelligence",
    });
  });

  asArray(intel.technologies).forEach((raw) => {
    const item = asRecord(raw);
    items.push({
      title: `${asText(item.name, "Technology")} detected`,
      category: asText(item.category, "Technology"),
      severity: item.version ? "Low" : "Info",
      evidence: [
        ...makeEvidenceArray(item.evidence),
        item.version ? `Version: ${String(item.version)}` : "",
      ].filter(Boolean),
      source: "technology",
    });
  });

  const calibration = asRecord(report.evidenceCalibration);
  asArray(calibration.items).forEach((raw) => {
    const item = asRecord(raw);
    items.push({
      title: asText(item.title, "Evidence calibration"),
      category: asText(item.category, "Evidence calibration"),
      severity: normalizeSeverity(item.severity),
      evidence: makeEvidenceArray(item.evidence),
      source: "evidence-calibration",
    });
  });

  return items;
}

function evidenceText(item: EvidenceSearchItem) {
  return `${item.title} ${item.category} ${item.source} ${item.evidence.join(" ")}`
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function templateMatches(
  template: SafeTemplateDefinition,
  evidence: EvidenceSearchItem[],
) {
  const hints = template.matchHints.map((hint) => hint.toLowerCase());
  const matches = evidence.filter((item) => {
    const text = evidenceText(item);

    return hints.some((hint) => text.includes(hint));
  });

  return matches.slice(0, 5);
}

function confidenceForMatches(
  matches: EvidenceSearchItem[],
): SafeTemplateConfidence {
  if (matches.length >= 2) return "High";
  if (matches.length === 1) return "Confirmed";

  return "Low";
}

function falsePositiveRiskForTemplate(
  template: SafeTemplateDefinition,
  matched: boolean,
) {
  if (!matched) return "Medium";
  if (template.scope === "public-safe") return "Low";
  if (template.category === "attack-surface") return "Medium";

  return "Medium";
}

function buildFinding(
  template: SafeTemplateDefinition,
  status: SafeTemplateFinding["status"],
  matches: EvidenceSearchItem[],
): SafeTemplateFinding {
  const evidence = matches
    .flatMap((match) => [`${match.source}: ${match.title}`, ...match.evidence])
    .slice(0, 8);

  return {
    templateId: template.id,
    templateName: template.name,
    category: template.category,
    severity: template.severity,
    scope: template.scope,
    status,
    confidence:
      status === "blocked" ? "Confirmed" : confidenceForMatches(matches),
    falsePositiveRisk:
      status === "blocked"
        ? "Low"
        : falsePositiveRiskForTemplate(template, matches.length > 0),
    evidence:
      status === "blocked"
        ? [
            "Unsafe exploit-style template blocked by SecureMSME AI safe boundary.",
          ]
        : evidence.length
          ? evidence
          : ["No matching evidence found in the current report."],
    customerImpact: template.customerImpact,
    developerFix: template.developerFix,
    canClaim: template.canClaim,
    cannotClaim: template.cannotClaim,
  };
}

function toNormalizedEvidence(
  finding: SafeTemplateFinding,
): NormalizedToolEvidence {
  return {
    sourceToolId: "safe-template-runner",
    sourceToolName: "Safe Template Runner",
    evidenceType:
      finding.status === "matched" ? "risk-signal" : "claim-control",
    title: finding.templateName,
    category: finding.category,
    severity: finding.severity,
    status: finding.status,
    confidence: finding.confidence,
    falsePositiveRisk: finding.falsePositiveRisk,
    rawEvidence: finding.evidence,
    normalizedEvidence: `${finding.templateName}: ${finding.customerImpact}`,
    claimControl: {
      canClaim: finding.canClaim,
      cannotClaim: finding.cannotClaim,
    },
  };
}

export function runSafeTemplateEngine(input: {
  websiteUrl: string;
  report?: Record<string, unknown> | null;
  verifiedScope?: boolean;
}): SafeTemplateEngineReport {
  const verifiedScope = Boolean(input.verifiedScope);
  const catalog = getSafeTemplateCatalog().filter(
    (template) => template.enabled,
  );
  const reportEvidence = collectReportEvidence(input.report);
  const findings: SafeTemplateFinding[] = [];

  for (const template of catalog) {
    if (template.unsafeBlocked) {
      findings.push(buildFinding(template, "blocked", []));
      continue;
    }

    if (template.scope === "verified-passive" && !verifiedScope) {
      findings.push(buildFinding(template, "blocked", []));
      continue;
    }

    const matches = templateMatches(template, reportEvidence);

    if (!matches.length) {
      continue;
    }

    findings.push(
      buildFinding(
        template,
        template.scope === "verified-passive" ? "manual-review" : "matched",
        matches,
      ),
    );
  }

  const blockedTemplates = findings.filter(
    (finding) => finding.status === "blocked",
  ).length;
  const matchedTemplates = findings.filter(
    (finding) => finding.status === "matched",
  ).length;
  const manualReviewTemplates = findings.filter(
    (finding) => finding.status === "manual-review",
  ).length;
  const executedTemplates = catalog.length - blockedTemplates;

  return {
    version: "26.0",
    generatedAt: new Date().toISOString(),
    websiteUrl: input.websiteUrl,
    verifiedScope,
    totalTemplates: catalog.length,
    executedTemplates,
    matchedTemplates,
    blockedTemplates,
    manualReviewTemplates,
    safeBoundary: SAFE_TEMPLATE_BOUNDARY,
    summary:
      "Safe Nuclei-style templates ran against normalized SecureMSME AI public evidence. Unsafe exploit templates are blocked by design.",
    templates: catalog,
    findings,
    normalizedEvidence: findings.map(toNormalizedEvidence),
  };
}
