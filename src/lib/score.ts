import type { ScanFinding, ScanReport } from "./scanner";
import { isUncertainFindingMessage, type FindingTruth } from "./scan-truth";

export type EnhancedFinding = ScanFinding & {
  category: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  businessImpact: string;
  fixRecommendation: string;
  truth: FindingTruth;
  scoreScope: "security" | "supplemental";
};

type CategoryScore = {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: "A" | "B" | "C" | "D" | "F";
  scoreScope: "security" | "supplemental";
  evidenceCount: number;
};

const SUPPLEMENTAL_CATEGORIES = new Set([
  "Email security",
  "Website hygiene",
  "Trust and privacy",
  "Attack surface visibility",
]);

function getCategory(finding: ScanFinding) {
  if (finding.name === "Common admin/login paths") {
    return "Attack surface visibility";
  }
  if (finding.name.includes("MX") || finding.name.includes("SPF") || finding.name.includes("DMARC")) {
    return "Email security";
  }
  if (
    finding.name.includes("Sensitive") ||
    finding.name.includes("Mixed content") ||
    finding.name.includes("Cookie")
  ) {
    return "Exposure risk";
  }
  if (
    finding.name.includes("robots") ||
    finding.name.includes("sitemap") ||
    finding.name.includes("security.txt")
  ) {
    return "Website hygiene";
  }
  if (
    finding.name.includes("HTTPS") ||
    finding.name.includes("SSL") ||
    finding.name.includes("HSTS") ||
    finding.name.includes("Security headers") ||
    finding.name.includes("Server technology")
  ) {
    return "Website security";
  }
  if (
    finding.name.includes("Privacy") ||
    finding.name.includes("Terms") ||
    finding.name.includes("Contact")
  ) {
    return "Trust and privacy";
  }
  return "General";
}

function getGrade(percentage: number): "A" | "B" | "C" | "D" | "F" {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 65) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

function explicitTruth(finding: ScanFinding): FindingTruth | null {
  const value = (finding as ScanFinding & { truth?: unknown }).truth;
  return value === "verified" || value === "inconclusive" || value === "not-applicable"
    ? value
    : null;
}

function getTruth(finding: ScanFinding): FindingTruth {
  const explicit = explicitTruth(finding);
  if (explicit) return explicit;
  if (isUncertainFindingMessage(finding.message)) return "inconclusive";

  // Reachability alone is not enough evidence for these findings. A warning or
  // failure remains inconclusive until a stronger truth policy attaches proof.
  if (
    (finding.name === "Sensitive public files" ||
      finding.name === "Common admin/login paths") &&
    finding.status !== "pass"
  ) {
    return "inconclusive";
  }

  return "verified";
}

function getSeverity(finding: ScanFinding, truth: FindingTruth): EnhancedFinding["severity"] {
  if (truth !== "verified" || finding.status === "pass") return "Info";
  if (finding.name === "Common admin/login paths") return "Info";

  const lostPoints = finding.maxPoints - finding.points;
  const lossPercentage = finding.maxPoints > 0 ? Math.round((lostPoints / finding.maxPoints) * 100) : 0;

  if (finding.name.includes("Sensitive public files")) return "Critical";
  if (
    finding.name.includes("Privacy") ||
    finding.name.includes("Terms") ||
    finding.name.includes("Contact") ||
    finding.name.includes("robots") ||
    finding.name.includes("sitemap") ||
    finding.name.includes("security.txt") ||
    finding.name.includes("Server technology")
  ) {
    return finding.status === "fail" ? "Medium" : "Low";
  }
  if (
    finding.name.includes("DMARC record") ||
    finding.name.includes("SSL certificate") ||
    finding.name.includes("HTTPS")
  ) {
    return finding.status === "fail" ? "High" : "Medium";
  }
  if (finding.status === "fail" && lossPercentage >= 70) return "High";
  if (finding.status === "warning" || lossPercentage >= 40) return "Medium";
  return "Low";
}

function getBusinessImpact(finding: ScanFinding, truth: FindingTruth) {
  if (truth === "inconclusive") {
    return "This check did not produce enough reliable evidence to make a security claim or score penalty.";
  }
  if (truth === "not-applicable") {
    return "This check is supplemental or not applicable to the scanned target and does not affect the Security Score.";
  }
  if (finding.name === "Common admin/login paths") {
    return "Public login or administration route visibility is an attack-surface observation only; visibility by itself does not prove a vulnerability.";
  }
  if (finding.name.includes("HTTPS")) return "Transport weaknesses can expose visitor traffic or create browser trust warnings.";
  if (finding.name.includes("SSL certificate")) return "Certificate problems can break secure access and customer trust.";
  if (finding.name.includes("Security headers")) return "Missing browser controls can increase exposure to browser-side attack techniques.";
  if (finding.name.includes("Sensitive public files")) return "Verified exposed configuration or backup content can disclose secrets or internal data.";
  if (finding.name.includes("Cookie")) return "Weak cookie flags can increase session-handling risk.";
  if (finding.name.includes("DMARC") || finding.name.includes("SPF")) return "Email-domain controls reduce spoofing and brand-abuse risk.";
  if (finding.name.includes("Privacy") || finding.name.includes("Terms")) return "This is a trust/governance signal rather than direct vulnerability evidence.";
  return "This observed control can affect website security, reliability, or customer trust.";
}

function getFixRecommendation(finding: ScanFinding, truth: FindingTruth) {
  if (truth === "inconclusive") return "Retry from a representative public response or review the evidence manually before making a finding claim.";
  if (truth === "not-applicable") return "Review this supplemental check against the correct organizational domain or business context if needed.";
  if (finding.name === "Common admin/login paths") {
    return "Do not hide or rename a legitimate login route solely for scoring. Protect authentication with strong access controls, rate limiting and MFA where appropriate.";
  }
  if (finding.status === "pass") return "No immediate fix required. Continue monitoring this verified control.";
  if (finding.name.includes("Sensitive public files")) return "Remove the verified exposed file, rotate any affected secrets, and block sensitive paths at the origin.";
  if (finding.name.includes("Security headers")) return "Add and test CSP, frame protection, X-Content-Type-Options and Referrer-Policy as appropriate.";
  if (finding.name.includes("SSL certificate")) return "Install or renew a trusted certificate and verify hostname/chain validity.";
  if (finding.name.includes("HTTPS")) return "Serve the site over trusted HTTPS and redirect HTTP to HTTPS.";
  if (finding.name.includes("HSTS")) return "After HTTPS is stable, configure Strict-Transport-Security with an appropriate max-age.";
  if (finding.name.includes("Cookie")) return "Use Secure and HttpOnly on sensitive cookies and set an appropriate SameSite policy.";
  if (finding.name.includes("DMARC")) return "Configure DMARC for the organizational email domain and strengthen policy after monitoring.";
  if (finding.name.includes("SPF")) return "Publish an SPF record for the organizational email domain and authorized senders.";
  return "Review the verified evidence with a developer or security professional and remediate the affected control.";
}

function enhanceFindings(findings: ScanFinding[]): EnhancedFinding[] {
  return findings.map((finding) => {
    const category = getCategory(finding);
    const truth = getTruth(finding);
    const scoreScope = SUPPLEMENTAL_CATEGORIES.has(category) ? "supplemental" : "security";
    const normalizedFinding: ScanFinding =
      truth === "inconclusive"
        ? {
            ...finding,
            status: "warning",
            message: `${finding.name} could not be verified from a representative application response. No score penalty was applied.`,
          }
        : finding;

    return {
      ...normalizedFinding,
      category,
      truth,
      scoreScope,
      severity: getSeverity(normalizedFinding, truth),
      businessImpact: getBusinessImpact(normalizedFinding, truth),
      fixRecommendation: getFixRecommendation(normalizedFinding, truth),
    };
  });
}

function categoryScores(findings: EnhancedFinding[]): CategoryScore[] {
  const verified = findings.filter((finding) => finding.truth === "verified" && finding.maxPoints > 0);
  const map = new Map<string, { score: number; maxScore: number; scope: "security" | "supplemental"; count: number }>();
  for (const finding of verified) {
    const current = map.get(finding.category) || {
      score: 0,
      maxScore: 0,
      scope: finding.scoreScope,
      count: 0,
    };
    current.score += finding.points;
    current.maxScore += finding.maxPoints;
    current.count += 1;
    map.set(finding.category, current);
  }
  return [...map.entries()].map(([name, value]) => {
    const percentage = value.maxScore ? Math.round((value.score / value.maxScore) * 100) : 0;
    return {
      name,
      score: value.score,
      maxScore: value.maxScore,
      percentage,
      grade: getGrade(percentage),
      scoreScope: value.scope,
      evidenceCount: value.count,
    };
  });
}

export function calculateScore(report: ScanReport) {
  const enhancedFindings = enhanceFindings(report.findings);
  const canonical = enhancedFindings.filter(
    (finding) => finding.scoreScope === "security" && finding.truth === "verified" && finding.maxPoints > 0,
  );
  const canonicalInconclusive = enhancedFindings.filter(
    (finding) => finding.scoreScope === "security" && finding.truth === "inconclusive",
  );
  const rawScore = canonical.reduce((sum, finding) => sum + finding.points, 0);
  const maxScore = canonical.reduce((sum, finding) => sum + finding.maxPoints, 0);
  const score = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const actionableCanonical = canonical.filter((finding) => finding.status !== "pass");

  const severityCounts = {
    critical: actionableCanonical.filter((finding) => finding.severity === "Critical").length,
    high: actionableCanonical.filter((finding) => finding.severity === "High").length,
    medium: actionableCanonical.filter((finding) => finding.severity === "Medium").length,
    low: actionableCanonical.filter((finding) => finding.severity === "Low").length,
    info: canonical.filter((finding) => finding.severity === "Info").length,
  };

  let riskLevel: "Low" | "Medium" | "High" = "Medium";
  let executiveSummary =
    "The scan did not collect enough verified security evidence for a low-risk conclusion. Inconclusive checks are excluded from score penalties and should be retried or reviewed.";

  if (severityCounts.critical > 0 || severityCounts.high > 0 || (maxScore > 0 && score < 50)) {
    riskLevel = "High";
    executiveSummary =
      "Verified security evidence includes a high-impact issue or substantial control weakness. Fix the highest-priority verified issue first.";
  } else if (severityCounts.medium > 0 || canonicalInconclusive.length > 0 || score < 80 || maxScore === 0) {
    riskLevel = "Medium";
    executiveSummary = canonicalInconclusive.length
      ? `Verified controls are partially healthy, but ${canonicalInconclusive.length} security check(s) were inconclusive and were excluded from score penalties. Resolve those evidence gaps before treating the posture as low risk.`
      : "Verified security evidence shows one or more medium-impact weaknesses or an incomplete control baseline. Address them before treating the posture as low risk.";
  } else {
    riskLevel = "Low";
    executiveSummary =
      "Verified security controls passed most applicable checks with no confirmed medium, high, or critical issue in this safe public scope. Continue monitoring; this is not a penetration-test certification.";
  }

  const allCategoryScores = categoryScores(enhancedFindings);
  const verifiedActionable = enhancedFindings.filter(
    (finding) =>
      finding.scoreScope === "security" &&
      finding.truth === "verified" &&
      finding.status !== "pass",
  );
  const severityWeight = { Critical: 5, High: 4, Medium: 3, Low: 2, Info: 1 } as const;
  const topFixes = verifiedActionable
    .sort((a, b) =>
      severityWeight[b.severity] - severityWeight[a.severity] ||
      b.maxPoints - b.points - (a.maxPoints - a.points),
    )
    .slice(0, 10)
    .map((finding) => ({
      name: finding.name,
      message: finding.message,
      lostPoints: finding.maxPoints - finding.points,
      priority: `${finding.severity} priority`,
      severity: finding.severity,
      category: finding.category,
      scoreScope: finding.scoreScope,
      businessImpact: finding.businessImpact,
      fixRecommendation: finding.fixRecommendation,
    }));

  return {
    version: "security-score-v2",
    score,
    rawScore,
    maxScore,
    riskLevel,
    summary: executiveSummary,
    executiveSummary,
    scoreConfidence:
      canonicalInconclusive.length === 0 && canonical.length >= 4 ? "high" : "limited",
    securityEvidenceCount: canonical.length,
    inconclusiveChecks: canonicalInconclusive.map((finding) => finding.name),
    supplementalScores: allCategoryScores.filter((item) => item.scoreScope === "supplemental"),
    categoryScores: allCategoryScores,
    severityCounts,
    passedChecks: canonical.filter((finding) => finding.status === "pass").length,
    warningChecks: actionableCanonical.filter((finding) => finding.status === "warning").length,
    failedChecks: actionableCanonical.filter((finding) => finding.status === "fail").length,
    enhancedFindings,
    topFixes,
  };
}
