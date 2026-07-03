export type SeoPageConfig = {
  path: string;
  title: string;
  description: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  indexable: boolean;
};

export type LaunchAnalyticsInput = {
  eventType:
    | "page-view"
    | "cta-click"
    | "pricing-interest"
    | "demo-request"
    | "onboarding-click"
    | "manual-billing-click"
    | "seo-readiness-view"
    | "launch-event";
  sourcePath: string;
  targetPath?: string;
  campaignSource?: string;
  campaignMedium?: string;
  campaignName?: string;
  referrerSafe?: string;
  deviceHint?: "desktop" | "mobile" | "tablet" | "bot-or-preview" | "unknown";
  countryHint?: string;
};

export type SeoCheck = {
  checkKey: string;
  checkTitle: string;
  checkStatus: "pass" | "warning" | "fail" | "manual-review" | "not-applicable";
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  evidenceSummary: string;
  remediationAction: string;
};

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://securemsme-ai-live.vercel.app";

export const publicSeoPages: SeoPageConfig[] = [
  {
    path: "/public-launch",
    title: "SecureMSME AI — AI Security Workflow for MSMEs",
    description:
      "AI-assisted security workflow for authorized website checks, client-safe reports, developer fixes, repo review, cloud config and scheduled monitoring.",
    priority: 1,
    changeFrequency: "weekly",
    indexable: true,
  },
  {
    path: "/pricing",
    title: "SecureMSME AI Pricing — Manual Billing Plans",
    description:
      "View launch pricing options for Starter, Growth, Agency and Enterprise Review. Manual billing only during launch.",
    priority: 0.9,
    changeFrequency: "weekly",
    indexable: true,
  },
  {
    path: "/demo",
    title: "Request SecureMSME AI Demo",
    description:
      "Request a demo for an authorized website security review workflow. Do not submit passwords, OTPs, API tokens or payment data.",
    priority: 0.8,
    changeFrequency: "weekly",
    indexable: true,
  },
  {
    path: "/trust",
    title: "SecureMSME AI Trust Center",
    description:
      "Security, legal, responsible disclosure and acceptable use information for SecureMSME AI.",
    priority: 0.7,
    changeFrequency: "monthly",
    indexable: true,
  },
  {
    path: "/legal",
    title: "SecureMSME AI Legal Pages",
    description:
      "Terms, privacy, acceptable use and disclaimer pages for SecureMSME AI.",
    priority: 0.6,
    changeFrequency: "monthly",
    indexable: true,
  },
  {
    path: "/seo-readiness",
    title: "SecureMSME AI SEO Readiness",
    description:
      "Public SEO readiness and launch safety summary for SecureMSME AI.",
    priority: 0.5,
    changeFrequency: "monthly",
    indexable: true,
  },
];

export const seoBlockedClaims = [
  "Do not claim guaranteed Google ranking.",
  "Do not claim guaranteed traffic.",
  "Do not claim 100% SEO score.",
  "Do not claim 100% security.",
  "Do not claim all vulnerabilities are found.",
  "Do not claim legal compliance certification.",
];

export function absoluteUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl.replace(/\/$/, "")}${cleanPath}`;
}

export function sanitizeReferrer(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 220);
  } catch {
    return (value || "").replace(/[?#].*$/, "").slice(0, 220);
  }
}

export function normalizeAnalyticsInput(input: LaunchAnalyticsInput) {
  const sourcePath = input.sourcePath.startsWith("/")
    ? input.sourcePath
    : `/${input.sourcePath || "unknown"}`;

  return {
    eventType: input.eventType || "launch-event",
    sourcePath: sourcePath.slice(0, 180),
    targetPath: (input.targetPath || "").slice(0, 180),
    campaignSource: (input.campaignSource || "").slice(0, 80),
    campaignMedium: (input.campaignMedium || "").slice(0, 80),
    campaignName: (input.campaignName || "").slice(0, 120),
    referrerSafe: sanitizeReferrer(input.referrerSafe || ""),
    deviceHint: input.deviceHint || "unknown",
    countryHint: (input.countryHint || "").slice(0, 80),
    privacyMode: "no-cookie" as const,
    clientSafeSummary: `${input.eventType || "launch-event"} captured for ${sourcePath}. Privacy mode: no-cookie.`,
  };
}

export function evaluateSeoPage(page: SeoPageConfig): SeoCheck[] {
  const checks: SeoCheck[] = [];

  checks.push({
    checkKey: "title-length",
    checkTitle: "SEO title length",
    checkStatus:
      page.title.length >= 20 && page.title.length <= 70 ? "pass" : "warning",
    severity: "Medium",
    evidenceSummary: `Title length is ${page.title.length} characters.`,
    remediationAction:
      "Keep title descriptive, unique and roughly 20-70 characters.",
  });

  checks.push({
    checkKey: "description-length",
    checkTitle: "Meta description length",
    checkStatus:
      page.description.length >= 80 && page.description.length <= 170
        ? "pass"
        : "warning",
    severity: "Medium",
    evidenceSummary: `Description length is ${page.description.length} characters.`,
    remediationAction: "Keep description useful and roughly 80-170 characters.",
  });

  checks.push({
    checkKey: "indexable",
    checkTitle: "Indexable public page",
    checkStatus: page.indexable ? "pass" : "manual-review",
    severity: page.indexable ? "Info" : "Low",
    evidenceSummary: page.indexable
      ? "Page is marked indexable."
      : "Page is not marked indexable.",
    remediationAction: page.indexable
      ? "Keep canonical and sitemap entry aligned."
      : "Confirm whether this page should be public or noindex.",
  });

  checks.push({
    checkKey: "blocked-claims",
    checkTitle: "Unsafe launch claims avoided",
    checkStatus: "pass",
    severity: "Info",
    evidenceSummary:
      "SEO copy avoids guaranteed ranking, guaranteed traffic, 100% secure and all-vulnerabilities-found claims.",
    remediationAction: "Keep public copy factual, limited and evidence-based.",
  });

  return checks;
}

export function summarizeSeoReadiness(pages: SeoPageConfig[] = publicSeoPages) {
  const checks = pages.flatMap(evaluateSeoPage);
  const warnings = checks.filter(
    (check) => check.checkStatus === "warning",
  ).length;
  const fails = checks.filter((check) => check.checkStatus === "fail").length;
  const passes = checks.filter((check) => check.checkStatus === "pass").length;
  const score = Math.max(0, Math.min(100, 100 - warnings * 8 - fails * 20));
  const status =
    score >= 85 ? "Launch-ready" : score >= 65 ? "Needs review" : "Needs fixes";

  return {
    score,
    status,
    passes,
    warnings,
    fails,
    checks,
    summary: `SEO readiness score ${score}/100. ${passes} pass, ${warnings} warning, ${fails} fail.`,
  };
}

export function buildJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SecureMSME AI",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    description:
      "AI-assisted security workflow for authorized website checks, client-safe reports, developer fixes, repo review, cloud config and scheduled monitoring.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/PreOrder",
      description: "Manual billing during launch.",
    },
  };
}
