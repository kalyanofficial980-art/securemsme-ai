export type TruthSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";
export type TruthConfidence = "High" | "Medium" | "Low";
export type EvidenceStatus =
  "confirmed" | "probable" | "needs-review" | "informational";

export type ScanForTruthCleanup = {
  id: string;
  website_id?: string | null;
  website_url: string;
  score?: number | null;
  risk_level?: string | null;
  report?: unknown;
  created_at?: string | null;
};

export type TruthFixItem = {
  issueKey: string;
  category: string;
  title: string;
  severity: TruthSeverity;
  confidence: TruthConfidence;
  evidenceStatus: EvidenceStatus;
  originalText: string;
  evidenceSummary: string;
  whyItMatters: string;
  exactDeveloperFix: string;
  validationSteps: string;
  safeCustomerWording: string;
  cannotClaim: string;
  sourceModule: string;
  standards: Record<string, string[]>;
  rawMetadata: Record<string, unknown>;
};

export type TruthWarning = {
  title: string;
  severity: "High" | "Medium" | "Low";
  message: string;
  fix: string;
};

export type ReportTruthCleanupResult = {
  engineVersion: string;
  generatedAt: string;
  websiteUrl: string;
  sourceScanId: string;
  truthScore: number;
  fakeRiskLevel: "low" | "medium" | "high";
  genericTextCount: number;
  repeatedFixCount: number;
  missingEvidenceCount: number;
  cleanedFixCount: number;
  manualReviewCount: number;
  reviewSummary: {
    customerSummary: string;
    developerSummary: string;
    oldReportProblem: string;
    newReportRule: string;
    trustPositioning: string;
  };
  cleanedReport: {
    headline: string;
    scoreWording: string;
    latestBaselineWording: string;
    cleanedFixes: TruthFixItem[];
  };
  truthWarnings: TruthWarning[];
  customerSafeClaims: string[];
  blockedClaims: string[];
};

type UnknownRecord = Record<string, unknown>;

type RawIssue = {
  title: string;
  category: string;
  severity: TruthSeverity;
  originalText: string;
  sourceModule: string;
  raw: UnknownRecord;
};

const GENERIC_TEXT_PATTERNS = [
  "review this issue",
  "apply the recommended hardening control",
  "visitors may see trust warnings",
  "can affect business trust",
  "may reduce reliability",
  "recommended security control",
  "security posture",
  "hardening control",
];

const GENERIC_TITLES = [
  "https / ssl",
  "security headers",
  "server technology exposure",
  "mx records",
  "spf record",
  "dmarc record",
  "robots.txt",
  "sitemap.xml",
];

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

function normalizeSeverity(value: unknown): TruthSeverity {
  const raw = asString(value).toLowerCase();

  if (raw.includes("critical")) return "Critical";
  if (raw.includes("high")) return "High";
  if (raw.includes("medium")) return "Medium";
  if (raw.includes("low")) return "Low";
  return "Info";
}

function slug(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/https?/g, "http")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "unknown-issue"
  );
}

function textOfIssue(record: UnknownRecord) {
  return [
    record.title,
    record.name,
    record.label,
    record.description,
    record.businessImpact,
    record.impact,
    record.fix,
    record.recommendation,
    record.evidence,
  ]
    .map((value) => asString(value))
    .filter(Boolean)
    .join(" ");
}

function collectRawIssues(scan: ScanForTruthCleanup) {
  const report = asRecord(scan.report);
  const buckets = [
    ...asArray(report.topFixes).map((item) => ({
      item,
      module: "base-top-fixes",
    })),
    ...asArray(report.findings).map((item) => ({
      item,
      module: "base-findings",
    })),
    ...asArray(report.issues).map((item) => ({ item, module: "base-issues" })),
    ...asArray(report.vulnerabilities).map((item) => ({
      item,
      module: "base-vulnerabilities",
    })),
    ...asArray(asRecord(report.evidenceCalibration).items).map((item) => ({
      item,
      module: "evidence-calibration",
    })),
    ...asArray(asRecord(report.vulnerabilityIntelligence).findings).map(
      (item) => ({ item, module: "vulnerability-intelligence" }),
    ),
    ...asArray(asRecord(report.inbuiltAdvancedAudit).findings).map((item) => ({
      item,
      module: "inbuilt-advanced-audit",
    })),
    ...asArray(asRecord(report.advancedAudit).findings).map((item) => ({
      item,
      module: "advanced-audit",
    })),
  ];

  const issues: RawIssue[] = [];

  for (const bucket of buckets) {
    const record = asRecord(bucket.item);
    const title = asString(
      record.title || record.name || record.label,
      "Unknown issue",
    );
    const category = asString(
      record.category || record.group || record.area,
      "General Security",
    );
    const originalText = textOfIssue(record);

    issues.push({
      title,
      category,
      severity: normalizeSeverity(
        record.severity || record.risk || record.priority || record.level,
      ),
      originalText,
      sourceModule: bucket.module,
      raw: record,
    });
  }

  if (!issues.length) {
    const knownFallback = [
      "Security headers",
      "HTTPS / SSL",
      "HTTP to HTTPS redirect",
      "MX records",
      "SPF record",
      "DMARC record",
      "robots.txt",
      "sitemap.xml",
    ];

    for (const title of knownFallback) {
      issues.push({
        title,
        category: title.includes("record")
          ? "Email security"
          : "Website security",
        severity:
          title === "Security headers" || title === "DMARC record"
            ? "High"
            : "Info",
        originalText: "",
        sourceModule: "fallback-truth-cleanup",
        raw: {},
      });
    }
  }

  return dedupeRawIssues(issues);
}

function dedupeRawIssues(issues: RawIssue[]) {
  const seen = new Set<string>();
  const output: RawIssue[] = [];

  for (const issue of issues) {
    const key = `${slug(issue.category)}:${slug(issue.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(issue);
  }

  return output;
}

function containsGenericText(text: string) {
  const lower = text.toLowerCase();

  return GENERIC_TEXT_PATTERNS.some((pattern) => lower.includes(pattern));
}

function hasEvidence(record: UnknownRecord, originalText: string) {
  const evidenceFields = [
    record.evidence,
    record.evidenceSummary,
    record.observedValue,
    record.observed_value,
    record.proof,
    record.url,
    record.path,
    record.statusCode,
    record.status_code,
  ];

  if (
    evidenceFields.some(
      (value) => typeof value === "string" && value.trim().length > 4,
    )
  )
    return true;
  if (evidenceFields.some((value) => typeof value === "number")) return true;

  return /observed|missing|present|status|header|record|dns|ssl|tls|http|https/i.test(
    originalText,
  );
}

function baseStandards(category: string, title: string) {
  const lower = `${category} ${title}`.toLowerCase();

  if (
    lower.includes("email") ||
    lower.includes("spf") ||
    lower.includes("dmarc") ||
    lower.includes("mx")
  ) {
    return {
      owaspWstg: ["WSTG-CONF-06"],
      owaspAsvs: ["V14.4"],
      owaspApiTop10: [],
      nistSsdf: ["PW.8", "RV.1"],
    };
  }

  if (
    lower.includes("header") ||
    lower.includes("csp") ||
    lower.includes("hsts") ||
    lower.includes("clickjack")
  ) {
    return {
      owaspWstg: ["WSTG-CONF-07", "WSTG-CLNT-09"],
      owaspAsvs: ["V14.4", "V14.5"],
      owaspApiTop10: [],
      nistSsdf: ["PW.8", "RV.1"],
    };
  }

  if (lower.includes("api") || lower.includes("graphql")) {
    return {
      owaspWstg: ["WSTG-INFO-10"],
      owaspAsvs: ["V13.1", "V13.2"],
      owaspApiTop10: ["API1", "API2", "API5", "API8"],
      nistSsdf: ["RV.1", "RV.2"],
    };
  }

  return {
    owaspWstg: ["WSTG-CONF-07"],
    owaspAsvs: ["V14.4"],
    owaspApiTop10: [],
    nistSsdf: ["PW.8", "RV.1"],
  };
}

function exactFixTemplate(
  issue: RawIssue,
  websiteUrl: string,
): Omit<
  TruthFixItem,
  | "issueKey"
  | "category"
  | "title"
  | "severity"
  | "sourceModule"
  | "rawMetadata"
  | "originalText"
  | "standards"
> {
  const lower =
    `${issue.category} ${issue.title} ${issue.originalText}`.toLowerCase();

  if (lower.includes("content-security-policy") || lower.includes("csp")) {
    return {
      confidence: "High",
      evidenceStatus: "confirmed",
      evidenceSummary:
        "The scan observed a missing or weak Content-Security-Policy signal on the checked response.",
      whyItMatters:
        "CSP reduces browser-side impact from XSS, script injection and untrusted third-party content.",
      exactDeveloperFix:
        "Add a restrictive Content-Security-Policy header. Start with report-only mode, then enforce. Minimum baseline: default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; script-src 'self' trusted-cdn.example.",
      validationSteps:
        "Open browser DevTools or run curl -I and confirm Content-Security-Policy is present without unsafe-inline/unsafe-eval unless justified.",
      safeCustomerWording:
        "CSP protection is missing or needs hardening on the checked page.",
      cannotClaim: "Do not claim XSS is exploitable from CSP evidence alone.",
    };
  }

  if (
    lower.includes("security headers") ||
    lower.includes("x-frame") ||
    lower.includes("clickjack")
  ) {
    return {
      confidence: "High",
      evidenceStatus: "confirmed",
      evidenceSummary:
        "The scan observed missing or weak browser security headers on the checked response.",
      whyItMatters:
        "Security headers reduce browser-side risks such as clickjacking, content sniffing, unsafe referrer leakage and script injection impact.",
      exactDeveloperFix:
        "Add these headers at web server/app edge: Content-Security-Policy, X-Frame-Options or CSP frame-ancestors, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy with least privilege.",
      validationSteps:
        "Run curl -I https://your-domain and confirm each header exists with expected values.",
      safeCustomerWording:
        "Important browser security headers are missing or need hardening.",
      cannotClaim:
        "Do not claim confirmed browser exploitation without validation.",
    };
  }

  if (lower.includes("hsts") || lower.includes("strict-transport-security")) {
    return {
      confidence: "High",
      evidenceStatus: "confirmed",
      evidenceSummary:
        "The scan did not observe a strong Strict-Transport-Security header on HTTPS response.",
      whyItMatters:
        "HSTS helps force browsers to use HTTPS on future visits and reduces downgrade risk.",
      exactDeveloperFix:
        "After confirming all subdomains support HTTPS, add Strict-Transport-Security: max-age=31536000; includeSubDomains. Add preload only after careful validation.",
      validationSteps:
        "Run curl -I and confirm Strict-Transport-Security appears on HTTPS responses.",
      safeCustomerWording: "HTTPS is not fully hardened with HSTS.",
      cannotClaim:
        "Do not claim active downgrade attack from missing HSTS alone.",
    };
  }

  if (
    lower.includes("https") ||
    lower.includes("ssl") ||
    lower.includes("tls")
  ) {
    return {
      confidence: "Medium",
      evidenceStatus: "probable",
      evidenceSummary:
        "The scan reviewed HTTPS/SSL/TLS posture for the target URL.",
      whyItMatters:
        "HTTPS protects visitors from interception and improves trust for login, forms and payment-related pages.",
      exactDeveloperFix:
        "Install a valid certificate, force HTTPS redirect, remove HTTP-only access, and keep TLS configuration updated. Use a trusted certificate authority and renew before expiry.",
      validationSteps:
        "Open https URL, run SSL Labs or server TLS test, and confirm certificate chain, expiry and redirect behavior.",
      safeCustomerWording:
        "HTTPS/SSL needs review or hardening based on current scan evidence.",
      cannotClaim:
        "Do not claim payment safety or full transport security without full TLS validation.",
    };
  }

  if (lower.includes("http to https") || lower.includes("redirect")) {
    return {
      confidence: "High",
      evidenceStatus: "confirmed",
      evidenceSummary:
        "The scan observed HTTP-to-HTTPS redirect behavior needs review.",
      whyItMatters:
        "Without reliable redirect, users may reach insecure HTTP pages or submit data before encryption.",
      exactDeveloperFix:
        "Configure server/CDN to redirect all http:// requests to https:// with 301/308. Ensure canonical HTTPS URL is used in sitemap and internal links.",
      validationSteps:
        "Run curl -I http://domain and confirm Location points to https://domain with 301 or 308.",
      safeCustomerWording:
        "HTTP-to-HTTPS redirect should be enforced consistently.",
      cannotClaim:
        "Do not claim credential leakage without observing sensitive submission over HTTP.",
    };
  }

  if (
    lower.includes("server technology") ||
    lower.includes("server header") ||
    lower.includes("x-powered-by")
  ) {
    return {
      confidence: "High",
      evidenceStatus: "confirmed",
      evidenceSummary:
        "The scan observed server/framework technology exposure signals in headers or public responses.",
      whyItMatters:
        "Technology exposure can help attackers fingerprint stack and prioritize known weaknesses.",
      exactDeveloperFix:
        "Remove or reduce Server and X-Powered-By headers. Disable framework version banners. Keep server/framework patched.",
      validationSteps:
        "Run curl -I and confirm Server/X-Powered-By do not reveal unnecessary product/version details.",
      safeCustomerWording: "Server technology exposure should be reduced.",
      cannotClaim:
        "Do not claim a CVE applies unless exact affected version is validated.",
    };
  }

  if (lower.includes("dmarc")) {
    return {
      confidence: "High",
      evidenceStatus: "confirmed",
      evidenceSummary:
        "The scan reviewed DMARC DNS record posture for the domain.",
      whyItMatters:
        "Weak or missing DMARC allows attackers to spoof your domain more easily in phishing emails.",
      exactDeveloperFix:
        "Add DMARC TXT at _dmarc.domain. Start with v=DMARC1; p=none; rua=mailto:security@domain, monitor reports, then move to quarantine/reject.",
      validationSteps:
        "Run dig TXT _dmarc.domain and confirm DMARC policy is present and aligned with SPF/DKIM.",
      safeCustomerWording: "DMARC email protection is missing or weak.",
      cannotClaim:
        "Do not claim active phishing is happening from missing DMARC alone.",
    };
  }

  if (lower.includes("spf")) {
    return {
      confidence: "High",
      evidenceStatus: "confirmed",
      evidenceSummary:
        "The scan reviewed SPF DNS record posture for the domain.",
      whyItMatters:
        "SPF helps receiving mail servers verify which systems may send email for your domain.",
      exactDeveloperFix:
        "Add a single SPF TXT record such as v=spf1 include:your-mail-provider -all. Avoid multiple SPF records and keep includes minimal.",
      validationSteps:
        "Run dig TXT domain and confirm exactly one SPF record exists and includes only authorized senders.",
      safeCustomerWording:
        "SPF email sender protection needs setup or hardening.",
      cannotClaim:
        "Do not claim SPF alone stops all spoofing; DMARC and DKIM are also needed.",
    };
  }

  if (lower.includes("mx record") || lower.includes("mx records")) {
    return {
      confidence: "Medium",
      evidenceStatus: "probable",
      evidenceSummary:
        "The scan reviewed MX records for receiving business email.",
      whyItMatters:
        "Missing or incorrect MX records can affect email reliability and customer communication.",
      exactDeveloperFix:
        "Configure MX records according to your mail provider. Confirm priority values and remove unused legacy mail servers.",
      validationSteps:
        "Run dig MX domain and send/receive a test email from an external account.",
      safeCustomerWording: "Business email DNS records need review.",
      cannotClaim: "Do not claim email compromise from MX configuration alone.",
    };
  }

  if (lower.includes("robots")) {
    return {
      confidence: "Medium",
      evidenceStatus: "informational",
      evidenceSummary:
        "The scan checked robots.txt availability and basic signal.",
      whyItMatters:
        "robots.txt guides crawlers but is not a security control. Sensitive URLs should not rely on robots.txt for protection.",
      exactDeveloperFix:
        "Use robots.txt for crawler guidance only. Remove sensitive paths if they reveal private structure, and protect sensitive pages with authentication.",
      validationSteps:
        "Open /robots.txt and confirm it does not reveal sensitive admin, backup or private paths.",
      safeCustomerWording:
        "robots.txt is informational and should not expose sensitive structure.",
      cannotClaim:
        "Do not claim a vulnerability only because robots.txt exists or is missing.",
    };
  }

  if (lower.includes("sitemap")) {
    return {
      confidence: "Medium",
      evidenceStatus: "informational",
      evidenceSummary:
        "The scan checked sitemap.xml availability and basic signal.",
      whyItMatters:
        "sitemap.xml helps indexing but may expose URLs that should not be public.",
      exactDeveloperFix:
        "Keep sitemap limited to public pages. Remove staging, admin, private account, checkout or test URLs.",
      validationSteps:
        "Open /sitemap.xml and review all URLs for unintended sensitive routes.",
      safeCustomerWording:
        "sitemap.xml should be limited to intended public pages.",
      cannotClaim:
        "Do not claim a vulnerability only because sitemap.xml exists or is missing.",
    };
  }

  if (lower.includes("security.txt")) {
    return {
      confidence: "Medium",
      evidenceStatus: "informational",
      evidenceSummary:
        "The scan checked /.well-known/security.txt availability.",
      whyItMatters:
        "security.txt gives researchers a clear contact path for responsible disclosure.",
      exactDeveloperFix:
        "Add /.well-known/security.txt with Contact, Expires, Preferred-Languages and Policy fields.",
      validationSteps:
        "Open https://domain/.well-known/security.txt and confirm it is reachable and current.",
      safeCustomerWording:
        "Responsible disclosure contact file is missing or needs setup.",
      cannotClaim: "Do not claim this is a vulnerability by itself.",
    };
  }

  if (lower.includes("cookie") || lower.includes("session")) {
    return {
      confidence: "High",
      evidenceStatus: "confirmed",
      evidenceSummary:
        "The scan reviewed Set-Cookie security attributes where visible.",
      whyItMatters:
        "Secure, HttpOnly and SameSite flags reduce session exposure risk.",
      exactDeveloperFix:
        "Set Secure, HttpOnly and SameSite=Lax or Strict on session cookies. Use SameSite=None only with Secure when cross-site is required.",
      validationSteps:
        "Inspect response Set-Cookie headers and confirm required attributes on auth/session cookies.",
      safeCustomerWording: "Session cookie flags need review or hardening.",
      cannotClaim: "Do not claim session hijacking without exploit evidence.",
    };
  }

  if (lower.includes("cors")) {
    return {
      confidence: "High",
      evidenceStatus: "confirmed",
      evidenceSummary:
        "The scan reviewed CORS response headers for risky patterns.",
      whyItMatters:
        "Weak CORS can expose browser-based API data if combined with sensitive authenticated endpoints.",
      exactDeveloperFix:
        "Avoid wildcard CORS on sensitive endpoints. Use exact origin allowlist. Never combine wildcard origins with credentials.",
      validationSteps:
        "Test response headers for Access-Control-Allow-Origin and Access-Control-Allow-Credentials on API endpoints.",
      safeCustomerWording:
        "CORS policy needs review for sensitive routes or APIs.",
      cannotClaim:
        "Do not claim data theft without endpoint-specific validation.",
    };
  }

  if (lower.includes("graphql")) {
    return {
      confidence: "Medium",
      evidenceStatus: "needs-review",
      evidenceSummary: "The scan observed GraphQL surface or metadata signals.",
      whyItMatters:
        "GraphQL APIs require strong resolver authorization, introspection policy and mutation controls.",
      exactDeveloperFix:
        "Review GraphQL endpoint authentication, disable public IDEs in production, restrict introspection if not needed, and enforce object-level authorization in resolvers.",
      validationSteps:
        "Run approved GraphQL review with test accounts. Confirm no sensitive schema/data exposure and no unauthorized resolver access.",
      safeCustomerWording:
        "GraphQL surface needs authorization and exposure review.",
      cannotClaim:
        "Do not claim introspection dump or broken authorization without safe proof.",
    };
  }

  if (lower.includes("admin") || lower.includes("login")) {
    return {
      confidence: "Medium",
      evidenceStatus: "needs-review",
      evidenceSummary: "The scan observed public admin/login route signals.",
      whyItMatters:
        "Public admin/login routes are normal for many apps but need strong authentication, rate limits and monitoring.",
      exactDeveloperFix:
        "Protect admin routes with MFA, rate limiting, account lockout/abuse detection, strong session controls and server-side authorization.",
      validationSteps:
        "Confirm admin endpoints require authentication and low-privilege users cannot access privileged content.",
      safeCustomerWording:
        "Admin/login surface should be reviewed for access-control and abuse protection.",
      cannotClaim:
        "Do not claim admin bypass or brute-force weakness without safe validation.",
    };
  }

  return {
    confidence: hasEvidence(issue.raw, issue.originalText) ? "Medium" : "Low",
    evidenceStatus: hasEvidence(issue.raw, issue.originalText)
      ? "probable"
      : "needs-review",
    evidenceSummary:
      "The scan reported this issue, but the old report text may not include enough specific evidence.",
    whyItMatters:
      "This item may affect security posture, customer trust, reliability or developer hardening priorities.",
    exactDeveloperFix:
      "Review the exact affected URL/header/DNS record/configuration, confirm the issue manually, then apply the specific hardening control for this category.",
    validationSteps:
      "Retest the affected page or DNS record after fixing and confirm the same issue no longer appears.",
    safeCustomerWording:
      "This issue needs review based on current scan signals.",
    cannotClaim:
      "Do not claim exploitability or confirmed vulnerability until evidence is specific and validated.",
  };
}

function buildTruthFix(issue: RawIssue, websiteUrl: string): TruthFixItem {
  const template = exactFixTemplate(issue, websiteUrl);
  const exactTitle = issue.title.trim() || "Security issue needs review";

  return {
    issueKey: `${slug(issue.category)}-${slug(exactTitle)}`,
    category: issue.category,
    title: exactTitle,
    severity: issue.severity,
    originalText: issue.originalText,
    sourceModule: issue.sourceModule,
    standards: baseStandards(issue.category, issue.title),
    rawMetadata: {
      originalIssue: issue.raw,
      originalWasGeneric: containsGenericText(issue.originalText),
      hadEvidence: hasEvidence(issue.raw, issue.originalText),
    },
    ...template,
  };
}

function repeatedFixCount(items: TruthFixItem[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = item.exactDeveloperFix.toLowerCase().slice(0, 100);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.values()]
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + count - 1, 0);
}

function calculateTruthScore(input: {
  genericTextCount: number;
  repeatedFixCountValue: number;
  missingEvidenceCount: number;
  cleanedFixCount: number;
}) {
  let score = 100;
  score -= input.genericTextCount * 8;
  score -= input.repeatedFixCountValue * 6;
  score -= input.missingEvidenceCount * 10;

  if (input.cleanedFixCount >= 5) score += 8;

  return Math.max(0, Math.min(100, score));
}

function fakeRiskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 80) return "low";
  if (score >= 55) return "medium";
  return "high";
}

function buildWarnings(input: {
  genericTextCount: number;
  repeatedFixCountValue: number;
  missingEvidenceCount: number;
  oldIssueCount: number;
}) {
  const warnings: TruthWarning[] = [];

  if (input.genericTextCount > 0) {
    warnings.push({
      title: "Generic report wording detected",
      severity: input.genericTextCount >= 5 ? "High" : "Medium",
      message: `${input.genericTextCount} old issue descriptions/fixes look generic or template-based.`,
      fix: "Use the cleaned evidence-specific fix items before sharing with customers.",
    });
  }

  if (input.repeatedFixCountValue > 0) {
    warnings.push({
      title: "Repeated fix text detected",
      severity: "Medium",
      message: `${input.repeatedFixCountValue} cleaned or old fix items appear repeated.`,
      fix: "Ensure each issue has a specific developer action and validation step.",
    });
  }

  if (input.missingEvidenceCount > 0) {
    warnings.push({
      title: "Missing specific evidence",
      severity: "High",
      message: `${input.missingEvidenceCount} issues need manual evidence review before strong customer claims.`,
      fix: "Mark as needs-review and run advanced modules or manual verification.",
    });
  }

  if (input.oldIssueCount === 0) {
    warnings.push({
      title: "No base issues found",
      severity: "Low",
      message: "The base scan report did not include detailed issue objects.",
      fix: "Run fresh scan and advanced modules to generate richer evidence.",
    });
  }

  return warnings;
}

export function buildReportTruthCleanup(
  scan: ScanForTruthCleanup,
): ReportTruthCleanupResult {
  const rawIssues = collectRawIssues(scan);
  const cleanedFixes = rawIssues.map((issue) =>
    buildTruthFix(issue, scan.website_url),
  );
  const genericTextCount = rawIssues.filter((issue) =>
    containsGenericText(issue.originalText),
  ).length;
  const repeatedFixCountValue = repeatedFixCount(cleanedFixes);
  const missingEvidenceCount = cleanedFixes.filter(
    (item) => item.evidenceStatus === "needs-review",
  ).length;
  const manualReviewCount = cleanedFixes.filter(
    (item) =>
      item.confidence === "Low" || item.evidenceStatus === "needs-review",
  ).length;
  const truthScore = calculateTruthScore({
    genericTextCount,
    repeatedFixCountValue,
    missingEvidenceCount,
    cleanedFixCount: cleanedFixes.length,
  });
  const risk = fakeRiskLevel(truthScore);
  const score = asNumber(scan.score, 0);
  const riskLevel = asString(scan.risk_level, "Unknown risk");

  return {
    engineVersion: "44.0",
    generatedAt: new Date().toISOString(),
    websiteUrl: scan.website_url,
    sourceScanId: scan.id,
    truthScore,
    fakeRiskLevel: risk,
    genericTextCount,
    repeatedFixCount: repeatedFixCountValue,
    missingEvidenceCount,
    cleanedFixCount: cleanedFixes.length,
    manualReviewCount,
    reviewSummary: {
      customerSummary:
        risk === "low"
          ? "This report has stronger customer-safe wording after cleanup. Use cleaned fix items for sharing."
          : risk === "medium"
            ? "This report is improved but still has some generic or evidence-limited items. Review warnings before sharing."
            : "This report has high fake-looking risk. Do not share old wording directly; use cleaned items and manual review.",
      developerSummary:
        "The engine replaced generic report language with evidence-specific fix guidance, validation steps, safe claims and blocked claims.",
      oldReportProblem:
        "Old development reports used generic business impact and fix text. That can look fake even when the scan signal is real.",
      newReportRule:
        "Every customer-facing issue must include evidence summary, why it matters, exact developer fix, validation step, confidence and cannot-claim language.",
      trustPositioning:
        "This is an evidence-based security posture report, not a full pentest, not a guarantee of zero vulnerabilities and not a compliance certificate.",
    },
    cleanedReport: {
      headline: `Evidence-specific security fixes for ${scan.website_url}`,
      scoreWording: `Current scan score is ${score}/100 with risk label "${riskLevel}". This score belongs to this exact scan snapshot.`,
      latestBaselineWording:
        "Use the latest fresh scan as the current baseline. Treat older development scans as historical snapshots.",
      cleanedFixes,
    },
    truthWarnings: buildWarnings({
      genericTextCount,
      repeatedFixCountValue,
      missingEvidenceCount,
      oldIssueCount: rawIssues.length,
    }),
    customerSafeClaims: [
      "This report is based on observed scan evidence and safe signals.",
      "Each cleaned fix item includes specific developer action and validation guidance where possible.",
      "Items marked needs-review require confirmation before strong claims.",
      "Latest fresh scan should be used as current baseline.",
    ],
    blockedClaims: [
      "Do not claim the website is 100% secure.",
      "Do not claim every vulnerability was found.",
      "Do not claim confirmed exploitation unless safe validation proves it.",
      "Do not claim compliance certification from this report alone.",
      "Do not share old generic development reports as final customer reports.",
    ],
  };
}

export function isGenericTitle(title: string) {
  const lower = title.toLowerCase();
  return GENERIC_TITLES.some((generic) => lower.includes(generic));
}
