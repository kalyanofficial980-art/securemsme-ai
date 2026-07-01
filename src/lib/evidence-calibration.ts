export type EvidenceConfidence = "Confirmed" | "High" | "Medium" | "Low";
export type EvidenceStatus =
  "confirmed" | "probable" | "manual-review" | "informational";
export type FalsePositiveRisk = "Low" | "Medium" | "High";
export type EvidenceSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";

export type CalibratedEvidenceItem = {
  id: string;
  source:
    | "Native scanner"
    | "Inbuilt audit"
    | "Vulnerability intelligence"
    | "OWASP/ASVS mapping";
  title: string;
  category: string;
  severity: EvidenceSeverity;
  status: EvidenceStatus;
  confidence: EvidenceConfidence;
  falsePositiveRisk: FalsePositiveRisk;
  evidence: string[];
  whyThisIsReal: string;
  whatCanBeClaimed: string;
  whatCannotBeClaimed: string;
  customerImpact: string;
  developerFix: string;
  manualValidationNeeded: boolean;
};

export type EvidenceCalibrationReport = {
  version: string;
  generatedAt: string;
  reportQualityScore: number;
  trustLevel: "Weak" | "Basic" | "Good" | "Strong" | "Audit-ready";
  confirmedCount: number;
  probableCount: number;
  manualReviewCount: number;
  informationalCount: number;
  falsePositiveGuardSummary: string;
  safeCustomerClaim: string;
  blockedClaims: string[];
  calibrationRules: string[];
  items: CalibratedEvidenceItem[];
  priorityValidation: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeSeverity(value: unknown): EvidenceSeverity {
  const text = String(value || "").toLowerCase();

  if (text.includes("critical")) return "Critical";
  if (text.includes("high")) return "High";
  if (text.includes("medium")) return "Medium";
  if (text.includes("low")) return "Low";
  return "Info";
}

function severityWeight(severity: EvidenceSeverity) {
  if (severity === "Critical") return 5;
  if (severity === "High") return 4;
  if (severity === "Medium") return 3;
  if (severity === "Low") return 2;
  return 1;
}

function evidenceLooksConcrete(evidence: string[]) {
  const joined = evidence.join(" ").toLowerCase();

  return (
    joined.includes("http ") ||
    joined.includes("header") ||
    joined.includes("status") ||
    joined.includes("returned") ||
    joined.includes("found") ||
    joined.includes("not found") ||
    joined.includes("dns") ||
    joined.includes("txt") ||
    joined.includes("server:") ||
    joined.includes("x-powered-by") ||
    joined.includes("content-security-policy") ||
    joined.includes("strict-transport-security") ||
    joined.includes("https://") ||
    joined.includes("http://")
  );
}

function confidenceFromEvidence(input: {
  rawConfidence?: unknown;
  rawStatus?: unknown;
  evidence: string[];
  source: CalibratedEvidenceItem["source"];
}): EvidenceConfidence {
  const rawConfidence = String(input.rawConfidence || "").toLowerCase();
  const rawStatus = String(input.rawStatus || "").toLowerCase();

  if (rawConfidence.includes("confirmed") || rawStatus.includes("confirmed")) {
    return "Confirmed";
  }

  if (evidenceLooksConcrete(input.evidence)) return "High";
  if (rawConfidence.includes("high")) return "High";
  if (rawConfidence.includes("low")) return "Low";

  return "Medium";
}

function statusFromConfidence(input: {
  confidence: EvidenceConfidence;
  title: string;
  category: string;
  source: CalibratedEvidenceItem["source"];
  severity: EvidenceSeverity;
}): EvidenceStatus {
  const text = `${input.title} ${input.category}`.toLowerCase();

  if (input.confidence === "Confirmed" || input.confidence === "High") {
    return "confirmed";
  }

  if (
    text.includes("injection") ||
    text.includes("ssrf") ||
    text.includes("business logic") ||
    text.includes("authentication") ||
    text.includes("authorization") ||
    text.includes("access control")
  ) {
    return "manual-review";
  }

  if (input.source === "OWASP/ASVS mapping" && input.severity !== "Info") {
    return "probable";
  }

  if (input.confidence === "Medium") return "probable";
  return "informational";
}

function falsePositiveRiskFromStatus(input: {
  status: EvidenceStatus;
  confidence: EvidenceConfidence;
  source: CalibratedEvidenceItem["source"];
  title: string;
}): FalsePositiveRisk {
  const title = input.title.toLowerCase();

  if (input.status === "manual-review") return "High";
  if (input.confidence === "Confirmed" || input.confidence === "High")
    return "Low";

  if (
    title.includes("technology") ||
    title.includes("script") ||
    title.includes("supply") ||
    title.includes("api") ||
    title.includes("admin")
  ) {
    return "Medium";
  }

  if (input.source === "OWASP/ASVS mapping") return "Medium";
  return "High";
}

function makeEvidenceArray(...values: unknown[]) {
  const items = values.flatMap((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return [value];
    return [];
  });

  return items
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 8);
}

function buildClaimText(input: { title: string; status: EvidenceStatus }) {
  if (input.status === "confirmed") {
    return `You can claim this public signal was observed: ${input.title}.`;
  }

  if (input.status === "probable") {
    return `You can claim this is a likely risk signal that should be reviewed: ${input.title}.`;
  }

  if (input.status === "manual-review") {
    return `You can claim this needs manual or authenticated validation: ${input.title}.`;
  }

  return `You can claim this is informational evidence from a safe public audit: ${input.title}.`;
}

function buildCannotClaim(input: { status: EvidenceStatus }) {
  if (input.status === "confirmed") {
    return "Do not claim exploitation, breach, or full compromise. This is confirmed public evidence, not exploit proof.";
  }

  if (input.status === "probable") {
    return "Do not claim the vulnerability is confirmed. It is a likely risk signal until manually validated.";
  }

  if (input.status === "manual-review") {
    return "Do not claim pass/fail security status. This area needs authorized manual or authenticated testing.";
  }

  return "Do not use this as a security failure claim. Treat it as context or inventory.";
}

function addItem(
  items: CalibratedEvidenceItem[],
  input: Omit<
    CalibratedEvidenceItem,
    | "id"
    | "status"
    | "confidence"
    | "falsePositiveRisk"
    | "whyThisIsReal"
    | "whatCanBeClaimed"
    | "whatCannotBeClaimed"
    | "manualValidationNeeded"
  > & {
    rawConfidence?: unknown;
    rawStatus?: unknown;
  },
) {
  const confidence = confidenceFromEvidence({
    rawConfidence: input.rawConfidence,
    rawStatus: input.rawStatus,
    evidence: input.evidence,
    source: input.source,
  });

  const status = statusFromConfidence({
    confidence,
    title: input.title,
    category: input.category,
    source: input.source,
    severity: input.severity,
  });

  const falsePositiveRisk = falsePositiveRiskFromStatus({
    status,
    confidence,
    source: input.source,
    title: input.title,
  });

  items.push({
    id: `EC-${String(items.length + 1).padStart(3, "0")}`,
    source: input.source,
    title: input.title,
    category: input.category,
    severity: input.severity,
    status,
    confidence,
    falsePositiveRisk,
    evidence: input.evidence.length
      ? input.evidence
      : ["No direct evidence saved."],
    whyThisIsReal: input.evidence.length
      ? `This is based on public evidence collected by ${input.source}.`
      : `This is derived from ${input.source} and needs careful wording.`,
    whatCanBeClaimed: buildClaimText({
      title: input.title,
      status,
    }),
    whatCannotBeClaimed: buildCannotClaim({
      status,
    }),
    customerImpact: input.customerImpact,
    developerFix: input.developerFix,
    manualValidationNeeded:
      status === "manual-review" || falsePositiveRisk === "High",
  });
}

function collectNativeFindings(
  report: Record<string, unknown>,
  items: CalibratedEvidenceItem[],
) {
  asArray(report.findings).forEach((raw) => {
    const finding = asRecord(raw);
    const title = asText(
      finding.name,
      asText(finding.title, "Security finding"),
    );

    addItem(items, {
      source: "Native scanner",
      title,
      category: asText(finding.category, "Native scanner"),
      severity: normalizeSeverity(finding.severity),
      evidence: makeEvidenceArray(
        finding.description,
        finding.evidence,
        finding.observedValue,
        finding.url,
        finding.statusCode ? `HTTP status ${String(finding.statusCode)}` : "",
      ),
      customerImpact: asText(
        finding.businessImpact,
        "This finding may affect public security posture or customer trust.",
      ),
      developerFix: asText(
        finding.developerFix,
        asText(
          finding.recommendation,
          "Review this finding and apply the recommended hardening control.",
        ),
      ),
      rawStatus: finding.status,
      rawConfidence: finding.confidence,
    });
  });
}

function collectInbuiltAudit(
  report: Record<string, unknown>,
  items: CalibratedEvidenceItem[],
) {
  const inbuilt = asRecord(report.inbuiltAdvancedAudit);

  asArray(inbuilt.evidence).forEach((raw) => {
    const item = asRecord(raw);

    addItem(items, {
      source: "Inbuilt audit",
      title: asText(item.title, "Inbuilt audit evidence"),
      category: asText(item.module, "Inbuilt audit"),
      severity: normalizeSeverity(item.severity),
      evidence: makeEvidenceArray(item.evidence, item.url),
      customerImpact: asText(
        item.customerImpact,
        "This evidence affects website trust, security posture, or customer confidence.",
      ),
      developerFix: asText(
        item.fix,
        "Review and fix this in the website configuration or application code.",
      ),
      rawStatus: item.status,
      rawConfidence: item.confidence,
    });
  });
}

function collectVulnerabilityIntelligence(
  report: Record<string, unknown>,
  items: CalibratedEvidenceItem[],
) {
  const intel = asRecord(report.vulnerabilityIntelligence);

  asArray(intel.findings).forEach((raw) => {
    const finding = asRecord(raw);

    addItem(items, {
      source: "Vulnerability intelligence",
      title: asText(finding.title, "Vulnerability intelligence finding"),
      category: asText(finding.category, "Vulnerability intelligence"),
      severity: normalizeSeverity(finding.severity),
      evidence: makeEvidenceArray(finding.evidence),
      customerImpact: asText(
        finding.customerImpact,
        "This public signal can affect website risk or customer trust.",
      ),
      developerFix: asText(
        finding.recommendedFix,
        "Validate this finding and apply the recommended security fix.",
      ),
      rawStatus: finding.status,
      rawConfidence: finding.confidence,
    });
  });

  asArray(intel.technologies).forEach((raw) => {
    const tech = asRecord(raw);
    const name = asText(tech.name, "Technology detected");

    addItem(items, {
      source: "Vulnerability intelligence",
      title: `${name} detected`,
      category: asText(tech.category, "Technology Detection"),
      severity: tech.version ? "Low" : "Info",
      evidence: makeEvidenceArray(
        tech.evidence,
        tech.version ? `Version: ${String(tech.version)}` : "",
      ),
      customerImpact: tech.version
        ? "Visible technology version can help attackers map known risks faster."
        : "Technology inventory helps the business understand public attack surface.",
      developerFix: tech.version
        ? "Hide version signals where possible and keep this technology updated."
        : "Maintain asset inventory and monitor technology changes.",
      rawStatus: "confirmed-evidence",
      rawConfidence: tech.confidence,
    });
  });
}

function collectAdvancedAudit(
  report: Record<string, unknown>,
  items: CalibratedEvidenceItem[],
) {
  const advanced = asRecord(report.advancedAudit);
  const controls = [
    ...asArray(advanced.owaspTop10),
    ...asArray(advanced.asvsControls),
    ...asArray(advanced.complianceSignals),
  ];

  controls.forEach((raw) => {
    const control = asRecord(raw);
    const status = asText(control.status, "info");

    if (status === "pass") return;

    addItem(items, {
      source: "OWASP/ASVS mapping",
      title: asText(control.title, "Security control"),
      category: asText(control.id, "Control mapping"),
      severity: normalizeSeverity(control.severity),
      evidence: makeEvidenceArray(control.evidence),
      customerImpact: asText(
        control.businessRisk,
        "This control may affect customer trust or security assurance.",
      ),
      developerFix: asText(
        control.recommendation,
        "Review the mapped control and apply recommended fix.",
      ),
      rawStatus: status,
      rawConfidence: "Medium",
    });
  });
}

function dedupeItems(items: CalibratedEvidenceItem[]) {
  const seen = new Set<string>();
  const output: CalibratedEvidenceItem[] = [];

  items.forEach((item) => {
    const key = `${item.source}-${item.title}-${item.category}`
      .toLowerCase()
      .replace(/\s+/g, " ");

    if (seen.has(key)) return;

    seen.add(key);
    output.push({
      ...item,
      id: `EC-${String(output.length + 1).padStart(3, "0")}`,
    });
  });

  return output;
}

function qualityScore(items: CalibratedEvidenceItem[]) {
  if (!items.length) return 30;

  const confirmed = items.filter((item) => item.status === "confirmed").length;
  const lowFalsePositive = items.filter(
    (item) => item.falsePositiveRisk === "Low",
  ).length;
  const highFalsePositive = items.filter(
    (item) => item.falsePositiveRisk === "High",
  ).length;
  const manualReview = items.filter(
    (item) => item.manualValidationNeeded,
  ).length;

  const evidenceRatio = confirmed / items.length;
  const lowFpRatio = lowFalsePositive / items.length;
  const penalty = Math.min(35, highFalsePositive * 4 + manualReview * 2);

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(45 + evidenceRatio * 35 + lowFpRatio * 20 - penalty),
    ),
  );
}

function trustLevel(score: number): EvidenceCalibrationReport["trustLevel"] {
  if (score >= 90) return "Audit-ready";
  if (score >= 78) return "Strong";
  if (score >= 64) return "Good";
  if (score >= 45) return "Basic";
  return "Weak";
}

export function buildEvidenceCalibrationReport(
  reportInput: Record<string, unknown> | null | undefined,
): EvidenceCalibrationReport {
  const report = reportInput || {};
  const collected: CalibratedEvidenceItem[] = [];

  collectNativeFindings(report, collected);
  collectInbuiltAudit(report, collected);
  collectVulnerabilityIntelligence(report, collected);
  collectAdvancedAudit(report, collected);

  const items = dedupeItems(collected).sort((a, b) => {
    const severityDiff =
      severityWeight(b.severity) - severityWeight(a.severity);
    if (severityDiff !== 0) return severityDiff;

    const statusRank: Record<EvidenceStatus, number> = {
      confirmed: 4,
      probable: 3,
      "manual-review": 2,
      informational: 1,
    };

    return statusRank[b.status] - statusRank[a.status];
  });

  const reportQualityScore = qualityScore(items);
  const confirmedCount = items.filter(
    (item) => item.status === "confirmed",
  ).length;
  const probableCount = items.filter(
    (item) => item.status === "probable",
  ).length;
  const manualReviewCount = items.filter(
    (item) => item.status === "manual-review",
  ).length;
  const informationalCount = items.filter(
    (item) => item.status === "informational",
  ).length;

  const priorityValidation = items
    .filter(
      (item) => item.manualValidationNeeded || item.falsePositiveRisk !== "Low",
    )
    .slice(0, 8)
    .map(
      (item) => `${item.title}: validate before making strong customer claims.`,
    );

  return {
    version: "23.0",
    generatedAt: new Date().toISOString(),
    reportQualityScore,
    trustLevel: trustLevel(reportQualityScore),
    confirmedCount,
    probableCount,
    manualReviewCount,
    informationalCount,
    falsePositiveGuardSummary:
      manualReviewCount > 0
        ? "Some findings need manual validation before strong claims. The report separates confirmed evidence from likely risk."
        : "Most findings are based on concrete public evidence, but this is still not exploit proof or a full penetration test.",
    safeCustomerClaim:
      "This report is a safe public evidence-based security posture and vulnerability intelligence report.",
    blockedClaims: [
      "Do not claim the website is fully secure.",
      "Do not claim no vulnerabilities exist.",
      "Do not claim penetration testing was completed.",
      "Do not claim OWASP certification.",
      "Do not claim exploit confirmation unless a future authorized module verifies it.",
      "Do not claim compliance certification.",
    ],
    calibrationRules: [
      "Concrete headers, DNS records, HTTP status codes, URLs, and visible technologies can be marked confirmed.",
      "Technology detection is real evidence, but it is not proof of exploitability.",
      "OWASP/ASVS mapping is risk interpretation, not certification.",
      "Authentication, authorization, injection, SSRF, and business logic require manual or authenticated validation.",
      "High false-positive findings must be worded as likely risk or manual review.",
      "Every finding must include what can and cannot be claimed.",
    ],
    items,
    priorityValidation: priorityValidation.length
      ? priorityValidation
      : [
          "No high false-positive findings detected. Continue normal monitoring.",
        ],
  };
}
