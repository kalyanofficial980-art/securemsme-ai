import type {
  CveInsight,
  CveIntelligenceReport,
  DetectedTechnology,
} from "@/lib/cve-intelligence";

export type DeepCalibrationFinding = {
  source: string;
  title: string;
  category: string;
  severity: string;
  confidence: string;
  falsePositiveRisk: "Low" | "Medium" | "High";
  status: "evidence-backed" | "review-signal" | "informational";
  affectedUrl?: string;
  evidenceSummary: string;
};

const STATIC_ASSET_EXTENSIONS = /\.(?:css|js|mjs|cjs|map|png|jpe?g|gif|webp|svg|ico|avif|woff2?|ttf|eot|otf|mp4|webm|mp3|wav|pdf)(?:$|[?#])/i;
const NEXT_STATIC_PATH = /\/_next\/(?:static|image)(?:\/|$)/i;
const REDIRECT_EVIDENCE = /\bHTTP\s+(?:301|302|303|307|308)\b/i;

export function isDeepStaticAssetUrl(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return STATIC_ASSET_EXTENSIONS.test(`${url.pathname}${url.search}`) || NEXT_STATIC_PATH.test(url.pathname);
  } catch {
    return STATIC_ASSET_EXTENSIONS.test(value) || NEXT_STATIC_PATH.test(value);
  }
}

function normalizedText(...values: Array<string | undefined | null>) {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function statusRank(value: DeepCalibrationFinding["status"]) {
  if (value === "evidence-backed") return 3;
  if (value === "review-signal") return 2;
  return 1;
}

function confidenceRank(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "confirmed") return 5;
  if (normalized === "high") return 4;
  if (normalized === "medium") return 3;
  if (normalized === "low") return 2;
  return 1;
}

function severityRank(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "critical") return 5;
  if (normalized === "high") return 4;
  if (normalized === "medium") return 3;
  if (normalized === "low") return 2;
  return 1;
}

function isCanonicalLegalDuplicate(finding: DeepCalibrationFinding) {
  const text = normalizedText(finding.title, finding.category);
  return (
    text.includes("privacy policy page was not found") ||
    text.includes("privacy policy not found") ||
    text.includes("terms page was not found") ||
    text.includes("terms page not found") ||
    text.includes("contact page was not found") ||
    text.includes("contact page not found")
  );
}

function isRedirectOnlySensitiveSurface(finding: DeepCalibrationFinding) {
  const text = normalizedText(finding.title, finding.category);
  return text.includes("public sensitive surface") && REDIRECT_EVIDENCE.test(finding.evidenceSummary || "");
}

function isStaticBrowserNoise(finding: DeepCalibrationFinding) {
  if (finding.source !== "Browser Security" || !isDeepStaticAssetUrl(finding.affectedUrl)) return false;
  const text = normalizedText(finding.title, finding.category);
  return text.includes("content security policy") || text.includes("csp") || text.includes("cors");
}

function isStaticAttackSurfaceNoise(finding: DeepCalibrationFinding) {
  return finding.source === "Attack Surface" && isDeepStaticAssetUrl(finding.affectedUrl);
}

function isWeakTechnologyNoise(finding: DeepCalibrationFinding) {
  if (finding.source !== "Technology/CVE Intelligence") return false;
  if (finding.falsePositiveRisk !== "High" && finding.confidence.toLowerCase() !== "low") return false;
  const text = normalizedText(finding.title, finding.evidenceSummary);
  return text.includes("wordpress") || text.includes("woocommerce") || /\bphp\b/.test(text);
}

function semanticFamily(finding: DeepCalibrationFinding) {
  const text = normalizedText(finding.title, finding.category);
  if (text.includes("content security policy") || /\bcsp\b/.test(text)) return "browser:csp";
  if (text.includes("technology details are exposed") || text.includes("server technology exposure")) return "technology:header-exposure";
  return `${finding.source}:${finding.title}:${finding.affectedUrl || ""}`.toLowerCase().replace(/\s+/g, " ");
}

export function calibrateDeepFindings<T extends DeepCalibrationFinding>(findings: T[]): T[] {
  const filtered = findings.filter((finding) => {
    if (isCanonicalLegalDuplicate(finding)) return false;
    if (isRedirectOnlySensitiveSurface(finding)) return false;
    if (isStaticBrowserNoise(finding)) return false;
    if (isStaticAttackSurfaceNoise(finding)) return false;
    if (isWeakTechnologyNoise(finding)) return false;
    return true;
  });

  const ranked = [...filtered].sort((a, b) => {
    const status = statusRank(b.status) - statusRank(a.status);
    if (status) return status;
    const confidence = confidenceRank(b.confidence) - confidenceRank(a.confidence);
    if (confidence) return confidence;
    const nonStatic = Number(isDeepStaticAssetUrl(a.affectedUrl)) - Number(isDeepStaticAssetUrl(b.affectedUrl));
    if (nonStatic) return nonStatic;
    return severityRank(b.severity) - severityRank(a.severity);
  });

  const seen = new Set<string>();
  return ranked.filter((finding) => {
    const family = semanticFamily(finding);
    if (seen.has(family)) return false;
    seen.add(family);
    return true;
  });
}

function evidenceText(technology: DetectedTechnology) {
  return technology.evidence.join(" ").toLowerCase();
}

function hasStrongTechnologyFingerprint(technology: DetectedTechnology) {
  const name = technology.name.toLowerCase();
  const evidence = evidenceText(technology);

  if (name === "wordpress") {
    return evidence.includes("wp-content") || evidence.includes("wordpress");
  }

  if (name === "woocommerce") {
    return evidence.includes("woocommerce") || /\bwc-(?:ajax|api|cart|checkout|store)\b/.test(evidence);
  }

  if (name === "php") {
    return evidence.includes("x-powered-by: php") || evidence.includes("php/") || /\b[^\s]+\.php\b/.test(evidence);
  }

  return true;
}

function insightKey(insight: CveInsight) {
  return `${insight.technologyName}:${insight.riskTitle}`.toLowerCase();
}

export function calibrateDeepCveIntelligence(report: CveIntelligenceReport): CveIntelligenceReport {
  const detectedTechnologies = report.detectedTechnologies.filter(hasStrongTechnologyFingerprint);
  const allowedTechnologies = new Set(detectedTechnologies.map((technology) => technology.name.toLowerCase()));

  const seen = new Set<string>();
  const insights = report.insights.filter((insight) => {
    if (!allowedTechnologies.has(insight.technologyName.toLowerCase())) return false;
    const key = insightKey(insight);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const versionKnownCount = detectedTechnologies.filter((technology) => Boolean(technology.version)).length;
  const highPriorityCount = insights.filter((insight) => insight.severity === "Critical" || insight.severity === "High").length;
  const developerActions = Array.from(
    new Set(insights.map((insight) => insight.developerRecommendation).filter(Boolean)),
  ).slice(0, 12);

  return {
    ...report,
    detectedTechnologies,
    insights,
    totalTechnologies: detectedTechnologies.length,
    versionKnownCount,
    versionUnknownCount: Math.max(0, detectedTechnologies.length - versionKnownCount),
    highPriorityCount,
    customerSummary: detectedTechnologies.length
      ? `${detectedTechnologies.length} technology signal(s) passed Deep Evidence Calibration V2. Exact-version CVE claims still require affected-version validation.`
      : "No technology fingerprint was strong enough for a customer-facing technology/CVE claim. Weak keyword-only matches were suppressed.",
    developerActions,
  };
}
