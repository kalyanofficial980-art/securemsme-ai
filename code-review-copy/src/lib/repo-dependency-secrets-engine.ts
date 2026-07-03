export type Severity = "Critical" | "High" | "Medium" | "Low" | "Info";

export type DependencyItem = {
  packageName: string;
  currentVersion: string;
  dependencyScope:
    | "dependencies"
    | "devDependencies"
    | "peerDependencies"
    | "optionalDependencies"
    | "manual";
  riskLevel: Severity;
  riskReason: string;
  safeFix: string;
  confidenceLevel: "High" | "Medium" | "Low" | "Needs manual review";
};

export type DependencyAnalysis = {
  manifestType: "package-json" | "npm-list" | "manual-list" | "unknown";
  dependencyCount: number;
  riskyDependencyCount: number;
  outdatedSignalCount: number;
  dependencyRiskScore: number;
  dependencyRiskLevel: Severity;
  summary: string;
  developerAction: string;
  clientSafeSummary: string;
  items: DependencyItem[];
};

export type SecretFinding = {
  secretType: string;
  maskedValue: string;
  lineNumber: number;
  riskLevel: Severity;
  confidenceLevel: "High" | "Medium" | "Low" | "Needs manual review";
  evidenceSummary: string;
  developerAction: string;
};

export type SecretAnalysis = {
  scannedLineCount: number;
  secretSignalCount: number;
  highConfidenceSecretCount: number;
  secretRiskScore: number;
  secretRiskLevel: Severity;
  summary: string;
  developerAction: string;
  clientSafeSummary: string;
  findings: SecretFinding[];
};

export const repoSecurityBlockedClaims = [
  "Do not expose raw secrets in reports.",
  "Do not claim all secrets were found.",
  "Do not claim all vulnerabilities were found.",
  "Do not clone or scan private repos without authorization.",
  "Do not provide exploit payloads or bypass instructions.",
  "Do not treat package heuristics as confirmed CVEs without verification.",
];

const riskyPackages: Record<
  string,
  { level: Severity; reason: string; fix: string }
> = {
  lodash: {
    level: "Medium",
    reason:
      "Common dependency with historical vulnerability advisories. Version should be checked and kept current.",
    fix: "Upgrade to the latest safe version and run your package manager audit.",
  },
  "lodash.template": {
    level: "High",
    reason:
      "Template rendering packages can carry injection risk when used with untrusted input.",
    fix: "Avoid untrusted template execution and upgrade or replace where possible.",
  },
  minimist: {
    level: "Medium",
    reason: "Common CLI parser with historical prototype pollution advisories.",
    fix: "Upgrade to a maintained version and verify transitive dependency path.",
  },
  axios: {
    level: "Medium",
    reason:
      "HTTP client dependency should be kept current due to historical SSRF/header handling advisories.",
    fix: "Upgrade to latest stable version and avoid passing untrusted URLs without allowlists.",
  },
  express: {
    level: "Low",
    reason:
      "Framework dependency should be monitored and paired with secure middleware/configuration.",
    fix: "Keep Express updated and review security headers, body size limits and error handling.",
  },
  next: {
    level: "Medium",
    reason:
      "Framework security depends on staying current with patch releases.",
    fix: "Keep Next.js updated and review release notes for security patches.",
  },
  react: {
    level: "Low",
    reason:
      "Frontend framework dependency. Risk depends on app usage and version.",
    fix: "Keep React updated and avoid unsafe HTML rendering.",
  },
  jsonwebtoken: {
    level: "High",
    reason:
      "JWT handling is security-sensitive. Misconfiguration can create authentication risk.",
    fix: "Pin supported algorithms, validate issuer/audience/expiry and keep package updated.",
  },
  "node-forge": {
    level: "Medium",
    reason:
      "Cryptography-related package. Outdated versions can carry high impact risk.",
    fix: "Upgrade and avoid custom cryptographic design.",
  },
};

export function normalizeVersion(version: string) {
  return (version || "").replace(/^[~^>=<\s]+/, "").trim();
}

export function parseMajor(version: string) {
  const normalized = normalizeVersion(version);
  const match = normalized.match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

export function analyzeDependencyPackage(
  packageName: string,
  version: string,
  scope: DependencyItem["dependencyScope"],
): DependencyItem {
  const normalizedName = packageName.trim();
  const normalizedVersion = version.trim();
  const known = riskyPackages[normalizedName.toLowerCase()];
  const major = parseMajor(normalizedVersion);

  let riskLevel: Severity = known?.level || "Info";
  let riskReason =
    known?.reason ||
    "No specific package risk signal in the local rule set. Still keep it updated and audit transitive dependencies.";
  let safeFix =
    known?.fix ||
    "Run package manager audit, review changelog and keep dependency updated.";
  let confidenceLevel: DependencyItem["confidenceLevel"] = known
    ? "Medium"
    : "Low";

  if (major !== null && major === 0) {
    riskLevel = riskLevel === "Info" ? "Low" : riskLevel;
    riskReason +=
      " Version is pre-1.0, so API/security stability should be reviewed.";
  }

  if (
    normalizedVersion.includes("*") ||
    normalizedVersion.toLowerCase().includes("latest")
  ) {
    riskLevel = "High";
    riskReason +=
      " Version range is too loose and can create supply-chain unpredictability.";
    safeFix =
      "Pin a specific maintained version range and use lockfile review.";
    confidenceLevel = "High";
  }

  if (!normalizedVersion || normalizedVersion === "unknown") {
    riskLevel = riskLevel === "Info" ? "Low" : riskLevel;
    riskReason += " Version was not provided.";
  }

  return {
    packageName: normalizedName,
    currentVersion: normalizedVersion || "unknown",
    dependencyScope: scope,
    riskLevel,
    riskReason,
    safeFix,
    confidenceLevel,
  };
}

function severityScore(level: Severity) {
  return { Info: 0, Low: 10, Medium: 25, High: 45, Critical: 70 }[level];
}

function scoreToLevel(score: number): Severity {
  if (score >= 85) return "Critical";
  if (score >= 65) return "High";
  if (score >= 40) return "Medium";
  if (score >= 15) return "Low";
  return "Info";
}

export function parsePackageJson(text: string): {
  manifestType: DependencyAnalysis["manifestType"];
  items: DependencyItem[];
} {
  const raw = (text || "").trim();
  const items: DependencyItem[] = [];

  try {
    const parsed = JSON.parse(raw);
    const scopes: DependencyItem["dependencyScope"][] = [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ];

    for (const scope of scopes) {
      const deps = parsed?.[scope] || {};
      for (const [name, version] of Object.entries(deps)) {
        items.push(analyzeDependencyPackage(name, String(version), scope));
      }
    }

    return { manifestType: "package-json", items };
  } catch {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of lines) {
      const match = line.match(/^(@?[\w./-]+)[@=:\s]+([\w.*^~>=<-]+)/);
      if (match)
        items.push(analyzeDependencyPackage(match[1], match[2], "manual"));
    }
    return { manifestType: lines.length ? "manual-list" : "unknown", items };
  }
}

export function analyzeDependencies(text: string): DependencyAnalysis {
  const parsed = parsePackageJson(text);
  const risky = parsed.items.filter((item) => item.riskLevel !== "Info");
  const outdatedSignalCount = parsed.items.filter(
    (item) =>
      item.currentVersion.includes("*") ||
      item.currentVersion.toLowerCase().includes("latest"),
  ).length;
  const score = Math.min(
    100,
    risky.reduce((sum, item) => sum + severityScore(item.riskLevel), 0) +
      outdatedSignalCount * 10,
  );
  const level = scoreToLevel(score);

  return {
    manifestType: parsed.manifestType,
    dependencyCount: parsed.items.length,
    riskyDependencyCount: risky.length,
    outdatedSignalCount,
    dependencyRiskScore: score,
    dependencyRiskLevel: level,
    summary: `Dependency scan found ${parsed.items.length} package(s), ${risky.length} risk signal(s), and ${outdatedSignalCount} loose/outdated version signal(s).`,
    developerAction: risky.length
      ? "Review risky dependencies, upgrade maintained versions, run npm audit or equivalent, and retest the application."
      : "Keep lockfile reviewed, run dependency audits regularly and update packages safely.",
    clientSafeSummary: `Repository dependency review completed with ${level} dependency risk level. This is a heuristic review, not a complete vulnerability guarantee.`,
    items: parsed.items,
  };
}

export function maskSecret(value: string) {
  const clean = value || "";
  if (clean.length <= 8) return "[masked-secret]";
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

const secretRules: Array<{
  type: string;
  pattern: RegExp;
  level: Severity;
  confidence: SecretFinding["confidenceLevel"];
}> = [
  {
    type: "Generic API key",
    pattern:
      /\b(api[_-]?key|secret|token|private[_-]?key)\s*[:=]\s*["']?([A-Za-z0-9_\-]{16,})["']?/gi,
    level: "High",
    confidence: "Medium",
  },
  {
    type: "GitHub token-like value",
    pattern: /\b(ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/gi,
    level: "Critical",
    confidence: "High",
  },
  {
    type: "JWT-like token",
    pattern:
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gi,
    level: "High",
    confidence: "Medium",
  },
  {
    type: "Private key marker",
    pattern: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/gi,
    level: "Critical",
    confidence: "High",
  },
  {
    type: "AWS access key-like value",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    level: "Critical",
    confidence: "High",
  },
];

export function analyzeSecrets(text: string): SecretAnalysis {
  const raw = (text || "").slice(0, 25000);
  const lines = raw.split(/\r?\n/);
  const findings: SecretFinding[] = [];

  lines.forEach((line, index) => {
    for (const rule of secretRules) {
      rule.pattern.lastIndex = 0;
      const matches = Array.from(line.matchAll(rule.pattern));
      for (const match of matches) {
        const rawValue = match[2] || match[1] || match[0];
        findings.push({
          secretType: rule.type,
          maskedValue: maskSecret(rawValue),
          lineNumber: index + 1,
          riskLevel: rule.level,
          confidenceLevel: rule.confidence,
          evidenceSummary: `${rule.type} pattern detected on line ${index + 1}. Raw value is masked and should not be stored or shared.`,
          developerAction:
            "Rotate/revoke the credential if real, remove it from code/history, move it to a secret manager, and review access logs.",
        });
      }
    }
  });

  const highConfidence = findings.filter(
    (finding) => finding.confidenceLevel === "High",
  ).length;
  const score = Math.min(
    100,
    findings.reduce(
      (sum, finding) => sum + severityScore(finding.riskLevel),
      0,
    ),
  );
  const level = scoreToLevel(score);

  return {
    scannedLineCount: lines.length,
    secretSignalCount: findings.length,
    highConfidenceSecretCount: highConfidence,
    secretRiskScore: score,
    secretRiskLevel: level,
    summary: `Secret scan found ${findings.length} masked secret signal(s), including ${highConfidence} high-confidence signal(s).`,
    developerAction: findings.length
      ? "Treat real credentials as compromised: rotate/revoke, remove from history, move to environment variables or a secret manager, and audit usage."
      : "No secret pattern was detected in the submitted text. Continue using secret managers and avoid committing credentials.",
    clientSafeSummary: `Repository secret review completed with ${level} secret risk level. Raw secrets are not shown.`,
    findings,
  };
}

export function combineRepoRisk(
  dependency: DependencyAnalysis,
  secret: SecretAnalysis,
) {
  const score = Math.min(
    100,
    Math.round(
      dependency.dependencyRiskScore * 0.45 + secret.secretRiskScore * 0.55,
    ),
  );
  const level = scoreToLevel(score);
  return {
    latestRiskScore: score,
    latestRiskLevel: level,
    latestSummary: `Repository security review completed. Dependency risk: ${dependency.dependencyRiskLevel}. Secret risk: ${secret.secretRiskLevel}. Overall: ${level} (${score}/100).`,
  };
}
