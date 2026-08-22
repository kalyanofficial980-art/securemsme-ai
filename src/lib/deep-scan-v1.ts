import { runAdvancedCrawlerEngine } from "@/lib/advanced-crawler-engine";
import { runApiSecurityScanner } from "@/lib/api-security-scanner";
import { runAuthorizedVulnerabilityScanner } from "@/lib/authorized-vulnerability-scanner";
import { runAdvancedBrowserSecurityAnalyzer } from "@/lib/browser-security-analyzer";
import { buildCveIntelligenceReport } from "@/lib/cve-intelligence";
import { classifyResponseTruth } from "@/lib/scan-truth";
import { safeFetchPublicUrl } from "@/lib/security/ssrf";

export type DeepScanV1EngineStatus =
  | "completed"
  | "completed-with-warnings"
  | "inconclusive"
  | "blocked"
  | "failed"
  | "skipped";

export type DeepScanV1FindingStatus =
  | "evidence-backed"
  | "review-signal"
  | "informational";

export type DeepScanV1Finding = {
  id: string;
  source: string;
  title: string;
  category: string;
  severity: string;
  confidence: string;
  falsePositiveRisk: "Low" | "Medium" | "High";
  status: DeepScanV1FindingStatus;
  affectedUrl?: string;
  evidenceSummary: string;
  businessImpact: string;
  developerFix: string;
  safeClaim: string;
  blockedClaim: string;
  standards: Record<string, string[]>;
};

export type DeepOwaspCoverageStatus =
  | "assessed"
  | "partial"
  | "not-assessed"
  | "inconclusive";

export type DeepOwaspCoverageItem = {
  id: string;
  title: string;
  status: DeepOwaspCoverageStatus;
  evidence: string;
  limitation: string;
};

export type DeepScanV1Report = {
  version: "deep-scan-v1";
  generatedAt: string;
  targetUrl: string;
  authorized: boolean;
  safeMode: true;
  status: DeepScanV1EngineStatus;
  truthGate: {
    statusCode: number | null;
    truth: "verified" | "inconclusive" | "not-applicable";
    reason: string;
    representativeResponse: boolean;
  };
  engineRuns: Array<{
    id: string;
    label: string;
    status: DeepScanV1EngineStatus;
    summary: string;
  }>;
  attackSurface: {
    pagesObserved: number;
    routes: number;
    apiEndpoints: number;
    forms: number;
    parameters: number;
    scripts: number;
    jsRoutes: number;
    riskSignals: number;
  };
  apiSecurity: {
    documents: number;
    endpoints: number;
    getEndpoints: number;
    mutationMethodsInventoried: number;
    authUnknown: number;
    sensitivePaths: number;
    riskSignals: number;
    mutationMethodsExecuted: 0;
  };
  browserSecurity: {
    pagesObserved: number;
    score: number | null;
    findings: number;
    highRiskSignals: number;
    cspFindings: number;
    corsFindings: number;
    cookieFindings: number;
    mixedContentFindings: number;
  };
  authorizedReview: {
    findings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    runStatus: DeepScanV1EngineStatus;
  };
  cveIntelligence: ReturnType<typeof buildCveIntelligenceReport>;
  findings: DeepScanV1Finding[];
  owaspTop10Coverage: DeepOwaspCoverageItem[];
  coverage: {
    assessed: number;
    partial: number;
    notAssessed: number;
    inconclusive: number;
    confidence: "good" | "limited" | "inconclusive";
  };
  safeBoundary: string[];
  customerSummary: string;
  developerSummary: string;
  canonicalScorePolicy: string;
};

const SAFE_BOUNDARY = [
  "Verified public website scope only",
  "Representative response truth gate runs before advanced modules",
  "Same-origin crawling only",
  "GET/HEAD observation only",
  "No form submission",
  "No POST/PUT/PATCH/DELETE execution",
  "No exploit payload execution",
  "No brute force or password guessing",
  "No login or authorization bypass",
  "No destructive testing",
  "No private response body storage",
  "No credential or session storage",
];

function toHeaderMap(headers: Headers) {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

async function verifyRepresentativeResponse(targetUrl: string) {
  try {
    const response = await safeFetchPublicUrl(targetUrl, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: {
        "User-Agent": "VeyraSec-DeepScan-TruthGate/1.0",
        Accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.5",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    let body = "";
    if (
      contentType.includes("text") ||
      contentType.includes("html") ||
      contentType.includes("json") ||
      contentType === ""
    ) {
      body = (await response.text()).slice(0, 80_000);
    }
    const truth = classifyResponseTruth({
      status: response.status,
      headers: toHeaderMap(response.headers),
      body,
    });
    if (response.status >= 300 && response.status < 400) {
      return {
        statusCode: response.status,
        truth: "inconclusive" as const,
        reason: `HTTP ${response.status} redirect did not provide representative application evidence for advanced analysis.`,
        representativeResponse: false,
      };
    }
    return {
      statusCode: response.status,
      truth: truth.truth,
      reason: truth.reason,
      representativeResponse: truth.truth === "verified",
    };
  } catch {
    return {
      statusCode: null,
      truth: "inconclusive" as const,
      reason: "Deep Scan could not obtain a representative public response from the scanner vantage point.",
      representativeResponse: false,
    };
  }
}

function engineStatus(value: unknown): DeepScanV1EngineStatus {
  const status = String(value || "").toLowerCase();
  if (status === "completed") return "completed";
  if (status === "completed-with-warnings") return "completed-with-warnings";
  if (status === "blocked") return "blocked";
  if (status === "failed") return "failed";
  if (status === "skipped") return "skipped";
  return "inconclusive";
}

function standards(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const output: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(input)) {
    if (Array.isArray(raw)) output[key] = raw.map(String).filter(Boolean).slice(0, 12);
  }
  return output;
}

function severityWeight(value: string) {
  const severity = value.toLowerCase();
  if (severity === "critical") return 5;
  if (severity === "high") return 4;
  if (severity === "medium") return 3;
  if (severity === "low") return 2;
  return 1;
}

function dedupeFindings(findings: DeepScanV1Finding[]) {
  const seen = new Set<string>();
  return findings
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .filter((finding) => {
      const key = `${finding.source}:${finding.title}:${finding.affectedUrl || ""}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 100)
    .map((finding, index) => ({ ...finding, id: `DSF-${String(index + 1).padStart(3, "0")}` }));
}

function buildOwaspCoverage(input: {
  truthVerified: boolean;
  crawlerCompleted: boolean;
  apiCompleted: boolean;
  browserCompleted: boolean;
  authorizedCompleted: boolean;
  cveTechnologyCount: number;
  apiEndpointCount: number;
  browserFindingCount: number;
  attackSurfaceRiskSignals: number;
}): DeepOwaspCoverageItem[] {
  if (!input.truthVerified) {
    return [
      ["A01", "Broken Access Control"],
      ["A02", "Cryptographic Failures"],
      ["A03", "Injection"],
      ["A04", "Insecure Design"],
      ["A05", "Security Misconfiguration"],
      ["A06", "Vulnerable and Outdated Components"],
      ["A07", "Identification and Authentication Failures"],
      ["A08", "Software and Data Integrity Failures"],
      ["A09", "Security Logging and Monitoring Failures"],
      ["A10", "Server-Side Request Forgery"],
    ].map(([id, title]) => ({
      id,
      title,
      status: "inconclusive" as const,
      evidence: "Representative application response was not available.",
      limitation: "No OWASP pass/fail claim is allowed when the target response is inconclusive.",
    }));
  }

  return [
    {
      id: "A01",
      title: "Broken Access Control",
      status: input.apiCompleted || input.crawlerCompleted ? "partial" : "not-assessed",
      evidence: `${input.apiEndpointCount} API endpoint(s) and ${input.attackSurfaceRiskSignals} high-interest surface signal(s) inventoried without authorization bypass attempts.`,
      limitation: "Object/function-level authorization requires authenticated test accounts and is not executed by Deep Scan V1.",
    },
    {
      id: "A02",
      title: "Cryptographic Failures",
      status: input.browserCompleted ? "partial" : "not-assessed",
      evidence: "Browser-facing HTTPS/HSTS/mixed-content signals are observed; canonical transport checks remain in the base Security Score.",
      limitation: "Deep Scan V1 does not perform invasive protocol downgrade or cryptographic attacks.",
    },
    {
      id: "A03",
      title: "Injection",
      status: "not-assessed",
      evidence: "Forms, inputs and API parameters may be inventoried but no payloads are submitted.",
      limitation: "Injection needs explicit authorized payload testing and is not claimed as pass/fail here.",
    },
    {
      id: "A04",
      title: "Insecure Design",
      status: input.crawlerCompleted ? "partial" : "not-assessed",
      evidence: "Attack-surface and workflow signals are inventoried for design review.",
      limitation: "Business logic and threat-model quality require manual review.",
    },
    {
      id: "A05",
      title: "Security Misconfiguration",
      status: input.browserCompleted && input.authorizedCompleted ? "assessed" : "partial",
      evidence: `${input.browserFindingCount} browser/configuration observation(s) collected with safe public evidence.`,
      limitation: "Assessed means the listed public controls were checked; it does not certify all server or cloud configuration.",
    },
    {
      id: "A06",
      title: "Vulnerable and Outdated Components",
      status: input.cveTechnologyCount > 0 ? "partial" : "not-assessed",
      evidence: `${input.cveTechnologyCount} technology signal(s) correlated with local risk rules and version-certainty rules.`,
      limitation: "Technology detection never proves a CVE applies without exact version and affected-range validation.",
    },
    {
      id: "A07",
      title: "Identification and Authentication Failures",
      status: input.browserCompleted || input.crawlerCompleted ? "partial" : "not-assessed",
      evidence: "Login surface and public cookie/session hardening signals are reviewed without signing in.",
      limitation: "Authentication workflow security requires an authorized test account and is not bypass-tested.",
    },
    {
      id: "A08",
      title: "Software and Data Integrity Failures",
      status: input.browserCompleted ? "partial" : "not-assessed",
      evidence: "CSP, external scripts and integrity metadata are reviewed as public supply-chain signals.",
      limitation: "Build pipeline, artifact signing and private dependency provenance are outside public Deep Scan scope.",
    },
    {
      id: "A09",
      title: "Security Logging and Monitoring Failures",
      status: "not-assessed",
      evidence: "Public scanning cannot prove backend logging, alerting or incident detection quality.",
      limitation: "Requires internal operational evidence or an authorized observability review.",
    },
    {
      id: "A10",
      title: "Server-Side Request Forgery",
      status: "not-assessed",
      evidence: "No SSRF payload or internal-network request is attempted.",
      limitation: "SSRF testing is intentionally excluded from this safe public Deep Scan.",
    },
  ];
}

export { buildOwaspCoverage as buildDeepScanV1OwaspCoverage };

function emptyCveReport(targetUrl: string) {
  return buildCveIntelligenceReport({ websiteUrl: targetUrl, report: {} });
}

export async function runDeepScanV1(input: {
  targetUrl: string;
  verifiedScope: boolean;
  permissionAccepted: boolean;
  baseReport?: Record<string, unknown> | null;
}): Promise<DeepScanV1Report> {
  const generatedAt = new Date().toISOString();
  const targetUrl = new URL(input.targetUrl).toString();
  const authorized = Boolean(input.verifiedScope && input.permissionAccepted);

  if (!authorized) {
    const truthGate = {
      statusCode: null,
      truth: "not-applicable" as const,
      reason: "Verified ownership and explicit permission are required for Deep Scan V1.",
      representativeResponse: false,
    };
    const coverage = buildOwaspCoverage({
      truthVerified: false,
      crawlerCompleted: false,
      apiCompleted: false,
      browserCompleted: false,
      authorizedCompleted: false,
      cveTechnologyCount: 0,
      apiEndpointCount: 0,
      browserFindingCount: 0,
      attackSurfaceRiskSignals: 0,
    });
    return {
      version: "deep-scan-v1",
      generatedAt,
      targetUrl,
      authorized: false,
      safeMode: true,
      status: "blocked",
      truthGate,
      engineRuns: [],
      attackSurface: { pagesObserved: 0, routes: 0, apiEndpoints: 0, forms: 0, parameters: 0, scripts: 0, jsRoutes: 0, riskSignals: 0 },
      apiSecurity: { documents: 0, endpoints: 0, getEndpoints: 0, mutationMethodsInventoried: 0, authUnknown: 0, sensitivePaths: 0, riskSignals: 0, mutationMethodsExecuted: 0 },
      browserSecurity: { pagesObserved: 0, score: null, findings: 0, highRiskSignals: 0, cspFindings: 0, corsFindings: 0, cookieFindings: 0, mixedContentFindings: 0 },
      authorizedReview: { findings: 0, critical: 0, high: 0, medium: 0, low: 0, runStatus: "blocked" },
      cveIntelligence: emptyCveReport(targetUrl),
      findings: [],
      owaspTop10Coverage: coverage,
      coverage: { assessed: 0, partial: 0, notAssessed: 0, inconclusive: 10, confidence: "inconclusive" },
      safeBoundary: SAFE_BOUNDARY,
      customerSummary: "Deep Scan V1 was blocked because verified scope and permission were not both present.",
      developerSummary: "No advanced modules ran and no vulnerability claims were produced.",
      canonicalScorePolicy: "Deep Scan V1 supporting evidence never silently changes the canonical Security Score.",
    };
  }

  const truthGate = await verifyRepresentativeResponse(targetUrl);
  if (!truthGate.representativeResponse) {
    const coverage = buildOwaspCoverage({
      truthVerified: false,
      crawlerCompleted: false,
      apiCompleted: false,
      browserCompleted: false,
      authorizedCompleted: false,
      cveTechnologyCount: 0,
      apiEndpointCount: 0,
      browserFindingCount: 0,
      attackSurfaceRiskSignals: 0,
    });
    return {
      version: "deep-scan-v1",
      generatedAt,
      targetUrl,
      authorized: true,
      safeMode: true,
      status: "inconclusive",
      truthGate,
      engineRuns: [
        { id: "truth-gate", label: "Representative response truth gate", status: "inconclusive", summary: truthGate.reason },
        { id: "attack-surface", label: "Attack Surface", status: "skipped", summary: "Skipped to prevent false findings from a non-representative response." },
        { id: "api-security", label: "API Security", status: "skipped", summary: "Skipped to prevent false findings from a non-representative response." },
        { id: "browser-security", label: "Browser Security", status: "skipped", summary: "Skipped to prevent false findings from a non-representative response." },
        { id: "authorized-review", label: "Authorized Vulnerability Review", status: "skipped", summary: "Skipped to prevent false findings from a non-representative response." },
        { id: "cve-intelligence", label: "Technology/CVE Intelligence", status: "skipped", summary: "Skipped because representative technology evidence was unavailable." },
      ],
      attackSurface: { pagesObserved: 0, routes: 0, apiEndpoints: 0, forms: 0, parameters: 0, scripts: 0, jsRoutes: 0, riskSignals: 0 },
      apiSecurity: { documents: 0, endpoints: 0, getEndpoints: 0, mutationMethodsInventoried: 0, authUnknown: 0, sensitivePaths: 0, riskSignals: 0, mutationMethodsExecuted: 0 },
      browserSecurity: { pagesObserved: 0, score: null, findings: 0, highRiskSignals: 0, cspFindings: 0, corsFindings: 0, cookieFindings: 0, mixedContentFindings: 0 },
      authorizedReview: { findings: 0, critical: 0, high: 0, medium: 0, low: 0, runStatus: "skipped" },
      cveIntelligence: emptyCveReport(targetUrl),
      findings: [],
      owaspTop10Coverage: coverage,
      coverage: { assessed: 0, partial: 0, notAssessed: 0, inconclusive: 10, confidence: "inconclusive" },
      safeBoundary: SAFE_BOUNDARY,
      customerSummary: "Deep Scan V1 could not obtain representative application evidence, so advanced modules were skipped instead of producing false vulnerabilities.",
      developerSummary: truthGate.reason,
      canonicalScorePolicy: "Inconclusive Deep Scan evidence has zero canonical score penalty.",
    };
  }

  let crawler: Awaited<ReturnType<typeof runAdvancedCrawlerEngine>> | null = null;
  try {
    crawler = await runAdvancedCrawlerEngine({ targetUrl, intensity: "light", verifiedScope: true });
  } catch {
    crawler = null;
  }

  const routeHints = (crawler?.pages || [])
    .filter((page) => Boolean(page.statusCode && page.statusCode >= 200 && page.statusCode < 300))
    .map((page) => page.url)
    .filter((url) => url !== targetUrl)
    .slice(0, 4);
  const apiHints = (crawler?.items || [])
    .filter((item) => item.itemType === "api-endpoint")
    .map((item) => item.url)
    .slice(0, 20);

  const [apiSettled, browserSettled, authorizedSettled] = await Promise.allSettled([
    runApiSecurityScanner({ targetUrl, intensity: "light", verifiedScope: true, attackSurfaceHints: apiHints }),
    runAdvancedBrowserSecurityAnalyzer({ targetUrl, intensity: "light", verifiedScope: true, routeHints }),
    runAuthorizedVulnerabilityScanner({ targetUrl, mode: "safe-standard", verifiedScope: true, permissionAccepted: true }),
  ]);

  const api = apiSettled.status === "fulfilled" ? apiSettled.value : null;
  const browser = browserSettled.status === "fulfilled" ? browserSettled.value : null;
  const authorizedReview = authorizedSettled.status === "fulfilled" ? authorizedSettled.value : null;

  const cveIntelligence = buildCveIntelligenceReport({
    websiteUrl: targetUrl,
    report: {
      ...(input.baseReport || {}),
      deepAttackSurface: crawler || undefined,
      deepApiSecurity: api || undefined,
      deepBrowserSecurity: browser || undefined,
      deepAuthorizedReview: authorizedReview || undefined,
    },
  });

  const findings: DeepScanV1Finding[] = [];

  for (const finding of browser?.findings || []) {
    findings.push({
      id: "",
      source: "Browser Security",
      title: finding.title,
      category: finding.category,
      severity: finding.severity,
      confidence: finding.confidence,
      falsePositiveRisk: finding.confidence === "High" ? "Low" : "Medium",
      status: finding.confidence === "High" ? "evidence-backed" : "review-signal",
      affectedUrl: finding.affectedUrl,
      evidenceSummary: finding.evidenceSummary,
      businessImpact: finding.businessImpact,
      developerFix: finding.developerFix,
      safeClaim: finding.safeClaim,
      blockedClaim: finding.blockedClaim,
      standards: standards(finding.standards),
    });
  }

  for (const finding of authorizedReview?.findings || []) {
    const evidenceBacked = finding.falsePositiveRisk === "Low" && ["Confirmed", "High"].includes(finding.confidence);
    findings.push({
      id: "",
      source: "Authorized Vulnerability Review",
      title: finding.title,
      category: finding.bugCategory,
      severity: finding.severity,
      confidence: finding.confidence,
      falsePositiveRisk: finding.falsePositiveRisk,
      status: evidenceBacked ? "evidence-backed" : "review-signal",
      affectedUrl: finding.affectedUrl,
      evidenceSummary: finding.evidenceSummary,
      businessImpact: finding.businessImpact,
      developerFix: finding.developerFix,
      safeClaim: finding.safeClaim,
      blockedClaim: finding.blockedClaim,
      standards: {},
    });
  }

  for (const seed of crawler?.vulnerabilitySeeds || []) {
    findings.push({
      id: "",
      source: "Attack Surface",
      title: seed.title,
      category: seed.category,
      severity: seed.severity,
      confidence: seed.confidence,
      falsePositiveRisk: "Medium",
      status: "review-signal",
      affectedUrl: seed.affectedAssets?.[0],
      evidenceSummary: seed.safeClaim,
      businessImpact: seed.businessImpact,
      developerFix: seed.developerFix,
      safeClaim: seed.safeClaim,
      blockedClaim: seed.blockedClaim,
      standards: standards(seed.standards),
    });
  }

  for (const seed of api?.vulnerabilitySeeds || []) {
    findings.push({
      id: "",
      source: "API Security",
      title: seed.title,
      category: seed.category,
      severity: seed.severity,
      confidence: seed.confidence,
      falsePositiveRisk: "Medium",
      status: "review-signal",
      affectedUrl: seed.affectedAssets?.[0],
      evidenceSummary: seed.safeClaim,
      businessImpact: seed.businessImpact,
      developerFix: seed.developerFix,
      safeClaim: seed.safeClaim,
      blockedClaim: seed.blockedClaim,
      standards: standards(seed.standards),
    });
  }

  for (const insight of cveIntelligence.insights) {
    findings.push({
      id: "",
      source: "Technology/CVE Intelligence",
      title: insight.riskTitle,
      category: insight.riskCategory,
      severity: insight.severity,
      confidence: insight.confidence,
      falsePositiveRisk: insight.detectedVersion ? "Medium" : "High",
      status: insight.detectedVersion ? "review-signal" : "informational",
      evidenceSummary: insight.evidence.join(" · ") || "Technology signal observed.",
      businessImpact: insight.customerExplanation,
      developerFix: insight.developerRecommendation,
      safeClaim: insight.safeClaim,
      blockedClaim: insight.blockedClaim,
      standards: {},
    });
  }

  const dedupedFindings = dedupeFindings(findings);
  const crawlerSummary = crawler?.summary;
  const apiSummary = api?.summary;
  const browserSummary = browser?.summary;
  const authorizedCounts = authorizedReview?.counts;
  const crawlerStatus = crawler ? engineStatus(crawler.crawlerStatus) : "failed";
  const apiStatus = api ? engineStatus(api.scannerStatus) : "failed";
  const browserStatus = browser ? engineStatus(browser.analyzerStatus) : "failed";
  const authorizedStatus = authorizedReview ? engineStatus(authorizedReview.runStatus) : "failed";

  const owaspTop10Coverage = buildOwaspCoverage({
    truthVerified: true,
    crawlerCompleted: crawlerStatus === "completed" || crawlerStatus === "completed-with-warnings",
    apiCompleted: apiStatus === "completed" || apiStatus === "completed-with-warnings",
    browserCompleted: browserStatus === "completed" || browserStatus === "completed-with-warnings",
    authorizedCompleted: authorizedStatus === "completed" || authorizedStatus === "completed-with-warnings",
    cveTechnologyCount: cveIntelligence.totalTechnologies,
    apiEndpointCount: apiSummary?.endpointCount || 0,
    browserFindingCount: browserSummary?.findingCount || 0,
    attackSurfaceRiskSignals: crawlerSummary?.riskSignalCount || 0,
  });

  const coverageCounts = {
    assessed: owaspTop10Coverage.filter((item) => item.status === "assessed").length,
    partial: owaspTop10Coverage.filter((item) => item.status === "partial").length,
    notAssessed: owaspTop10Coverage.filter((item) => item.status === "not-assessed").length,
    inconclusive: owaspTop10Coverage.filter((item) => item.status === "inconclusive").length,
  };

  const statuses = [crawlerStatus, apiStatus, browserStatus, authorizedStatus];
  const hasFailure = statuses.some((status) => status === "failed" || status === "blocked");
  const hasWarning = statuses.some((status) => status === "completed-with-warnings" || status === "inconclusive");
  const status: DeepScanV1EngineStatus = hasFailure || hasWarning ? "completed-with-warnings" : "completed";
  const coverageConfidence = hasFailure ? "limited" : "good";

  return {
    version: "deep-scan-v1",
    generatedAt,
    targetUrl,
    authorized: true,
    safeMode: true,
    status,
    truthGate,
    engineRuns: [
      { id: "truth-gate", label: "Representative response truth gate", status: "completed", summary: truthGate.reason },
      { id: "attack-surface", label: "Attack Surface", status: crawlerStatus, summary: crawlerSummary?.customerSummary || "Attack Surface engine did not complete." },
      { id: "api-security", label: "API Security", status: apiStatus, summary: apiSummary?.customerSummary || "API Security engine did not complete." },
      { id: "browser-security", label: "Browser Security", status: browserStatus, summary: browserSummary?.customerSummary || "Browser Security engine did not complete." },
      { id: "authorized-review", label: "Authorized Vulnerability Review", status: authorizedStatus, summary: authorizedReview?.safeSummary || "Authorized review did not complete." },
      { id: "cve-intelligence", label: "Technology/CVE Intelligence", status: "completed", summary: cveIntelligence.customerSummary },
    ],
    attackSurface: {
      pagesObserved: crawler?.pages.length || 0,
      routes: crawlerSummary?.routeCount || 0,
      apiEndpoints: crawlerSummary?.apiEndpointCount || 0,
      forms: crawlerSummary?.formCount || 0,
      parameters: crawlerSummary?.parameterCount || 0,
      scripts: crawlerSummary?.scriptCount || 0,
      jsRoutes: crawlerSummary?.jsRouteCount || 0,
      riskSignals: crawlerSummary?.riskSignalCount || 0,
    },
    apiSecurity: {
      documents: apiSummary?.documentCount || 0,
      endpoints: apiSummary?.endpointCount || 0,
      getEndpoints: apiSummary?.getEndpointCount || 0,
      mutationMethodsInventoried: apiSummary?.mutationMethodCount || 0,
      authUnknown: apiSummary?.authUnknownCount || 0,
      sensitivePaths: apiSummary?.sensitivePathCount || 0,
      riskSignals: apiSummary?.apiRiskSignalCount || 0,
      mutationMethodsExecuted: 0,
    },
    browserSecurity: {
      pagesObserved: browserSummary?.pageCount || 0,
      score: typeof browserSummary?.browserSecurityScore === "number" ? browserSummary.browserSecurityScore : null,
      findings: browserSummary?.findingCount || 0,
      highRiskSignals: browserSummary?.highRiskCount || 0,
      cspFindings: browserSummary?.cspFindingCount || 0,
      corsFindings: browserSummary?.corsFindingCount || 0,
      cookieFindings: browserSummary?.cookieFindingCount || 0,
      mixedContentFindings: browserSummary?.mixedContentCount || 0,
    },
    authorizedReview: {
      findings: authorizedCounts?.total || 0,
      critical: authorizedCounts?.critical || 0,
      high: authorizedCounts?.high || 0,
      medium: authorizedCounts?.medium || 0,
      low: authorizedCounts?.low || 0,
      runStatus: authorizedStatus,
    },
    cveIntelligence,
    findings: dedupedFindings,
    owaspTop10Coverage,
    coverage: {
      ...coverageCounts,
      confidence: coverageConfidence,
    },
    safeBoundary: SAFE_BOUNDARY,
    customerSummary:
      status === "completed"
        ? "Deep Scan V1 completed multiple safe evidence engines after verifying a representative public response. Findings are separated into evidence-backed observations, review signals and informational technology context."
        : "Deep Scan V1 completed with limited module coverage. Failed or uncertain modules did not create pass/fail claims outside their evidence.",
    developerSummary:
      "Prioritize evidence-backed observations first, then review API/attack-surface signals. OWASP coverage is explicit about partial and unassessed areas rather than presenting unsupported PASS claims.",
    canonicalScorePolicy:
      "Deep Scan V1 evidence is supporting diagnostic coverage and does not silently modify the canonical Security Score. Only the canonical truth-calibrated scanner controls that score.",
  };
}
