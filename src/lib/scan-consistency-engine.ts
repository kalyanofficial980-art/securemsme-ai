export type RiskLevel =
  "Low risk" | "Medium risk" | "High risk" | "Critical risk" | "Unknown";

export type ScanRecordForConsistency = {
  id: string;
  website_id?: string | null;
  website_url: string;
  score?: number | null;
  risk_level?: string | null;
  report?: unknown;
  created_at?: string | null;
};

export type ScoreExplanationItem = {
  label: string;
  value: string | number;
  impact: "positive" | "negative" | "neutral";
  explanation: string;
};

export type ScanConsistencyReport = {
  engineVersion: string;
  generatedAt: string;
  websiteUrl: string;
  currentScanId: string;
  previousScanId: string | null;
  currentScore: number;
  previousScore: number | null;
  scoreDelta: number | null;
  currentRisk: RiskLevel;
  previousRisk: RiskLevel | null;
  riskTransition:
    "improved" | "worsened" | "same" | "no-previous-scan" | "unknown";
  confidenceLevel: "High" | "Medium" | "Low";
  latestScanBadge: {
    label: string;
    isLatestKnownScan: boolean;
    scanDate?: string | null;
  };
  scoreExplanation: {
    simpleReason: string;
    whatThisScoreMeans: string;
    whyItMayDifferFromOldScans: string[];
    canClaim: string[];
    cannotClaim: string[];
  };
  scoreBreakdown: {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowInfoCount: number;
    categoryScores: Array<{
      category: string;
      score: number;
      grade: string;
      impact: "positive" | "negative" | "neutral";
    }>;
    explanationItems: ScoreExplanationItem[];
  };
  deltaAnalysis: {
    scoreDirection: "up" | "down" | "same" | "none";
    scoreDeltaText: string;
    likelyReasons: string[];
    previousScanDate?: string | null;
    currentScanDate?: string | null;
  };
  consistencyWarnings: Array<{
    title: string;
    severity: "High" | "Medium" | "Low";
    message: string;
    fix: string;
  }>;
  customerSummary: string;
};

type ReportRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ReportRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asRecord(value: unknown): ReportRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeScore(score: unknown) {
  const number = asNumber(score, 0);
  return Math.max(0, Math.min(100, Math.round(number)));
}

export function normalizeRisk(
  value: unknown,
  score?: number | null,
): RiskLevel {
  const raw = asString(value).toLowerCase();

  if (raw.includes("critical")) return "Critical risk";
  if (raw.includes("high")) return "High risk";
  if (raw.includes("medium")) return "Medium risk";
  if (raw.includes("low")) return "Low risk";

  const normalizedScore = typeof score === "number" ? score : null;
  if (normalizedScore === null) return "Unknown";
  if (normalizedScore < 30) return "Critical risk";
  if (normalizedScore < 50) return "High risk";
  if (normalizedScore < 80) return "Medium risk";
  return "Low risk";
}

function gradeFromScore(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 45) return "D";
  return "F";
}

function riskRank(risk: RiskLevel) {
  if (risk === "Critical risk") return 4;
  if (risk === "High risk") return 3;
  if (risk === "Medium risk") return 2;
  if (risk === "Low risk") return 1;
  return 0;
}

function countSeverityFromItems(items: unknown[]) {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    lowInfo: 0,
  };

  for (const item of items) {
    const record = asRecord(item);
    const severity = asString(
      record.severity || record.risk || record.level || record.priority,
    ).toLowerCase();

    if (severity.includes("critical")) counts.critical += 1;
    else if (severity.includes("high")) counts.high += 1;
    else if (severity.includes("medium")) counts.medium += 1;
    else counts.lowInfo += 1;
  }

  return counts;
}

function extractFindings(report: ReportRecord) {
  const direct = [
    ...asArray(report.findings),
    ...asArray(report.topFixes),
    ...asArray(report.issues),
    ...asArray(report.vulnerabilities),
  ];

  const advanced = asRecord(report.advancedAudit);
  const intelligence = asRecord(report.vulnerabilityIntelligence);
  const inbuilt = asRecord(report.inbuiltAdvancedAudit);
  const evidence = asRecord(report.evidenceCalibration);

  return [
    ...direct,
    ...asArray(advanced.findings),
    ...asArray(intelligence.findings),
    ...asArray(inbuilt.findings),
    ...asArray(evidence.items),
  ];
}

function extractCategoryScores(report: ReportRecord) {
  const raw =
    report.categoryScores ||
    report.categories ||
    report.scoreBreakdown ||
    report.category_scores ||
    {};

  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const record = asRecord(item);
      const score = normalizeScore(
        record.score || record.value || record.points,
      );

      return {
        category: asString(
          record.category || record.name || record.label,
          "Unknown",
        ),
        score,
        grade: asString(record.grade, `Grade ${gradeFromScore(score)}`),
        impact:
          score >= 80
            ? ("positive" as const)
            : score < 50
              ? ("negative" as const)
              : ("neutral" as const),
      };
    });
  }

  const record = asRecord(raw);

  return Object.entries(record).map(([key, value]) => {
    const valueRecord = asRecord(value);
    const score = normalizeScore(
      typeof value === "number"
        ? value
        : valueRecord.score || valueRecord.value || valueRecord.points,
    );

    return {
      category: key.replace(/[_-]/g, " "),
      score,
      grade: asString(valueRecord.grade, `Grade ${gradeFromScore(score)}`),
      impact:
        score >= 80
          ? ("positive" as const)
          : score < 50
            ? ("negative" as const)
            : ("neutral" as const),
    };
  });
}

function extractScannerVersion(report: ReportRecord) {
  return asString(
    report.engineVersion ||
      report.scannerVersion ||
      report.version ||
      report.scanEngineVersion ||
      "unknown",
    "unknown",
  );
}

function buildExplanationItems(input: {
  score: number;
  risk: RiskLevel;
  findingsCount: number;
  critical: number;
  high: number;
  medium: number;
  categoryScores: ScanConsistencyReport["scoreBreakdown"]["categoryScores"];
  report: ReportRecord;
}) {
  const items: ScoreExplanationItem[] = [
    {
      label: "Overall score",
      value: input.score,
      impact:
        input.score >= 80
          ? "positive"
          : input.score < 50
            ? "negative"
            : "neutral",
      explanation:
        input.score >= 80
          ? "The scan currently shows comparatively stronger security posture."
          : input.score < 50
            ? "The scan currently shows serious security gaps or missing controls."
            : "The scan currently shows moderate security posture with important fixes still needed.",
    },
    {
      label: "Risk level",
      value: input.risk,
      impact:
        riskRank(input.risk) >= 3
          ? "negative"
          : input.risk === "Low risk"
            ? "positive"
            : "neutral",
      explanation:
        "Risk level is derived from score, severity distribution and important missing controls.",
    },
    {
      label: "Findings counted",
      value: input.findingsCount,
      impact:
        input.findingsCount > 10
          ? "negative"
          : input.findingsCount === 0
            ? "positive"
            : "neutral",
      explanation:
        "More findings usually reduce confidence and increase fix priority.",
    },
  ];

  if (input.high || input.critical) {
    items.push({
      label: "High/Critical findings",
      value: input.high + input.critical,
      impact: "negative",
      explanation:
        "High or critical findings have stronger impact on risk and customer trust.",
    });
  }

  const weakCategories = input.categoryScores.filter(
    (category) => category.score < 50,
  );
  if (weakCategories.length) {
    items.push({
      label: "Weak categories",
      value: weakCategories.map((category) => category.category).join(", "),
      impact: "negative",
      explanation:
        "Low category scores explain why the overall grade is not higher.",
    });
  }

  const ssl = asString(
    input.report.sslStatus ||
      input.report.httpsStatus ||
      input.report.https_ssl,
  );
  if (ssl) {
    items.push({
      label: "HTTPS/SSL signal",
      value: ssl,
      impact:
        ssl.toLowerCase().includes("valid") || ssl.toLowerCase().includes("ok")
          ? "positive"
          : "negative",
      explanation: "HTTPS/SSL status affects trust and safe transport scoring.",
    });
  }

  return items;
}

function buildWarnings(input: {
  current: ScanRecordForConsistency;
  previous?: ScanRecordForConsistency | null;
  report: ReportRecord;
  scoreDelta: number | null;
  scannerVersion: string;
}) {
  const warnings: ScanConsistencyReport["consistencyWarnings"] = [];

  if (!input.previous) {
    warnings.push({
      title: "No previous scan found",
      severity: "Low",
      message:
        "This is treated as the first known scan for this website, so score change cannot be explained yet.",
      fix: "Run future scans from the same saved website record to build history.",
    });
  }

  if (
    input.previous &&
    input.scoreDelta !== null &&
    Math.abs(input.scoreDelta) >= 20
  ) {
    warnings.push({
      title: "Large score change",
      severity: "Medium",
      message: `Score changed by ${input.scoreDelta} points compared with the previous scan.`,
      fix: "Review the score explanation, scan date, engine version and changed findings before sharing the report.",
    });
  }

  if (
    input.previous &&
    extractScannerVersion(asRecord(input.previous.report)) !==
      input.scannerVersion
  ) {
    warnings.push({
      title: "Different engine version or report format",
      severity: "Medium",
      message:
        "Old and new scans may have used different scanner/report logic.",
      fix: "Show engine version and explain that newer scans may include more modules or corrected scoring.",
    });
  }

  const report = input.report;
  if (!asArray(report.findings).length && !asArray(report.topFixes).length) {
    warnings.push({
      title: "Limited finding detail",
      severity: "Low",
      message:
        "This scan has limited detailed finding data in the base report object.",
      fix: "Run advanced modules such as browser, API, GraphQL and authenticated checks for richer evidence.",
    });
  }

  return warnings;
}

export function buildScanConsistencyReport(input: {
  current: ScanRecordForConsistency;
  previous?: ScanRecordForConsistency | null;
  isLatestKnownScan?: boolean;
}): ScanConsistencyReport {
  const currentReport = asRecord(input.current.report);
  const previousReport = asRecord(input.previous?.report);
  const currentScore = normalizeScore(input.current.score);
  const previousScore = input.previous
    ? normalizeScore(input.previous.score)
    : null;
  const scoreDelta =
    previousScore === null ? null : currentScore - previousScore;
  const currentRisk = normalizeRisk(input.current.risk_level, currentScore);
  const previousRisk = input.previous
    ? normalizeRisk(input.previous.risk_level, previousScore)
    : null;
  const currentRank = riskRank(currentRisk);
  const previousRank = previousRisk ? riskRank(previousRisk) : null;
  const scannerVersion = extractScannerVersion(currentReport);

  let riskTransition: ScanConsistencyReport["riskTransition"] =
    "no-previous-scan";
  if (previousRank !== null) {
    if (currentRank < previousRank || (scoreDelta !== null && scoreDelta > 5))
      riskTransition = "improved";
    else if (
      currentRank > previousRank ||
      (scoreDelta !== null && scoreDelta < -5)
    )
      riskTransition = "worsened";
    else riskTransition = "same";
  }

  const findings = extractFindings(currentReport);
  const counts = countSeverityFromItems(findings);
  const categoryScores = extractCategoryScores(currentReport);
  const explanationItems = buildExplanationItems({
    score: currentScore,
    risk: currentRisk,
    findingsCount: findings.length,
    critical: counts.critical,
    high: counts.high,
    medium: counts.medium,
    categoryScores,
    report: currentReport,
  });

  const confidenceLevel: "High" | "Medium" | "Low" =
    findings.length >= 8 && categoryScores.length >= 3
      ? "High"
      : findings.length >= 3 || categoryScores.length >= 2
        ? "Medium"
        : "Low";

  const likelyReasons: string[] = [];

  if (!input.previous) {
    likelyReasons.push("No previous scan exists for direct comparison.");
  } else if (scoreDelta !== null && scoreDelta > 10) {
    likelyReasons.push(
      "Some findings may have been fixed, disappeared, or were scored differently by newer modules.",
    );
    likelyReasons.push(
      "The latest scan may have observed stronger HTTPS/security header/email/trust signals.",
    );
  } else if (scoreDelta !== null && scoreDelta < -10) {
    likelyReasons.push(
      "New findings may have appeared or newer modules may have detected more risk signals.",
    );
    likelyReasons.push(
      "Website response, DNS/email configuration, SSL or security headers may have changed.",
    );
  } else {
    likelyReasons.push(
      "The latest scan is broadly consistent with the previous scan.",
    );
  }

  likelyReasons.push(
    "Development scans can differ when scoring logic changes during new Mega Parts.",
  );
  likelyReasons.push(
    "Use latest scan as primary, and use previous scans as history, not as final truth.",
  );

  const warnings = buildWarnings({
    current: input.current,
    previous: input.previous,
    report: currentReport,
    scoreDelta,
    scannerVersion,
  });

  const scoreDirection: ScanConsistencyReport["deltaAnalysis"]["scoreDirection"] =
    scoreDelta === null
      ? "none"
      : scoreDelta > 0
        ? "up"
        : scoreDelta < 0
          ? "down"
          : "same";

  const scoreDeltaText =
    scoreDelta === null
      ? "No previous scan available."
      : scoreDelta > 0
        ? `Score increased by ${scoreDelta} points.`
        : scoreDelta < 0
          ? `Score decreased by ${Math.abs(scoreDelta)} points.`
          : "Score did not change.";

  const simpleReason =
    currentScore >= 80
      ? "This score is high because the latest scan found fewer serious issues or stronger security signals."
      : currentScore >= 50
        ? "This score is moderate because the scan found important issues, but not enough critical evidence to mark the report as worst-case."
        : "This score is low because the scan found serious or multiple important missing security controls.";

  return {
    engineVersion: "43.0",
    generatedAt: new Date().toISOString(),
    websiteUrl: input.current.website_url,
    currentScanId: input.current.id,
    previousScanId: input.previous?.id || null,
    currentScore,
    previousScore,
    scoreDelta,
    currentRisk,
    previousRisk,
    riskTransition,
    confidenceLevel,
    latestScanBadge: {
      label: input.isLatestKnownScan ? "Latest known scan" : "Historical scan",
      isLatestKnownScan: Boolean(input.isLatestKnownScan),
      scanDate: input.current.created_at || null,
    },
    scoreExplanation: {
      simpleReason,
      whatThisScoreMeans:
        "The score is a security posture score based on observed evidence, missing controls, severity distribution and category scores. It is not a guarantee that all vulnerabilities are found.",
      whyItMayDifferFromOldScans: likelyReasons,
      canClaim: [
        "Can claim this is the score for this specific scan record.",
        "Can claim score was calculated from observed evidence and report signals.",
        "Can claim previous scans are history and latest scan is the current baseline.",
      ],
      cannotClaim: [
        "Cannot claim the website is vulnerability-free.",
        "Cannot claim old and new scores must always match.",
        "Cannot claim full pentest or compliance certification from this score alone.",
      ],
    },
    scoreBreakdown: {
      totalFindings: findings.length,
      criticalCount: counts.critical,
      highCount: counts.high,
      mediumCount: counts.medium,
      lowInfoCount: counts.lowInfo,
      categoryScores,
      explanationItems,
    },
    deltaAnalysis: {
      scoreDirection,
      scoreDeltaText,
      likelyReasons,
      previousScanDate: input.previous?.created_at || null,
      currentScanDate: input.current.created_at || null,
    },
    consistencyWarnings: warnings,
    customerSummary:
      previousScore === null
        ? `This is the first known consistency baseline for ${input.current.website_url}. Current score is ${currentScore}.`
        : `Latest score is ${currentScore}. Previous comparable score was ${previousScore}. ${scoreDeltaText} Use the latest scan as current baseline and old scans as history.`,
  };
}
