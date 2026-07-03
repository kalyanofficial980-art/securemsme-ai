export type ReportFinding = {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  points: number;
  maxPoints: number;
  category?: string;
  severity?: "Critical" | "High" | "Medium" | "Low" | "Info";
  businessImpact?: string;
  fixRecommendation?: string;
};

export type CategoryScore = {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade?: string;
};

export type TopFix = {
  name: string;
  message: string;
  lostPoints: number;
  priority?: string;
  severity?: string;
  businessImpact?: string;
  fixRecommendation?: string;
};

export type SeverityCounts = {
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  info?: number;
};

export type ReportJson = {
  summary?: string;
  executiveSummary?: string;
  findings?: ReportFinding[];
  categoryScores?: CategoryScore[];
  topFixes?: TopFix[];
  severityCounts?: SeverityCounts;
  passedChecks?: number;
  warningChecks?: number;
  failedChecks?: number;
  raw?: {
    finalStatus?: number;
    responseTimeMs?: number;
    ssl?: {
      validTo?: string;
      daysRemaining?: number;
      issuer?: string;
    };
    emailSecurity?: {
      domain?: string;
      mxRecords?: string[];
      spfRecord?: string;
      dmarcRecord?: string;
      dmarcPolicy?: string;
    };
    hygiene?: {
      robotsTxt?: boolean;
      sitemapXml?: boolean;
      securityTxt?: boolean;
      mixedContentCount?: number;
      cookieCount?: number;
      insecureCookieCount?: number;
    };
  };
};

export type ScanReportRecord = {
  id: string;
  website_url: string;
  score: number;
  risk_level: string;
  report: ReportJson;
  created_at: string;
};

export function getFindings(report: ReportJson) {
  return report.findings ?? [];
}

export function getTopFixes(report: ReportJson) {
  return report.topFixes ?? [];
}

export function getCategoryScores(report: ReportJson) {
  return report.categoryScores ?? [];
}

export function getSeverityCounts(report: ReportJson) {
  return {
    critical: report.severityCounts?.critical ?? 0,
    high: report.severityCounts?.high ?? 0,
    medium: report.severityCounts?.medium ?? 0,
    low: report.severityCounts?.low ?? 0,
    info: report.severityCounts?.info ?? 0,
  };
}

export function getReportTitle(scan: ScanReportRecord) {
  try {
    const url = new URL(scan.website_url);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return scan.website_url;
  }
}

export function getScoreGrade(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function getBusinessRiskText(riskLevel: string) {
  if (riskLevel === "Low") {
    return "Low risk means the website passed most public checks. This does not guarantee full security, but it shows a healthy public security posture.";
  }

  if (riskLevel === "Medium") {
    return "Medium risk means the website has visible gaps that may reduce trust or increase basic exposure. Fix the top issues first.";
  }

  return "High risk means the website has important public security, email, exposure, or trust gaps. These should be reviewed quickly.";
}

export function getSafeFileName(input: string) {
  return input
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}
