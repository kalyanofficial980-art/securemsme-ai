import type { ScanFinding, ScanReport } from "./scanner";

export type EnhancedFinding = ScanFinding & {
  category: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  businessImpact: string;
  fixRecommendation: string;
};

type CategoryScore = {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: "A" | "B" | "C" | "D" | "F";
};

function getCategory(finding: ScanFinding) {
  if (
    finding.name.includes("MX") ||
    finding.name.includes("SPF") ||
    finding.name.includes("DMARC")
  ) {
    return "Email security";
  }

  if (
    finding.name.includes("Sensitive") ||
    finding.name.includes("Mixed content") ||
    finding.name.includes("Cookie") ||
    finding.name.includes("admin")
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

function getSeverity(finding: ScanFinding): EnhancedFinding["severity"] {
  const lostPoints = finding.maxPoints - finding.points;
  const lossPercentage =
    finding.maxPoints > 0
      ? Math.round((lostPoints / finding.maxPoints) * 100)
      : 0;

  if (finding.status === "pass") return "Info";

  if (finding.name.toLowerCase().includes("admin")) {
    if (finding.status === "fail") return "Medium";
    if (finding.status === "warning") return "Low";
    return "Info";
  }

  if (finding.name.includes("Sensitive public files")) {
    return "Critical";
  }

  if (
    finding.name.includes("DMARC record") ||
    finding.name.includes("SSL certificate") ||
    finding.name.includes("HTTPS")
  ) {
    return finding.status === "fail" ? "High" : "Medium";
  }

  if (finding.status === "fail" && lossPercentage >= 70) {
    return "High";
  }

  if (finding.status === "warning" || lossPercentage >= 40) {
    return "Medium";
  }

  return "Low";
}

function getBusinessImpact(finding: ScanFinding) {
  if (finding.name.includes("HTTPS")) {
    return "Visitors may see trust warnings, and customers may avoid submitting forms or payments.";
  }

  if (finding.name.includes("SSL certificate")) {
    return "Expired or weak certificate setup can break customer trust and make the website appear unsafe.";
  }

  if (finding.name.includes("HTTP to HTTPS")) {
    return "Some visitors may reach the insecure version of the website before being protected.";
  }

  if (finding.name.includes("Security headers")) {
    return "Missing browser safety headers can increase exposure to clickjacking, content injection, and browser-side attacks.";
  }

  if (finding.name.includes("HSTS")) {
    return "Without HSTS, browsers may not automatically prefer HTTPS for repeat visitors.";
  }

  if (finding.name.includes("Server technology")) {
    return "Exposed server details can help attackers fingerprint the technology stack.";
  }

  if (finding.name.includes("MX records")) {
    return "Missing mail records can affect business email reliability and customer communication.";
  }

  if (finding.name.includes("SPF")) {
    return "Without SPF, attackers may spoof your domain in fake emails more easily.";
  }

  if (finding.name.includes("DMARC")) {
    return "Weak or missing DMARC allows fake emails to abuse your business domain identity.";
  }

  if (finding.name.includes("Sensitive public files")) {
    return "Public sensitive files can expose secrets, backups, or configuration data.";
  }

  if (finding.name.includes("Mixed content")) {
    return "HTTP resources inside an HTTPS page can reduce browser trust and create security warnings.";
  }

  if (finding.name.includes("Cookie")) {
    return "Weak cookie settings can increase risk for session theft or insecure browser storage.";
  }

  if (finding.name.includes("Privacy")) {
    return "Missing privacy policy can reduce customer trust and create compliance risk.";
  }

  if (finding.name.includes("Terms")) {
    return "Missing terms page can create unclear rules for users, refunds, and service responsibilities.";
  }

  if (finding.name.includes("Contact")) {
    return "Missing contact page reduces trust and makes it harder for customers to reach the business.";
  }

  if (finding.name.includes("security.txt")) {
    return "Without security.txt, ethical researchers may not know how to report security issues safely.";
  }

  if (finding.name.includes("admin")) {
    return "Public admin/login paths can increase automated attack attempts against the website.";
  }

  return "This issue can reduce website trust, reliability, or security posture.";
}

function getFixRecommendation(finding: ScanFinding) {
  if (finding.status === "pass") {
    return "No immediate fix required. Continue monitoring this check regularly.";
  }

  if (finding.name.includes("HTTPS")) {
    return "Install a valid SSL certificate and force all traffic to HTTPS.";
  }

  if (finding.name.includes("SSL certificate")) {
    return "Renew the SSL certificate and enable automatic renewal if possible.";
  }

  if (finding.name.includes("HTTP to HTTPS")) {
    return "Configure a permanent 301 redirect from HTTP to HTTPS.";
  }

  if (finding.name.includes("Security headers")) {
    return "Ask your developer to add CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers.";
  }

  if (finding.name.includes("HSTS")) {
    return "After HTTPS is stable, add Strict-Transport-Security header with a safe max-age value.";
  }

  if (finding.name.includes("Server technology")) {
    return "Hide or minimize Server and X-Powered-By headers in your web server/app settings.";
  }

  if (finding.name.includes("MX records")) {
    return "Configure mail exchange records using your business email provider.";
  }

  if (finding.name.includes("SPF")) {
    return "Add a TXT record beginning with v=spf1 for your authorized email providers.";
  }

  if (finding.name.includes("DMARC record")) {
    return "Add a _dmarc TXT record. Start with p=none for monitoring, then move to quarantine/reject.";
  }

  if (finding.name.includes("DMARC policy strength")) {
    return "After monitoring email reports, strengthen DMARC policy from p=none to quarantine or reject.";
  }

  if (finding.name.includes("robots")) {
    return "Add a robots.txt file at the website root.";
  }

  if (finding.name.includes("sitemap")) {
    return "Add sitemap.xml and submit it to search engines.";
  }

  if (finding.name.includes("security.txt")) {
    return "Add /.well-known/security.txt with a responsible security contact email.";
  }

  if (finding.name.includes("Sensitive public files")) {
    return "Remove exposed backup/config files and block access to sensitive paths at server level.";
  }

  if (finding.name.includes("Mixed content")) {
    return "Replace HTTP asset links with HTTPS versions.";
  }

  if (finding.name.includes("Cookie")) {
    return "Set Secure and HttpOnly flags on important cookies.";
  }

  if (finding.name.includes("Privacy")) {
    return "Create a privacy policy page explaining what data is collected and how it is used.";
  }

  if (finding.name.includes("Terms")) {
    return "Create a terms and conditions page for service rules and responsibilities.";
  }

  if (finding.name.includes("Contact")) {
    return "Add a contact page with email, phone, or business enquiry form.";
  }

  if (finding.name.includes("admin")) {
    return "Avoid exposing predictable admin paths. Add strong authentication and rate limiting.";
  }

  return "Ask a developer or security professional to review and fix this item.";
}

function enhanceFindings(findings: ScanFinding[]): EnhancedFinding[] {
  return findings.map((finding) => ({
    ...finding,
    category: getCategory(finding),
    severity: getSeverity(finding),
    businessImpact: getBusinessImpact(finding),
    fixRecommendation: getFixRecommendation(finding),
  }));
}

export function calculateScore(report: ScanReport) {
  const enhancedFindings = enhanceFindings(report.findings);

  const score = enhancedFindings.reduce(
    (total, finding) => total + finding.points,
    0,
  );

  const maxScore = enhancedFindings.reduce(
    (total, finding) => total + finding.maxPoints,
    0,
  );

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  let riskLevel: "Low" | "Medium" | "High" = "High";
  let executiveSummary =
    "This website has important security, email, exposure, or trust gaps that should be fixed soon.";

  if (percentage >= 80) {
    riskLevel = "Low";
    executiveSummary =
      "This website passed most public security, email, exposure, and trust checks. Continue monitoring regularly.";
  } else if (percentage >= 50) {
    riskLevel = "Medium";
    executiveSummary =
      "This website has some security, email, exposure, or trust gaps. Fixing the top issues can improve customer trust and reduce basic risk.";
  }

  const categoryMap = new Map<string, { score: number; maxScore: number }>();

  for (const finding of enhancedFindings) {
    const existing = categoryMap.get(finding.category) ?? {
      score: 0,
      maxScore: 0,
    };

    existing.score += finding.points;
    existing.maxScore += finding.maxPoints;

    categoryMap.set(finding.category, existing);
  }

  const categoryScores: CategoryScore[] = Array.from(categoryMap.entries()).map(
    ([name, value]) => {
      const categoryPercentage =
        value.maxScore > 0
          ? Math.round((value.score / value.maxScore) * 100)
          : 0;

      return {
        name,
        score: value.score,
        maxScore: value.maxScore,
        percentage: categoryPercentage,
        grade: getGrade(categoryPercentage),
      };
    },
  );

  const severityCounts = {
    critical: enhancedFindings.filter(
      (finding) => finding.severity === "Critical",
    ).length,
    high: enhancedFindings.filter((finding) => finding.severity === "High")
      .length,
    medium: enhancedFindings.filter((finding) => finding.severity === "Medium")
      .length,
    low: enhancedFindings.filter((finding) => finding.severity === "Low")
      .length,
    info: enhancedFindings.filter((finding) => finding.severity === "Info")
      .length,
  };

  const failedChecks = enhancedFindings.filter(
    (finding) => finding.status === "fail",
  ).length;

  const warningChecks = enhancedFindings.filter(
    (finding) => finding.status === "warning",
  ).length;

  const passedChecks = enhancedFindings.filter(
    (finding) => finding.status === "pass",
  ).length;

  const topFixes = enhancedFindings
    .filter((finding) => finding.status !== "pass")
    .sort((a, b) => {
      const severityWeight = {
        Critical: 5,
        High: 4,
        Medium: 3,
        Low: 2,
        Info: 1,
      };

      return (
        severityWeight[b.severity] - severityWeight[a.severity] ||
        b.maxPoints - b.points - (a.maxPoints - a.points)
      );
    })
    .slice(0, 10)
    .map((finding) => ({
      name: finding.name,
      message: finding.message,
      lostPoints: finding.maxPoints - finding.points,
      priority:
        finding.severity === "Critical"
          ? "Critical priority"
          : finding.severity === "High"
            ? "High priority"
            : "Medium priority",
      severity: finding.severity,
      businessImpact: finding.businessImpact,
      fixRecommendation: finding.fixRecommendation,
    }));

  return {
    score: percentage,
    rawScore: score,
    maxScore,
    riskLevel,
    summary: executiveSummary,
    executiveSummary,
    categoryScores,
    severityCounts,
    passedChecks,
    warningChecks,
    failedChecks,
    enhancedFindings,
    topFixes,
  };
}
