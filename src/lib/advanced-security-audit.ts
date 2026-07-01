export type AuditStatus = "pass" | "warning" | "fail" | "info";
export type AuditSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";

export type NormalizedFinding = {
  id: string;
  name: string;
  category: string;
  status: AuditStatus;
  severity: AuditSeverity;
  businessImpact: string;
  recommendation: string;
};

export type AuditControl = {
  id: string;
  title: string;
  status: AuditStatus;
  score: number;
  severity: AuditSeverity;
  mappedFindings: string[];
  evidence: string[];
  businessRisk: string;
  recommendation: string;
  testingDepth:
    "Automated passive" | "Authenticated audit needed" | "Manual review needed";
};

export type EvidenceRecord = {
  id: string;
  findingName: string;
  category: string;
  observedStatus: AuditStatus;
  severity: AuditSeverity;
  evidenceSource: string;
  riskStatement: string;
  recommendedAction: string;
  confidence: "High" | "Medium" | "Low";
};

export type AdvancedSecurityAudit = {
  version: string;
  generatedAt: string;
  maturityScore: number;
  maturityLevel: "Exposed" | "Basic" | "Improving" | "Managed" | "Advanced";
  startupGrade:
    "MSME Starter" | "MSME Growth" | "MSME Trust Ready" | "Enterprise Ready";
  safeTestingModel: string[];
  riskNarrative: string;
  executiveActions: string[];
  owaspTop10: AuditControl[];
  asvsControls: AuditControl[];
  evidenceRecords: EvidenceRecord[];
  complianceSignals: AuditControl[];
  limitations: string[];
  nextAuditDepth: string[];
};

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toStatus(value: unknown): AuditStatus {
  const text = String(value || "").toLowerCase();

  if (["pass", "passed", "ok", "success", "safe"].includes(text)) {
    return "pass";
  }

  if (
    ["fail", "failed", "error", "danger", "critical", "high"].includes(text)
  ) {
    return "fail";
  }

  if (["warn", "warning", "medium", "low"].includes(text)) {
    return "warning";
  }

  return "info";
}

function toSeverity(value: unknown, status: AuditStatus): AuditSeverity {
  const text = String(value || "").toLowerCase();

  if (text.includes("critical")) return "Critical";
  if (text.includes("high")) return "High";
  if (text.includes("medium")) return "Medium";
  if (text.includes("low")) return "Low";
  if (text.includes("info")) return "Info";

  if (status === "fail") return "High";
  if (status === "warning") return "Medium";
  if (status === "pass") return "Info";

  return "Info";
}

function normalizeFindings(
  report: Record<string, unknown>,
): NormalizedFinding[] {
  const rawFindings = Array.isArray(report.findings) ? report.findings : [];

  return rawFindings.map((rawFinding, index) => {
    const finding =
      rawFinding && typeof rawFinding === "object"
        ? (rawFinding as Record<string, unknown>)
        : {};

    const status = toStatus(finding.status);
    const severity = toSeverity(finding.severity, status);

    return {
      id: `F-${String(index + 1).padStart(3, "0")}`,
      name: toText(finding.name, toText(finding.title, "Security check")),
      category: toText(finding.category, "General Security"),
      status,
      severity,
      businessImpact: toText(
        finding.businessImpact,
        status === "pass"
          ? "This control appears healthy from the safe public audit."
          : "This issue can reduce customer trust or increase website security risk.",
      ),
      recommendation: toText(
        finding.recommendation,
        toText(
          finding.developerFix,
          "Review the affected configuration and apply the recommended security control.",
        ),
      ),
    };
  });
}

function findingMatches(finding: NormalizedFinding, patterns: string[]) {
  const haystack =
    `${finding.name} ${finding.category} ${finding.businessImpact} ${finding.recommendation}`.toLowerCase();

  return patterns.some((pattern) => haystack.includes(pattern.toLowerCase()));
}

function selectFindings(findings: NormalizedFinding[], patterns: string[]) {
  return findings.filter((finding) => findingMatches(finding, patterns));
}

function controlStatus(
  findings: NormalizedFinding[],
  noEvidenceStatus: AuditStatus,
) {
  if (!findings.length) return noEvidenceStatus;
  if (findings.some((finding) => finding.status === "fail")) return "fail";
  if (findings.some((finding) => finding.status === "warning"))
    return "warning";
  if (findings.some((finding) => finding.status === "pass")) return "pass";
  return "info";
}

function controlSeverity(status: AuditStatus): AuditSeverity {
  if (status === "fail") return "High";
  if (status === "warning") return "Medium";
  if (status === "pass") return "Info";
  return "Info";
}

function controlScore(status: AuditStatus, findings: NormalizedFinding[]) {
  const severePenalty = findings.reduce((total, finding) => {
    if (finding.severity === "Critical") return total + 25;
    if (finding.severity === "High") return total + 18;
    if (finding.severity === "Medium") return total + 10;
    if (finding.severity === "Low") return total + 5;
    return total;
  }, 0);

  if (status === "pass") return Math.max(82, 100 - severePenalty);
  if (status === "warning") return Math.max(45, 72 - severePenalty);
  if (status === "fail") return Math.max(15, 45 - severePenalty);
  return 55;
}

function makeControl(input: {
  id: string;
  title: string;
  findings: NormalizedFinding[];
  noEvidenceStatus?: AuditStatus;
  businessRisk: string;
  recommendation: string;
  testingDepth?: AuditControl["testingDepth"];
}): AuditControl {
  const status = controlStatus(
    input.findings,
    input.noEvidenceStatus || "info",
  );

  return {
    id: input.id,
    title: input.title,
    status,
    score: controlScore(status, input.findings),
    severity: controlSeverity(status),
    mappedFindings: input.findings.map((finding) => finding.id),
    evidence: input.findings.length
      ? input.findings.map((finding) => `${finding.id}: ${finding.name}`)
      : ["No direct evidence from passive public scan."],
    businessRisk: input.businessRisk,
    recommendation: input.recommendation,
    testingDepth: input.testingDepth || "Automated passive",
  };
}

function getMaturity(score: number): AdvancedSecurityAudit["maturityLevel"] {
  if (score >= 92) return "Advanced";
  if (score >= 82) return "Managed";
  if (score >= 68) return "Improving";
  if (score >= 50) return "Basic";
  return "Exposed";
}

function getStartupGrade(score: number): AdvancedSecurityAudit["startupGrade"] {
  if (score >= 85) return "Enterprise Ready";
  if (score >= 72) return "MSME Trust Ready";
  if (score >= 55) return "MSME Growth";
  return "MSME Starter";
}

function buildExecutiveActions(
  findings: NormalizedFinding[],
  controls: AuditControl[],
): string[] {
  const failedControls = controls.filter(
    (control) => control.status === "fail",
  );
  const warningControls = controls.filter(
    (control) => control.status === "warning",
  );

  const actions = [
    ...failedControls.slice(0, 3).map((control) => `Fix ${control.title}.`),
    ...warningControls
      .slice(0, 2)
      .map((control) => `Improve ${control.title}.`),
  ];

  const highFindings = findings.filter(
    (finding) => finding.severity === "Critical" || finding.severity === "High",
  );

  highFindings.slice(0, 2).forEach((finding) => {
    actions.push(`${finding.name}: ${finding.recommendation}`);
  });

  return Array.from(new Set(actions)).slice(0, 6);
}

export function buildAdvancedSecurityAudit(
  reportInput: Record<string, unknown> | null | undefined,
): AdvancedSecurityAudit {
  const report = reportInput || {};
  const findings = normalizeFindings(report);

  const httpsFindings = selectFindings(findings, [
    "https",
    "ssl",
    "tls",
    "hsts",
    "mixed content",
    "certificate",
  ]);
  const headerFindings = selectFindings(findings, [
    "header",
    "content security policy",
    "csp",
    "x-frame",
    "x-content",
    "referrer",
    "permissions",
    "server header",
    "x-powered",
  ]);
  const exposureFindings = selectFindings(findings, [
    "sensitive",
    "public files",
    "admin",
    "backup",
    "environment",
    ".env",
    "debug",
    "directory",
  ]);
  const emailFindings = selectFindings(findings, [
    "spf",
    "dmarc",
    "mx",
    "email",
  ]);
  const policyFindings = selectFindings(findings, [
    "privacy",
    "terms",
    "contact",
    "security.txt",
    "robots",
    "sitemap",
  ]);
  const cookieFindings = selectFindings(findings, [
    "cookie",
    "session",
    "secure",
    "httponly",
  ]);

  const owaspTop10 = [
    makeControl({
      id: "A01",
      title: "Broken Access Control",
      findings: exposureFindings,
      noEvidenceStatus: exposureFindings.length ? "warning" : "info",
      businessRisk:
        "Public exposure or administrative surface can increase unauthorized access risk.",
      recommendation:
        "Keep admin paths private, remove public sensitive files, and add authenticated testing before enterprise launch.",
      testingDepth: exposureFindings.length
        ? "Automated passive"
        : "Manual review needed",
    }),
    makeControl({
      id: "A02",
      title: "Cryptographic Failures",
      findings: httpsFindings,
      businessRisk:
        "Weak transport security can reduce customer trust and expose data in transit.",
      recommendation:
        "Enforce HTTPS, keep certificates valid, enable HSTS, and remove mixed content.",
    }),
    makeControl({
      id: "A03",
      title: "Injection",
      findings: [],
      noEvidenceStatus: "info",
      businessRisk:
        "Injection cannot be safely confirmed with passive public checks only.",
      recommendation:
        "Add authenticated form/API testing with written permission before claiming injection safety.",
      testingDepth: "Authenticated audit needed",
    }),
    makeControl({
      id: "A04",
      title: "Insecure Design",
      findings: policyFindings,
      businessRisk:
        "Missing public trust pages and security process signals can reduce buyer confidence.",
      recommendation:
        "Publish clear privacy, terms, contact, and responsible disclosure/security process pages.",
    }),
    makeControl({
      id: "A05",
      title: "Security Misconfiguration",
      findings: [...headerFindings, ...exposureFindings],
      businessRisk:
        "Missing hardening headers or exposed files can create avoidable security weaknesses.",
      recommendation:
        "Apply modern security headers, reduce server fingerprinting, and remove sensitive public resources.",
    }),
    makeControl({
      id: "A06",
      title: "Vulnerable and Outdated Components",
      findings: selectFindings(findings, [
        "server",
        "powered",
        "version",
        "technology",
      ]),
      noEvidenceStatus: "info",
      businessRisk:
        "Visible technology fingerprints can help attackers target known weaknesses.",
      recommendation:
        "Avoid exposing framework/server versions and keep platform dependencies updated.",
    }),
    makeControl({
      id: "A07",
      title: "Identification and Authentication Failures",
      findings: cookieFindings,
      noEvidenceStatus: "info",
      businessRisk:
        "Session and cookie weakness can affect logged-in users on customer applications.",
      recommendation:
        "Use Secure, HttpOnly, SameSite cookies and perform authenticated audit for login flows.",
      testingDepth: cookieFindings.length
        ? "Automated passive"
        : "Authenticated audit needed",
    }),
    makeControl({
      id: "A08",
      title: "Software and Data Integrity Failures",
      findings: selectFindings(findings, [
        "integrity",
        "csp",
        "script",
        "supply chain",
      ]),
      noEvidenceStatus: "info",
      businessRisk:
        "Weak content restrictions and supply-chain signals can increase script integrity risk.",
      recommendation:
        "Use CSP, dependency audits, deployment controls, and trusted build pipelines.",
      testingDepth: "Manual review needed",
    }),
    makeControl({
      id: "A09",
      title: "Security Logging and Monitoring Failures",
      findings: selectFindings(findings, [
        "security.txt",
        "contact",
        "monitoring",
      ]),
      noEvidenceStatus: "info",
      businessRisk:
        "Without a clear security contact and monitoring, incidents may take longer to discover.",
      recommendation:
        "Publish security contact details, monitor critical changes, and define incident response steps.",
      testingDepth: "Manual review needed",
    }),
    makeControl({
      id: "A10",
      title: "Server-Side Request Forgery",
      findings: [],
      noEvidenceStatus: "info",
      businessRisk:
        "SSRF cannot be confirmed or cleared by passive public checks.",
      recommendation:
        "Perform authenticated application testing only with written permission.",
      testingDepth: "Authenticated audit needed",
    }),
  ];

  const asvsControls = [
    makeControl({
      id: "ASVS-V1",
      title: "Architecture and threat model signals",
      findings: [...policyFindings, ...headerFindings],
      businessRisk:
        "Weak public security posture can show missing security-by-design practices.",
      recommendation:
        "Add documented security ownership, public policy pages, and secure default configuration.",
      testingDepth: "Manual review needed",
    }),
    makeControl({
      id: "ASVS-V2",
      title: "Authentication verification",
      findings: [],
      noEvidenceStatus: "info",
      businessRisk:
        "Authentication controls require login-aware testing and cannot be verified passively.",
      recommendation:
        "Add authenticated test mode later for owned customer apps only.",
      testingDepth: "Authenticated audit needed",
    }),
    makeControl({
      id: "ASVS-V3",
      title: "Session management verification",
      findings: cookieFindings,
      noEvidenceStatus: "info",
      businessRisk:
        "Cookie/session hardening affects logged-in customer and admin areas.",
      recommendation:
        "Review Secure, HttpOnly, SameSite, session timeout, and logout behavior.",
      testingDepth: cookieFindings.length
        ? "Automated passive"
        : "Authenticated audit needed",
    }),
    makeControl({
      id: "ASVS-V9",
      title: "Communications security verification",
      findings: httpsFindings,
      businessRisk:
        "Transport security is a basic trust requirement for MSME customer data.",
      recommendation:
        "Maintain HTTPS, HSTS, and valid TLS certificate lifecycle monitoring.",
    }),
    makeControl({
      id: "ASVS-V14",
      title: "Configuration verification",
      findings: [...headerFindings, ...exposureFindings],
      businessRisk:
        "Misconfiguration is one of the most common preventable security issues.",
      recommendation:
        "Harden headers, reduce exposed metadata, and remove sensitive public files.",
    }),
  ];

  const complianceSignals = [
    makeControl({
      id: "TRUST-01",
      title: "Privacy and terms readiness",
      findings: selectFindings(findings, ["privacy", "terms"]),
      noEvidenceStatus: "warning",
      businessRisk:
        "Missing legal/trust pages can reduce customer confidence during vendor review.",
      recommendation:
        "Publish clear privacy policy, terms, refund policy, and responsible disclosure page.",
    }),
    makeControl({
      id: "TRUST-02",
      title: "Email domain trust",
      findings: emailFindings,
      noEvidenceStatus: "warning",
      businessRisk:
        "Weak SPF/DMARC/MX posture can increase phishing and spoofing risk.",
      recommendation:
        "Configure SPF, DMARC, MX, and move toward stronger DMARC policy over time.",
    }),
    makeControl({
      id: "TRUST-03",
      title: "Public security contact",
      findings: selectFindings(findings, ["security.txt", "contact"]),
      noEvidenceStatus: "warning",
      businessRisk:
        "Security researchers and customers need a trusted reporting path.",
      recommendation:
        "Add security.txt or a responsible disclosure page with a monitored contact inbox.",
    }),
  ];

  const allControls = [...owaspTop10, ...asvsControls, ...complianceSignals];
  const baseScore =
    typeof report.score === "number"
      ? report.score
      : typeof report.rawScore === "number" &&
          typeof report.maxScore === "number"
        ? Math.round((report.rawScore / report.maxScore) * 100)
        : 50;

  const failedControls = allControls.filter(
    (control) => control.status === "fail",
  ).length;
  const warningControls = allControls.filter(
    (control) => control.status === "warning",
  ).length;
  const unverifiedControls = allControls.filter(
    (control) => control.status === "info",
  ).length;

  const maturityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        baseScore -
          failedControls * 3 -
          warningControls * 1.5 -
          unverifiedControls * 0.5,
      ),
    ),
  );

  const evidenceRecords = findings.map((finding) => ({
    id: `E-${finding.id.replace("F-", "")}`,
    findingName: finding.name,
    category: finding.category,
    observedStatus: finding.status,
    severity: finding.severity,
    evidenceSource: "Automated passive website audit",
    riskStatement: finding.businessImpact,
    recommendedAction: finding.recommendation,
    confidence: finding.status === "info" ? "Low" : "High",
  })) satisfies EvidenceRecord[];

  const executiveActions = buildExecutiveActions(findings, allControls);

  return {
    version: "19.0",
    generatedAt: new Date().toISOString(),
    maturityScore,
    maturityLevel: getMaturity(maturityScore),
    startupGrade: getStartupGrade(maturityScore),
    safeTestingModel: [
      "Passive public website checks only",
      "No exploitation",
      "No brute force",
      "No login bypass",
      "No destructive or intrusive testing",
      "Authenticated testing only after written authorization",
    ],
    riskNarrative:
      maturityScore >= 80
        ? "The website shows a strong public security posture for an MSME, but authenticated and manual validation is still required for enterprise-grade assurance."
        : maturityScore >= 60
          ? "The website has a usable baseline, but several public security and trust controls should be improved before using the report as a serious customer trust signal."
          : "The website has important security posture gaps visible from safe public checks. Fix priority issues before using it for customer acquisition or vendor trust.",
    executiveActions: executiveActions.length
      ? executiveActions
      : ["Maintain current controls and schedule periodic monitoring."],
    owaspTop10,
    asvsControls,
    evidenceRecords,
    complianceSignals,
    limitations: [
      "This is not a full penetration test.",
      "This is not a compliance certificate.",
      "Injection, business logic, access control, and authenticated flows require written authorization and deeper testing.",
      "Findings are based on safe public signals and should be verified by the website owner before public claims.",
    ],
    nextAuditDepth: [
      "Add authenticated customer-owned test mode later.",
      "Add passive ZAP baseline connector later.",
      "Add screenshot evidence and change history.",
      "Add email alerts for risk regression.",
      "Add asset inventory and subdomain monitoring after deployment.",
    ],
  };
}
