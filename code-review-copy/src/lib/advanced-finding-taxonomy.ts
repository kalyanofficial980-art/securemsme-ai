export type FindingSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";

export type FindingAccuracyStatus =
  | "confirmed"
  | "high-confidence"
  | "potential"
  | "needs-manual-review"
  | "false-positive"
  | "accepted-risk";

export type FalsePositiveRisk = "Low" | "Medium" | "High";

export type EvidenceQuality =
  "strong" | "good" | "partial" | "weak" | "missing";

export type FindingInput = {
  bugKey?: string | null;
  title?: string | null;
  category?: string | null;
  severity?: string | null;
  confidence?: string | null;
  falsePositiveRisk?: string | null;
  evidenceType?: string | null;
  evidenceSummary?: string | null;
  observedValue?: string | null;
  expectedValue?: string | null;
  affectedUrl?: string | null;
  customerDataRisk?: string | null;
  businessImpact?: string | null;
  developerFix?: string | null;
  retestSteps?: string | null;
};

export type FindingTaxonomyRule = {
  taxonomyKey: string;
  category: string;
  subcategory: string;
  title: string;
  severity: FindingSeverity;
  riskDomain: string;
  owaspMapping?: string;
  cweMapping?: string;
  minimumEvidenceCount: number;
  requiredEvidenceTypes: string[];
  clientSafeClaimTemplate: string;
  blockedClaimTemplate: string;
  defaultFalsePositiveRisk: FalsePositiveRisk;
};

export type AccuracyAssessmentResult = {
  taxonomyKey: string;
  category: string;
  severity: FindingSeverity;
  accuracyStatus: FindingAccuracyStatus;
  confidenceScore: number;
  falsePositiveRisk: FalsePositiveRisk;
  evidenceCount: number;
  requiredEvidenceMet: boolean;
  evidenceQuality: EvidenceQuality;
  accuracyReason: string;
  clientSafeClaim: string;
  blockedClaim: string;
  needsExpertReview: boolean;
  expertReviewStatus: "queued" | "not-needed";
};

export const findingTaxonomyRules: FindingTaxonomyRule[] = [
  {
    taxonomyKey: "missing-csp",
    category: "Browser Security",
    subcategory: "Security Headers",
    title: "Content Security Policy is missing",
    severity: "High",
    riskDomain: "browser-security",
    owaspMapping: "OWASP Security Misconfiguration",
    cweMapping: "CWE-693",
    minimumEvidenceCount: 1,
    requiredEvidenceTypes: ["missing-header"],
    clientSafeClaimTemplate:
      "Content Security Policy was not observed on the reviewed response.",
    blockedClaimTemplate:
      "Do not claim XSS or exploitation from missing CSP alone.",
    defaultFalsePositiveRisk: "Low",
  },
  {
    taxonomyKey: "weak-csp",
    category: "Browser Security",
    subcategory: "Security Headers",
    title: "Content Security Policy is weak",
    severity: "Medium",
    riskDomain: "browser-security",
    owaspMapping: "OWASP Security Misconfiguration",
    cweMapping: "CWE-693",
    minimumEvidenceCount: 1,
    requiredEvidenceTypes: ["weak-header"],
    clientSafeClaimTemplate:
      "CSP exists but includes directives that need hardening.",
    blockedClaimTemplate: "Do not claim exploitation from weak CSP alone.",
    defaultFalsePositiveRisk: "Medium",
  },
  {
    taxonomyKey: "missing-hsts",
    category: "Transport Security",
    subcategory: "HTTPS Hardening",
    title: "HSTS is missing",
    severity: "Medium",
    riskDomain: "website-security",
    owaspMapping: "OWASP Security Misconfiguration",
    cweMapping: "CWE-319",
    minimumEvidenceCount: 1,
    requiredEvidenceTypes: ["missing-header"],
    clientSafeClaimTemplate: "HSTS was not observed on the HTTPS response.",
    blockedClaimTemplate: "Do not claim traffic interception occurred.",
    defaultFalsePositiveRisk: "Low",
  },
  {
    taxonomyKey: "cookie-security-flags-missing",
    category: "Authentication & Session",
    subcategory: "Cookie Security",
    title: "Cookie security flags need review",
    severity: "Medium",
    riskDomain: "authentication-session",
    owaspMapping: "OWASP Identification and Authentication Failures",
    cweMapping: "CWE-614",
    minimumEvidenceCount: 1,
    requiredEvidenceTypes: ["cookie-header-observation"],
    clientSafeClaimTemplate:
      "Cookie flags need review because common security flags were missing or unclear.",
    blockedClaimTemplate:
      "Do not claim session hijacking occurred from cookie flags alone.",
    defaultFalsePositiveRisk: "Medium",
  },
  {
    taxonomyKey: "cors-wildcard-credentials",
    category: "API Security",
    subcategory: "CORS",
    title: "Potentially unsafe CORS policy signal",
    severity: "High",
    riskDomain: "api-security",
    owaspMapping: "OWASP API Security Misconfiguration",
    cweMapping: "CWE-942",
    minimumEvidenceCount: 2,
    requiredEvidenceTypes: ["header-observation", "credential-signal"],
    clientSafeClaimTemplate:
      "A potentially unsafe CORS header combination was observed.",
    blockedClaimTemplate:
      "Do not claim account data leaked without authenticated validation.",
    defaultFalsePositiveRisk: "Medium",
  },
  {
    taxonomyKey: "public-form-data-risk-review",
    category: "Customer Data Protection",
    subcategory: "Forms",
    title: "Public form collects customer data and needs protection review",
    severity: "Medium",
    riskDomain: "customer-data-protection",
    owaspMapping: "OWASP Security Misconfiguration",
    minimumEvidenceCount: 1,
    requiredEvidenceTypes: ["html-signal"],
    clientSafeClaimTemplate:
      "A public customer-data form signal was observed and should be reviewed.",
    blockedClaimTemplate:
      "Do not claim form data is leaking unless leakage is verified with authorization.",
    defaultFalsePositiveRisk: "Low",
  },
  {
    taxonomyKey: "sensitive-public-path",
    category: "Information Exposure",
    subcategory: "Public Sensitive Path",
    title: "Potential sensitive path is publicly accessible",
    severity: "High",
    riskDomain: "infrastructure-exposure",
    owaspMapping: "OWASP Security Misconfiguration",
    cweMapping: "CWE-200",
    minimumEvidenceCount: 2,
    requiredEvidenceTypes: ["safe-path-check", "manual-content-verification"],
    clientSafeClaimTemplate:
      "A potentially sensitive path returned a public response and needs manual verification.",
    blockedClaimTemplate:
      "Do not claim secrets were viewed or stolen unless content is manually verified with authorization.",
    defaultFalsePositiveRisk: "High",
  },
];

export const accuracyStatusLabels: Record<FindingAccuracyStatus, string> = {
  confirmed: "Confirmed",
  "high-confidence": "High Confidence",
  potential: "Potential",
  "needs-manual-review": "Needs Manual Review",
  "false-positive": "False Positive",
  "accepted-risk": "Accepted Risk",
};

export const evidenceQualityLabels: Record<EvidenceQuality, string> = {
  strong: "Strong Evidence",
  good: "Good Evidence",
  partial: "Partial Evidence",
  weak: "Weak Evidence",
  missing: "Missing Evidence",
};

export function normalizeSeverity(value?: string | null): FindingSeverity {
  if (
    value === "Critical" ||
    value === "High" ||
    value === "Medium" ||
    value === "Low" ||
    value === "Info"
  ) {
    return value;
  }

  return "Medium";
}

export function normalizeFalsePositiveRisk(
  value?: string | null,
): FalsePositiveRisk {
  if (value === "Low" || value === "Medium" || value === "High") return value;
  return "Medium";
}

export function mapBugKeyToTaxonomyKey(input: FindingInput) {
  const bugKey = String(input.bugKey || "").toLowerCase();
  const title = String(input.title || "").toLowerCase();
  const combined = `${bugKey} ${title}`;

  if (
    combined.includes("missing-csp") ||
    combined.includes("content security policy is missing")
  )
    return "missing-csp";
  if (
    combined.includes("weak-csp") ||
    combined.includes("content security policy is weak")
  )
    return "weak-csp";
  if (combined.includes("missing-hsts") || combined.includes("hsts"))
    return "missing-hsts";
  if (
    combined.includes("cookie-security-flags") ||
    combined.includes("cookie security")
  )
    return "cookie-security-flags-missing";
  if (combined.includes("cors-wildcard") || combined.includes("cors"))
    return "cors-wildcard-credentials";
  if (combined.includes("public-form") || combined.includes("form collects"))
    return "public-form-data-risk-review";
  if (
    combined.includes("sensitive-public-path") ||
    combined.includes("sensitive path") ||
    combined.includes("backup") ||
    combined.includes(".env")
  ) {
    return "sensitive-public-path";
  }

  return bugKey || "manual-finding";
}

export function getTaxonomyRuleForFinding(input: FindingInput) {
  const taxonomyKey = mapBugKeyToTaxonomyKey(input);
  return (
    findingTaxonomyRules.find((rule) => rule.taxonomyKey === taxonomyKey) || {
      taxonomyKey,
      category: input.category || "Manual Review",
      subcategory: "Unclassified",
      title: input.title || "Unclassified finding",
      severity: normalizeSeverity(input.severity),
      riskDomain: "website-security",
      minimumEvidenceCount: 2,
      requiredEvidenceTypes: ["evidence-summary", "manual-review"],
      clientSafeClaimTemplate:
        "A potential security issue was observed and needs manual validation.",
      blockedClaimTemplate:
        "Do not mark this finding as confirmed until evidence requirements are met.",
      defaultFalsePositiveRisk: "High" as FalsePositiveRisk,
    }
  );
}

function inferEvidenceTypes(input: FindingInput) {
  const types = new Set<string>();

  if (input.evidenceType) types.add(input.evidenceType);
  if (input.evidenceSummary) types.add("evidence-summary");
  if (input.observedValue) types.add("observed-value");
  if (input.expectedValue) types.add("expected-value");
  if (input.affectedUrl) types.add("affected-url");

  const summary = String(input.evidenceSummary || "").toLowerCase();
  if (summary.includes("header")) types.add("header-observation");
  if (summary.includes("cookie")) types.add("cookie-header-observation");
  if (summary.includes("form") || summary.includes("input"))
    types.add("html-signal");
  if (summary.includes("http") || summary.includes("path"))
    types.add("safe-path-check");
  if (summary.includes("credentials")) types.add("credential-signal");

  return [...types];
}

export function calculateEvidenceQuality(
  input: FindingInput,
  rule: FindingTaxonomyRule,
): {
  evidenceCount: number;
  requiredEvidenceMet: boolean;
  evidenceQuality: EvidenceQuality;
  scoreBoost: number;
  missingTypes: string[];
} {
  const evidenceTypes = inferEvidenceTypes(input);
  const evidenceCount = evidenceTypes.length;
  const required = rule.requiredEvidenceTypes || [];
  const missingTypes = required.filter(
    (requiredType) => !evidenceTypes.includes(requiredType),
  );
  const requiredEvidenceMet =
    missingTypes.length === 0 && evidenceCount >= rule.minimumEvidenceCount;

  let scoreBoost = 0;
  if (input.evidenceSummary && input.evidenceSummary.length > 20)
    scoreBoost += 15;
  if (input.observedValue) scoreBoost += 10;
  if (input.expectedValue) scoreBoost += 10;
  if (input.affectedUrl) scoreBoost += 10;
  if (input.developerFix && input.developerFix.length > 20) scoreBoost += 10;
  if (input.retestSteps && input.retestSteps.length > 20) scoreBoost += 10;
  if (requiredEvidenceMet) scoreBoost += 20;

  let evidenceQuality: EvidenceQuality = "missing";
  if (requiredEvidenceMet && scoreBoost >= 60) evidenceQuality = "strong";
  else if (requiredEvidenceMet && scoreBoost >= 45) evidenceQuality = "good";
  else if (evidenceCount >= 2) evidenceQuality = "partial";
  else if (evidenceCount >= 1) evidenceQuality = "weak";

  return {
    evidenceCount,
    requiredEvidenceMet,
    evidenceQuality,
    scoreBoost,
    missingTypes,
  };
}

export function assessFindingAccuracy(
  input: FindingInput,
): AccuracyAssessmentResult {
  const rule = getTaxonomyRuleForFinding(input);
  const evidence = calculateEvidenceQuality(input, rule);

  let baseScore = 35;

  const scannerConfidence = String(input.confidence || "").toLowerCase();
  if (scannerConfidence === "confirmed") baseScore += 25;
  else if (scannerConfidence === "high") baseScore += 18;
  else if (scannerConfidence === "medium") baseScore += 10;
  else if (scannerConfidence === "low") baseScore += 2;

  const falsePositiveRisk = normalizeFalsePositiveRisk(
    input.falsePositiveRisk || rule.defaultFalsePositiveRisk,
  );
  if (falsePositiveRisk === "Low") baseScore += 10;
  if (falsePositiveRisk === "High") baseScore -= 15;

  const confidenceScore = Math.max(
    0,
    Math.min(100, baseScore + evidence.scoreBoost),
  );

  let accuracyStatus: FindingAccuracyStatus = "potential";
  if (
    confidenceScore >= 90 &&
    evidence.requiredEvidenceMet &&
    falsePositiveRisk === "Low"
  ) {
    accuracyStatus = "confirmed";
  } else if (confidenceScore >= 78 && evidence.requiredEvidenceMet) {
    accuracyStatus = "high-confidence";
  } else if (
    confidenceScore < 55 ||
    !evidence.requiredEvidenceMet ||
    falsePositiveRisk === "High"
  ) {
    accuracyStatus = "needs-manual-review";
  }

  const highImpact = input.severity === "Critical" || input.severity === "High";
  const needsExpertReview =
    accuracyStatus === "needs-manual-review" ||
    accuracyStatus === "potential" ||
    highImpact ||
    falsePositiveRisk === "High";

  const missing = evidence.missingTypes.length
    ? ` Missing evidence: ${evidence.missingTypes.join(", ")}.`
    : "";

  return {
    taxonomyKey: rule.taxonomyKey,
    category: rule.category,
    severity: normalizeSeverity(input.severity || rule.severity),
    accuracyStatus,
    confidenceScore,
    falsePositiveRisk,
    evidenceCount: evidence.evidenceCount,
    requiredEvidenceMet: evidence.requiredEvidenceMet,
    evidenceQuality: evidence.evidenceQuality,
    accuracyReason: `${accuracyStatusLabels[accuracyStatus]} based on confidence score ${confidenceScore}/100, ${evidence.evidenceQuality} evidence and ${falsePositiveRisk} false-positive risk.${missing}`,
    clientSafeClaim: rule.clientSafeClaimTemplate,
    blockedClaim: rule.blockedClaimTemplate,
    needsExpertReview,
    expertReviewStatus: needsExpertReview ? "queued" : "not-needed",
  };
}

export function calculateConfirmedAccuracyMetric(input: {
  confirmedCount: number;
  falsePositiveCount: number;
}) {
  const denominator = input.confirmedCount + input.falsePositiveCount;
  if (!denominator) return 0;
  return Math.round((input.confirmedCount / denominator) * 10000) / 100;
}

export function calculateFalsePositiveRate(input: {
  totalAssessments: number;
  falsePositiveCount: number;
}) {
  if (!input.totalAssessments) return 0;
  return (
    Math.round((input.falsePositiveCount / input.totalAssessments) * 10000) /
    100
  );
}

export const accuracyOperatingRules = [
  "Only findings with required evidence and low false-positive risk can become Confirmed.",
  "High/Critical findings should go through expert review before client-ready strong wording.",
  "Potential findings must use soft wording and should not be sold as confirmed bugs.",
  "A finding needs an affected URL, observed value or evidence summary, developer fix and retest steps before report approval.",
  "AI can assist wording and triage, but AI alone must not mark a finding Confirmed.",
  "The 99% target applies to Confirmed finding correctness, not total bug discovery coverage.",
];
