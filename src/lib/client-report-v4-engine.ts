export type RiskLevel = "Critical" | "High" | "Medium" | "Low" | "Info";
export type Confidence =
  "Confirmed" | "High" | "Medium" | "Low" | "Needs manual review";

export type SourceCounts = {
  crawlerRuns: number;
  apiRuns: number;
  authRuns: number;
  evidenceItems: number;
  proofChains: number;
  accuracyAssessments: number;
  vulnerabilityFindings: number;
  advancedClusters: number;
  workspaceBugs: number;
};

export type ClientReportInput = {
  targetUrl: string;
  baseScore?: number | null;
  latestScanStatus?: string | null;
  sourceCounts: SourceCounts;
  apiRiskScore?: number | null;
  authRiskScore?: number | null;
  crawlerRiskScore?: number | null;
  evidenceStrengthScore?: number | null;
  confirmedCount?: number;
  highConfidenceCount?: number;
  mediumConfidenceCount?: number;
  needsManualReviewCount?: number;
  openActionCount?: number;
  quickWinCount?: number;
  developerTaskCount?: number;
};

export const clientReportV4BlockedClaims = [
  "Do not say the website is 100% secure.",
  "Do not claim all vulnerabilities were found.",
  "Do not claim legal compliance certification.",
  "Do not claim confirmed exploitation without evidence.",
  "Do not expose private customer data in the report.",
  "Do not turn low-confidence signals into confirmed findings.",
  "Do not claim this replaces expert pentesters.",
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function riskLabel(score: number): RiskLevel {
  if (score >= 85) return "Critical";
  if (score >= 65) return "High";
  if (score >= 35) return "Medium";
  if (score >= 10) return "Low";
  return "Info";
}

export function calculateReportReadiness(input: ClientReportInput) {
  const s = input.sourceCounts;
  return clamp(
    (s.crawlerRuns ? 15 : 0) +
      (s.apiRuns ? 12 : 0) +
      (s.authRuns ? 12 : 0) +
      (s.evidenceItems ? 18 : 0) +
      (s.proofChains ? 12 : 0) +
      (s.accuracyAssessments ? 14 : 0) +
      (s.vulnerabilityFindings ? 8 : 0) +
      (s.advancedClusters ? 6 : 0) +
      (s.workspaceBugs ? 3 : 0),
  );
}

export function calculateBusinessRisk(input: ClientReportInput) {
  return clamp(
    (input.apiRiskScore || 0) * 0.25 +
      (input.authRiskScore || 0) * 0.25 +
      (input.crawlerRiskScore || 0) * 0.15 +
      (input.openActionCount || 0) * 4 +
      (input.needsManualReviewCount || 0) * 5 +
      (input.confirmedCount || 0) * 6 +
      (input.highConfidenceCount || 0) * 4,
  );
}

export function calculateExecutiveScore(input: ClientReportInput) {
  const readiness = calculateReportReadiness(input);
  const businessRisk = calculateBusinessRisk(input);
  const evidenceStrength =
    input.evidenceStrengthScore ??
    Math.min(
      100,
      input.sourceCounts.evidenceItems * 5 +
        input.sourceCounts.proofChains * 20,
    );
  const base = input.baseScore ?? 50;
  return clamp(
    base * 0.35 +
      readiness * 0.25 +
      evidenceStrength * 0.2 +
      (100 - businessRisk) * 0.2,
  );
}

export function metricStatus(score: number) {
  if (score >= 75) return "positive";
  if (score >= 45) return "warning";
  if (score >= 20) return "neutral";
  return "critical";
}

export function buildClientReportV4(input: ClientReportInput) {
  const reportReadinessScore = calculateReportReadiness(input);
  const businessRiskScore = calculateBusinessRisk(input);
  const evidenceStrengthScore = clamp(
    input.evidenceStrengthScore ??
      Math.min(
        100,
        input.sourceCounts.evidenceItems * 5 +
          input.sourceCounts.proofChains * 20,
      ),
  );
  const technicalRiskScore = clamp(
    ((input.apiRiskScore || 0) +
      (input.authRiskScore || 0) +
      (input.crawlerRiskScore || 0)) /
      3,
  );
  const executiveScore = calculateExecutiveScore(input);

  const confirmedCount = input.confirmedCount || 0;
  const highConfidenceCount = input.highConfidenceCount || 0;
  const mediumConfidenceCount = input.mediumConfidenceCount || 0;
  const needsManualReviewCount = input.needsManualReviewCount || 0;
  const openActionCount = input.openActionCount || 0;
  const quickWinCount = input.quickWinCount || 0;
  const developerTaskCount = input.developerTaskCount || 0;

  const publicSurfaceSummary = input.sourceCounts.crawlerRuns
    ? "Public website surface was reviewed with crawler and asset discovery signals."
    : "Public surface review is not complete yet. Run Advanced Crawler for better coverage.";

  const authenticatedSurfaceSummary = input.sourceCounts.authRuns
    ? "Authenticated/account-area review signals are included from approved safe review workflow."
    : "Authenticated/account-area review is not included yet. Use approved test-account scope before reviewing account pages.";

  const apiSurfaceSummary = input.sourceCounts.apiRuns
    ? "API documentation and endpoint inventory signals are included."
    : "API review is not included yet. Run API Security Review if APIs are in scope.";

  const executiveSummary = `Executive score ${executiveScore}/100 with report readiness ${reportReadinessScore}/100 and business risk ${businessRiskScore}/100. This report is evidence-backed and does not claim complete security coverage.`;
  const businessImpactSummary =
    businessRiskScore >= 65
      ? "Business risk needs priority attention because customer-data, account-area, API or high-confidence security signals may affect trust, operations or developer workload."
      : businessRiskScore >= 35
        ? "Business risk is moderate. Focus on developer actions, evidence validation and retesting."
        : "Business risk signals are currently limited, but security should continue through monitoring and periodic retesting.";
  const developerSummary = `${developerTaskCount} developer task(s), ${openActionCount} open action(s), and ${quickWinCount} quick win(s) are summarized for practical remediation.`;
  const clientSafeSummary = `The review found ${confirmedCount} confirmed and ${highConfidenceCount} high-confidence item(s). ${needsManualReviewCount} item(s) need manual review before strong claims are made.`;
  const limitationsSummary =
    "This report is not a legal compliance certificate and does not guarantee that every vulnerability was found. It summarizes evidence collected by authorized safe review workflows.";

  const sourceCounts = input.sourceCounts;
  const sections = [
    {
      sectionKey: "executive-summary",
      sectionTitle: "Executive Summary",
      sectionType: "executive",
      displayOrder: 10,
      visibility: "client",
      confidenceLevel: "High" as Confidence,
      riskLevel: riskLabel(businessRiskScore),
      sectionBody: executiveSummary,
      evidenceSummary:
        "Generated from available scan, evidence, API/auth review and accuracy sources.",
      actionSummary:
        "Review risk score, readiness score and recommended developer actions.",
      blockedClaim: "Do not state that the site is fully secure.",
      sectionPayload: { reportReadinessScore },
    },
    {
      sectionKey: "business-impact",
      sectionTitle: "Business Impact",
      sectionType: "client-safe",
      displayOrder: 20,
      visibility: "client",
      confidenceLevel: "Medium" as Confidence,
      riskLevel: riskLabel(businessRiskScore),
      sectionBody: businessImpactSummary,
      evidenceSummary:
        "Business impact is inferred from technical signals, confidence and open action count.",
      actionSummary:
        "Prioritize customer-data, login/account and API items first.",
      blockedClaim: "Do not claim business loss or breach without evidence.",
      sectionPayload: { businessRiskScore },
    },
    {
      sectionKey: "surface-summary",
      sectionTitle: "Surface Summary",
      sectionType: "client-safe",
      displayOrder: 30,
      visibility: "client",
      confidenceLevel: "Medium" as Confidence,
      riskLevel: riskLabel(technicalRiskScore),
      sectionBody: `${publicSurfaceSummary} ${authenticatedSurfaceSummary} ${apiSurfaceSummary}`,
      evidenceSummary:
        "Summarizes public, authenticated and API coverage sources.",
      actionSummary: "Run missing review modules to improve coverage.",
      blockedClaim:
        "Do not claim full application coverage unless all approved scopes were reviewed.",
      sectionPayload: {
        crawlerRuns: sourceCounts.crawlerRuns,
        authRuns: sourceCounts.authRuns,
        apiRuns: sourceCounts.apiRuns,
      },
    },
    {
      sectionKey: "developer-action-plan",
      sectionTitle: "Developer Action Plan",
      sectionType: "developer",
      displayOrder: 40,
      visibility: "developer",
      confidenceLevel: "High" as Confidence,
      riskLevel: riskLabel(businessRiskScore),
      sectionBody: developerSummary,
      evidenceSummary:
        "Uses workspace bugs, vulnerability findings and report action counts.",
      actionSummary:
        "Fix high-confidence items first, retest, then update evidence.",
      blockedClaim:
        "Do not force low-confidence items as confirmed developer defects.",
      sectionPayload: { developerTaskCount, openActionCount, quickWinCount },
    },
    {
      sectionKey: "evidence-confidence",
      sectionTitle: "Evidence and Confidence",
      sectionType: "evidence",
      displayOrder: 50,
      visibility: "client",
      confidenceLevel: "High" as Confidence,
      riskLevel: "Info" as RiskLevel,
      sectionBody: clientSafeSummary,
      evidenceSummary: `${sourceCounts.evidenceItems} evidence item(s), ${sourceCounts.proofChains} proof chain(s), and ${sourceCounts.accuracyAssessments} accuracy assessment(s) support this report.`,
      actionSummary:
        "Validate needs-manual-review items before strong customer-facing claims.",
      blockedClaim: "Do not present medium or low confidence as confirmed.",
      sectionPayload: {
        confirmedCount,
        highConfidenceCount,
        mediumConfidenceCount,
        needsManualReviewCount,
      },
    },
    {
      sectionKey: "limitations",
      sectionTitle: "Limitations",
      sectionType: "limitation",
      displayOrder: 90,
      visibility: "client",
      confidenceLevel: "Confirmed" as Confidence,
      riskLevel: "Info" as RiskLevel,
      sectionBody: limitationsSummary,
      evidenceSummary: "Safe wording control section.",
      actionSummary:
        "Use ongoing monitoring, retesting and manual expert validation for stronger assurance.",
      blockedClaim: "No 100% security or legal certification claims.",
      sectionPayload: { blockedClaims: clientReportV4BlockedClaims },
    },
  ];

  const metrics = [
    {
      metricKey: "executive-score",
      metricLabel: "Executive Security Score",
      metricValue: `${executiveScore}/100`,
      metricScore: executiveScore,
      metricStatus: metricStatus(executiveScore),
      metricCategory: "executive",
      explanation:
        "Balanced score using scan score, report readiness, evidence strength and inverse business risk.",
      evidenceReference: "scan + report v4 calculation",
    },
    {
      metricKey: "report-readiness",
      metricLabel: "Report Readiness",
      metricValue: `${reportReadinessScore}/100`,
      metricScore: reportReadinessScore,
      metricStatus: metricStatus(reportReadinessScore),
      metricCategory: "report",
      explanation:
        "Measures how many key evidence sources are available for a client-ready report.",
      evidenceReference: "module source counts",
    },
    {
      metricKey: "business-risk",
      metricLabel: "Business Risk",
      metricValue: `${businessRiskScore}/100`,
      metricScore: businessRiskScore,
      metricStatus:
        businessRiskScore >= 65
          ? "critical"
          : businessRiskScore >= 35
            ? "warning"
            : "neutral",
      metricCategory: "risk",
      explanation:
        "Combines API/auth/public-surface risk, confidence and open actions.",
      evidenceReference: "risk source aggregation",
    },
    {
      metricKey: "evidence-strength",
      metricLabel: "Evidence Strength",
      metricValue: `${evidenceStrengthScore}/100`,
      metricScore: evidenceStrengthScore,
      metricStatus: metricStatus(evidenceStrengthScore),
      metricCategory: "evidence",
      explanation:
        "Measures available evidence items, proof chains and accuracy assessments.",
      evidenceReference: "evidence warehouse + accuracy foundation",
    },
  ];

  return {
    executiveScore,
    reportReadinessScore,
    businessRiskScore,
    technicalRiskScore,
    evidenceStrengthScore,
    confirmedCount,
    highConfidenceCount,
    mediumConfidenceCount,
    needsManualReviewCount,
    openActionCount,
    quickWinCount,
    developerTaskCount,
    publicSurfaceSummary,
    authenticatedSurfaceSummary,
    apiSurfaceSummary,
    executiveSummary,
    businessImpactSummary,
    developerSummary,
    clientSafeSummary,
    limitationsSummary,
    blockedClaims: clientReportV4BlockedClaims,
    sourceCounts,
    reportPayload: {
      targetUrl: input.targetUrl,
      baseScore: input.baseScore,
      latestScanStatus: input.latestScanStatus,
      safeLanguage: true,
    },
    sections,
    metrics,
  };
}
