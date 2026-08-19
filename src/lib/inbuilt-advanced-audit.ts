import { safeFetchPublicUrl } from "@/lib/security/ssrf";
export type InbuiltAuditStatus = "pass" | "warning" | "fail" | "info";
export type InbuiltAuditSeverity =
  "Critical" | "High" | "Medium" | "Low" | "Info";

export type InbuiltEvidence = {
  id: string;
  module: string;
  title: string;
  url: string;
  status: InbuiltAuditStatus;
  severity: InbuiltAuditSeverity;
  evidence: string;
  customerImpact: string;
  fix: string;
};

export type InbuiltAuditModule = {
  id: string;
  name: string;
  score: number;
  status: InbuiltAuditStatus;
  evidenceCount: number;
  summary: string;
};

export type InbuiltAdvancedAudit = {
  version: string;
  generatedAt: string;
  auditType: "inbuilt-passive-advanced";
  scannedUrl: string;
  customerFriendlyName: string;
  overallScore: number;
  maturityLevel: "Weak" | "Basic" | "Good" | "Strong" | "Advanced";
  businessReadiness:
    | "Not customer ready"
    | "Needs improvement"
    | "Customer demo ready"
    | "Trust ready"
    | "Premium ready";
  modules: InbuiltAuditModule[];
  evidence: InbuiltEvidence[];
  customerSummary: string;
  priorityFixes: string[];
  safeTestingNotice: string[];
};

type FetchResult = {
  url: string;
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  body: string;
  error?: string;
};

const MAX_BODY_CHARS = 500_000;

function normalizeUrl(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Website URL is required.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const url = new URL(withProtocol);
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function sameOriginUrl(base: string, path: string) {
  const baseUrl = new URL(base);
  return `${baseUrl.origin}${path}`;
}

function getHeader(headers: Record<string, string>, key: string) {
  return headers[key.toLowerCase()] || "";
}

function toHeaderMap(headers: Headers): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach((value, key) => {
    map[key.toLowerCase()] = value;
  });
  return map;
}

async function safeFetch(
  url: string,
): Promise<FetchResult> {
  try {
    const response = await safeFetchPublicUrl(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "VeyraSec-Inbuilt-Audit/1.0",
        Accept:
          "text/html,text/plain,application/xml,application/json,*/*;q=0.8",
      },
    });

    const contentType =
      response.headers.get("content-type") || "";

    let body = "";

    if (
      contentType.includes("text") ||
      contentType.includes("html") ||
      contentType.includes("json") ||
      contentType.includes("xml") ||
      contentType === ""
    ) {
      body = (await response.text()).slice(
        0,
        MAX_BODY_CHARS,
      );
    }

    return {
      url,
      ok: response.ok,
      status: response.status,
      headers: toHeaderMap(response.headers),
      body,
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: 0,
      headers: {},
      body: "",
      error:
        error instanceof Error
          ? error.message
          : "Fetch failed",
    };
  }
}

function evidence(
  input: Omit<InbuiltEvidence, "id">,
  index: number,
): InbuiltEvidence {
  return {
    id: `IB-${String(index + 1).padStart(3, "0")}`,
    ...input,
  };
}

function severityWeight(severity: InbuiltAuditSeverity) {
  if (severity === "Critical") return 22;
  if (severity === "High") return 16;
  if (severity === "Medium") return 9;
  if (severity === "Low") return 4;
  return 0;
}

function moduleScore(items: InbuiltEvidence[]) {
  const penalty = items.reduce(
    (total, item) => total + severityWeight(item.severity),
    0,
  );
  return Math.max(0, Math.min(100, 100 - penalty));
}

function moduleStatus(score: number): InbuiltAuditStatus {
  if (score >= 85) return "pass";
  if (score >= 65) return "warning";
  if (score >= 1) return "fail";
  return "fail";
}

function maturity(score: number): InbuiltAdvancedAudit["maturityLevel"] {
  if (score >= 92) return "Advanced";
  if (score >= 84) return "Strong";
  if (score >= 72) return "Good";
  if (score >= 55) return "Basic";
  return "Weak";
}

function readiness(score: number): InbuiltAdvancedAudit["businessReadiness"] {
  if (score >= 92) return "Premium ready";
  if (score >= 84) return "Trust ready";
  if (score >= 72) return "Customer demo ready";
  if (score >= 55) return "Needs improvement";
  return "Not customer ready";
}

export function analyzeInbuiltSignals(input: {
  scannedUrl: string;
  home: FetchResult;
  robots: FetchResult;
  sitemap: FetchResult;
  securityTxt: FetchResult;
  privacy: FetchResult;
  terms: FetchResult;
  contact: FetchResult;
}): InbuiltAdvancedAudit {
  const evidenceItems: InbuiltEvidence[] = [];
  let index = 0;

  const add = (item: Omit<InbuiltEvidence, "id">) => {
    evidenceItems.push(evidence(item, index));
    index += 1;
  };

  const url = input.scannedUrl;
  const urlObject = new URL(url);
  const isHttps = urlObject.protocol === "https:";
  const html = input.home.body || "";
  const lowerHtml = html.toLowerCase();

  if (isHttps) {
    add({
      module: "Transport Security",
      title: "HTTPS enabled",
      url,
      status: "pass",
      severity: "Info",
      evidence: "Website uses HTTPS.",
      customerImpact:
        "Customers can access the website over encrypted connection.",
      fix: "Keep HTTPS enabled and monitor certificate expiry.",
    });
  } else {
    add({
      module: "Transport Security",
      title: "HTTPS not enforced",
      url,
      status: "fail",
      severity: "High",
      evidence: "Website URL is not using HTTPS.",
      customerImpact:
        "Customers may see security warnings and data can be exposed in transit.",
      fix: "Install SSL/TLS certificate and redirect all HTTP traffic to HTTPS.",
    });
  }

  const hsts = getHeader(input.home.headers, "strict-transport-security");
  if (isHttps && hsts) {
    add({
      module: "Transport Security",
      title: "HSTS present",
      url,
      status: "pass",
      severity: "Info",
      evidence: `Strict-Transport-Security: ${hsts}`,
      customerImpact: "Browsers can remember to use HTTPS for future visits.",
      fix: "Maintain HSTS with an appropriate max-age.",
    });
  } else if (isHttps) {
    add({
      module: "Transport Security",
      title: "HSTS missing",
      url,
      status: "warning",
      severity: "Medium",
      evidence: "Strict-Transport-Security header not found.",
      customerImpact:
        "Users may be more exposed to downgrade/HTTP access risk.",
      fix: "Add Strict-Transport-Security header after confirming HTTPS works on all subdomains.",
    });
  }

  const csp = getHeader(input.home.headers, "content-security-policy");
  if (csp) {
    const weakCsp = csp.includes("unsafe-inline") || csp.includes("*");
    add({
      module: "Browser Protection",
      title: weakCsp
        ? "CSP present but weak"
        : "Content Security Policy present",
      url,
      status: weakCsp ? "warning" : "pass",
      severity: weakCsp ? "Medium" : "Info",
      evidence: `Content-Security-Policy: ${csp.slice(0, 220)}`,
      customerImpact: weakCsp
        ? "A weak CSP gives partial protection only."
        : "CSP helps reduce script injection and browser-side attack impact.",
      fix: weakCsp
        ? "Remove wildcards and unsafe-inline where possible."
        : "Maintain and test CSP while adding new scripts.",
    });
  } else {
    add({
      module: "Browser Protection",
      title: "Content Security Policy missing",
      url,
      status: "warning",
      severity: "Medium",
      evidence: "Content-Security-Policy header not found.",
      customerImpact:
        "Browser-side attacks such as script injection may have higher impact.",
      fix: "Add a practical CSP for scripts, styles, images, frames, and form actions.",
    });
  }

  const xFrame = getHeader(input.home.headers, "x-frame-options");
  const frameAncestors = csp.toLowerCase().includes("frame-ancestors");
  if (xFrame || frameAncestors) {
    add({
      module: "Browser Protection",
      title: "Clickjacking protection present",
      url,
      status: "pass",
      severity: "Info",
      evidence: xFrame
        ? `X-Frame-Options: ${xFrame}`
        : "CSP frame-ancestors directive found.",
      customerImpact:
        "Website has protection against being embedded in malicious frames.",
      fix: "Keep DENY/SAMEORIGIN or frame-ancestors configured.",
    });
  } else {
    add({
      module: "Browser Protection",
      title: "Clickjacking protection missing",
      url,
      status: "warning",
      severity: "Medium",
      evidence:
        "No X-Frame-Options header and no CSP frame-ancestors directive found.",
      customerImpact:
        "Attackers may be able to frame the website for clickjacking.",
      fix: "Add X-Frame-Options SAMEORIGIN or CSP frame-ancestors.",
    });
  }

  const nosniff = getHeader(input.home.headers, "x-content-type-options");
  if (nosniff.toLowerCase().includes("nosniff")) {
    add({
      module: "Browser Protection",
      title: "MIME sniffing protection present",
      url,
      status: "pass",
      severity: "Info",
      evidence: `X-Content-Type-Options: ${nosniff}`,
      customerImpact: "Browser MIME confusion risk is reduced.",
      fix: "Keep X-Content-Type-Options: nosniff.",
    });
  } else {
    add({
      module: "Browser Protection",
      title: "MIME sniffing protection missing",
      url,
      status: "warning",
      severity: "Low",
      evidence: "X-Content-Type-Options header not found.",
      customerImpact: "Some browsers may interpret files in unsafe ways.",
      fix: "Add X-Content-Type-Options: nosniff.",
    });
  }

  const referrer = getHeader(input.home.headers, "referrer-policy");
  if (referrer) {
    add({
      module: "Privacy Controls",
      title: "Referrer policy present",
      url,
      status: "pass",
      severity: "Info",
      evidence: `Referrer-Policy: ${referrer}`,
      customerImpact:
        "Website controls how much URL data leaks to external sites.",
      fix: "Use strict-origin-when-cross-origin or a stricter policy.",
    });
  } else {
    add({
      module: "Privacy Controls",
      title: "Referrer policy missing",
      url,
      status: "warning",
      severity: "Low",
      evidence: "Referrer-Policy header not found.",
      customerImpact:
        "Some page URL information may be shared with external sites.",
      fix: "Add Referrer-Policy: strict-origin-when-cross-origin.",
    });
  }

  const permissions = getHeader(input.home.headers, "permissions-policy");
  if (permissions) {
    add({
      module: "Privacy Controls",
      title: "Permissions policy present",
      url,
      status: "pass",
      severity: "Info",
      evidence: `Permissions-Policy: ${permissions.slice(0, 220)}`,
      customerImpact:
        "Browser features like camera, microphone, and location can be restricted.",
      fix: "Keep unused browser features disabled.",
    });
  } else {
    add({
      module: "Privacy Controls",
      title: "Permissions policy missing",
      url,
      status: "warning",
      severity: "Low",
      evidence: "Permissions-Policy header not found.",
      customerImpact:
        "Website does not explicitly restrict powerful browser features.",
      fix: "Add Permissions-Policy to disable unused browser APIs.",
    });
  }

  const server = getHeader(input.home.headers, "server");
  const poweredBy = getHeader(input.home.headers, "x-powered-by");
  if (server || poweredBy) {
    add({
      module: "Information Exposure",
      title: "Technology fingerprint visible",
      url,
      status: "warning",
      severity: "Low",
      evidence: `Server: ${server || "not set"}; X-Powered-By: ${poweredBy || "not set"}`,
      customerImpact:
        "Visible technology details can help attackers choose targeted attacks.",
      fix: "Hide or minimize server/framework version headers where possible.",
    });
  } else {
    add({
      module: "Information Exposure",
      title: "Technology fingerprint minimized",
      url,
      status: "pass",
      severity: "Info",
      evidence:
        "Server and X-Powered-By headers are not visibly exposing technology.",
      customerImpact: "Less public technology information is exposed.",
      fix: "Continue minimizing stack metadata.",
    });
  }

  const mixedContentMatches = html.match(/http:\/\/[^"' )<]+/gi) || [];
  if (isHttps && mixedContentMatches.length) {
    add({
      module: "Frontend Security",
      title: "Mixed content references found",
      url,
      status: "warning",
      severity: "Medium",
      evidence: `${mixedContentMatches.slice(0, 5).join(", ")}`,
      customerImpact:
        "Some content may load insecurely and reduce browser trust.",
      fix: "Change HTTP asset links to HTTPS.",
    });
  } else {
    add({
      module: "Frontend Security",
      title: "No obvious mixed content found",
      url,
      status: "pass",
      severity: "Info",
      evidence: "No http:// asset references found in the scanned HTML sample.",
      customerImpact: "Page does not visibly load insecure HTTP resources.",
      fix: "Keep all scripts, images, fonts, and APIs on HTTPS.",
    });
  }

  const externalScripts = Array.from(
    html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi),
  ).map((match) => match[1]);
  const inlineScripts = (html.match(/<script(?![^>]+src=)[^>]*>/gi) || [])
    .length;

  if (externalScripts.length > 10 || inlineScripts > 5) {
    add({
      module: "Frontend Security",
      title: "High script surface",
      url,
      status: "warning",
      severity: "Low",
      evidence: `External scripts: ${externalScripts.length}; inline scripts: ${inlineScripts}`,
      customerImpact:
        "More scripts create more supply-chain and browser attack surface.",
      fix: "Remove unused scripts, host trusted assets, and control scripts with CSP.",
    });
  } else {
    add({
      module: "Frontend Security",
      title: "Script surface looks manageable",
      url,
      status: "pass",
      severity: "Info",
      evidence: `External scripts: ${externalScripts.length}; inline scripts: ${inlineScripts}`,
      customerImpact:
        "Public page script surface is not excessive from this sample.",
      fix: "Continue reviewing third-party scripts.",
    });
  }

  const forms = (html.match(/<form[\s>]/gi) || []).length;
  const passwordFields = (html.match(/type=["']password["']/gi) || []).length;

  if (passwordFields && !isHttps) {
    add({
      module: "Form Security",
      title: "Password field on non-HTTPS page",
      url,
      status: "fail",
      severity: "Critical",
      evidence: `Password fields detected: ${passwordFields}`,
      customerImpact: "User passwords can be exposed on insecure connection.",
      fix: "Move all login and account pages to HTTPS immediately.",
    });
  } else if (passwordFields) {
    add({
      module: "Form Security",
      title: "Password field detected",
      url,
      status: "info",
      severity: "Info",
      evidence: `Password fields detected: ${passwordFields}`,
      customerImpact:
        "Login flow exists and should receive authenticated testing later.",
      fix: "Verify MFA, rate limits, secure cookies, CSRF protection, and password reset flow.",
    });
  } else if (forms) {
    add({
      module: "Form Security",
      title: "Public forms detected",
      url,
      status: "info",
      severity: "Info",
      evidence: `Forms detected: ${forms}`,
      customerImpact:
        "Forms may collect customer data and should have validation/spam protection.",
      fix: "Review form validation, CSRF protection, spam protection, and privacy notice.",
    });
  }

  const setCookie = getHeader(input.home.headers, "set-cookie");
  if (setCookie) {
    const hasSecure = /;\s*secure/i.test(setCookie);
    const hasHttpOnly = /;\s*httponly/i.test(setCookie);
    const hasSameSite = /;\s*samesite=/i.test(setCookie);

    if (hasSecure && hasHttpOnly && hasSameSite) {
      add({
        module: "Session Security",
        title: "Visible cookies have important flags",
        url,
        status: "pass",
        severity: "Info",
        evidence: "Set-Cookie includes Secure, HttpOnly, and SameSite signals.",
        customerImpact:
          "Browser session cookie posture appears stronger from public response.",
        fix: "Keep Secure, HttpOnly, and SameSite on session cookies.",
      });
    } else {
      add({
        module: "Session Security",
        title: "Cookie flags need review",
        url,
        status: "warning",
        severity: "Medium",
        evidence: `Secure: ${hasSecure}; HttpOnly: ${hasHttpOnly}; SameSite: ${hasSameSite}`,
        customerImpact: "Weak cookie flags can increase session risk.",
        fix: "Add Secure, HttpOnly, and SameSite flags to sensitive cookies.",
      });
    }
  }

  if (input.robots.ok) {
    add({
      module: "Public Asset Governance",
      title: "robots.txt present",
      url: input.robots.url,
      status: "pass",
      severity: "Info",
      evidence: `robots.txt returned HTTP ${input.robots.status}`,
      customerImpact: "Search engine crawling rules are publicly available.",
      fix: "Do not place sensitive URLs inside robots.txt as a security control.",
    });
  } else {
    add({
      module: "Public Asset Governance",
      title: "robots.txt missing",
      url: input.robots.url,
      status: "warning",
      severity: "Low",
      evidence: `robots.txt returned HTTP ${input.robots.status || "error"}`,
      customerImpact: "Website has no visible crawler guidance.",
      fix: "Add robots.txt for crawl governance.",
    });
  }

  if (input.sitemap.ok) {
    add({
      module: "Public Asset Governance",
      title: "sitemap.xml present",
      url: input.sitemap.url,
      status: "pass",
      severity: "Info",
      evidence: `sitemap.xml returned HTTP ${input.sitemap.status}`,
      customerImpact: "Search engines can discover public pages cleanly.",
      fix: "Keep sitemap updated and avoid private URLs.",
    });
  } else {
    add({
      module: "Public Asset Governance",
      title: "sitemap.xml missing",
      url: input.sitemap.url,
      status: "warning",
      severity: "Low",
      evidence: `sitemap.xml returned HTTP ${input.sitemap.status || "error"}`,
      customerImpact: "Public page discovery and SEO hygiene may be weaker.",
      fix: "Add sitemap.xml for public pages.",
    });
  }

  if (input.securityTxt.ok) {
    add({
      module: "Security Process",
      title: "security.txt present",
      url: input.securityTxt.url,
      status: "pass",
      severity: "Info",
      evidence: `security.txt returned HTTP ${input.securityTxt.status}`,
      customerImpact: "Researchers have a clearer security contact path.",
      fix: "Keep security contact current and monitored.",
    });
  } else {
    add({
      module: "Security Process",
      title: "security.txt missing",
      url: input.securityTxt.url,
      status: "warning",
      severity: "Low",
      evidence: `security.txt returned HTTP ${input.securityTxt.status || "error"}`,
      customerImpact:
        "Security researchers may not know where to report issues.",
      fix: "Add /.well-known/security.txt with a monitored contact.",
    });
  }

  if (input.privacy.ok || lowerHtml.includes("privacy")) {
    add({
      module: "Customer Trust",
      title: "Privacy signal present",
      url: input.privacy.ok ? input.privacy.url : url,
      status: "pass",
      severity: "Info",
      evidence: input.privacy.ok
        ? `Privacy page returned HTTP ${input.privacy.status}`
        : "Homepage mentions privacy.",
      customerImpact: "Customers can review data handling signals.",
      fix: "Keep privacy policy clear and updated.",
    });
  } else {
    add({
      module: "Customer Trust",
      title: "Privacy policy not visible",
      url: input.privacy.url,
      status: "warning",
      severity: "Medium",
      evidence: `Privacy page returned HTTP ${input.privacy.status || "error"}`,
      customerImpact: "Customers may hesitate to trust the website with data.",
      fix: "Add a clear privacy policy page.",
    });
  }

  if (input.terms.ok || lowerHtml.includes("terms")) {
    add({
      module: "Customer Trust",
      title: "Terms signal present",
      url: input.terms.ok ? input.terms.url : url,
      status: "pass",
      severity: "Info",
      evidence: input.terms.ok
        ? `Terms page returned HTTP ${input.terms.status}`
        : "Homepage mentions terms.",
      customerImpact: "Business terms are easier for customers to find.",
      fix: "Keep terms clear and updated.",
    });
  } else {
    add({
      module: "Customer Trust",
      title: "Terms page not visible",
      url: input.terms.url,
      status: "warning",
      severity: "Low",
      evidence: `Terms page returned HTTP ${input.terms.status || "error"}`,
      customerImpact: "Customer trust and legal clarity may be weaker.",
      fix: "Add a terms of service page.",
    });
  }

  if (input.contact.ok || lowerHtml.includes("contact")) {
    add({
      module: "Customer Trust",
      title: "Contact signal present",
      url: input.contact.ok ? input.contact.url : url,
      status: "pass",
      severity: "Info",
      evidence: input.contact.ok
        ? `Contact page returned HTTP ${input.contact.status}`
        : "Homepage mentions contact.",
      customerImpact: "Customers can find a communication path.",
      fix: "Keep contact details accurate and monitored.",
    });
  } else {
    add({
      module: "Customer Trust",
      title: "Contact page not visible",
      url: input.contact.url,
      status: "warning",
      severity: "Low",
      evidence: `Contact page returned HTTP ${input.contact.status || "error"}`,
      customerImpact: "Customers may struggle to contact the business.",
      fix: "Add a clear contact page.",
    });
  }

  const groups = Array.from(new Set(evidenceItems.map((item) => item.module)));
  const modules = groups.map((group, groupIndex) => {
    const moduleItems = evidenceItems.filter((item) => item.module === group);
    const score = moduleScore(moduleItems);

    return {
      id: `MOD-${String(groupIndex + 1).padStart(2, "0")}`,
      name: group,
      score,
      status: moduleStatus(score),
      evidenceCount: moduleItems.length,
      summary:
        score >= 85
          ? `${group} looks strong from inbuilt passive checks.`
          : score >= 65
            ? `${group} needs improvement before serious customer trust claims.`
            : `${group} has important gaps that should be fixed.`,
    };
  });

  const overallScore = Math.round(
    modules.reduce((total, item) => total + item.score, 0) /
      Math.max(1, modules.length),
  );

  const priorityFixes = evidenceItems
    .filter((item) => item.status === "fail" || item.status === "warning")
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .slice(0, 7)
    .map((item) => `${item.title}: ${item.fix}`);

  return {
    version: "20.0",
    generatedAt: new Date().toISOString(),
    auditType: "inbuilt-passive-advanced",
    scannedUrl: url,
    customerFriendlyName: urlObject.hostname,
    overallScore,
    maturityLevel: maturity(overallScore),
    businessReadiness: readiness(overallScore),
    modules,
    evidence: evidenceItems,
    customerSummary:
      overallScore >= 84
        ? "This website shows strong public security and trust posture from inbuilt passive checks."
        : overallScore >= 72
          ? "This website is close to customer demo readiness, but selected security hardening tasks remain."
          : overallScore >= 55
            ? "This website has a basic posture but needs improvement before using it as a serious trust signal."
            : "This website has visible public security and trust gaps that should be fixed before customer-facing launch.",
    priorityFixes: priorityFixes.length
      ? priorityFixes
      : ["Maintain current posture and continue scheduled monitoring."],
    safeTestingNotice: [
      "All checks are inbuilt inside SecureMSME AI.",
      "No external customer installation required.",
      "No Docker or JSON import required for normal customers.",
      "No exploitation, brute force, login bypass, or destructive testing.",
      "Authenticated testing should be added later only with written permission.",
    ],
  };
}

export async function runInbuiltAdvancedAudit(websiteUrl: string) {
  const scannedUrl = normalizeUrl(websiteUrl);

  const [home, robots, sitemap, securityTxt, privacy, terms, contact] =
    await Promise.all([
      safeFetch(scannedUrl),
      safeFetch(sameOriginUrl(scannedUrl, "/robots.txt")),
      safeFetch(sameOriginUrl(scannedUrl, "/sitemap.xml")),
      safeFetch(sameOriginUrl(scannedUrl, "/.well-known/security.txt")),
      safeFetch(sameOriginUrl(scannedUrl, "/privacy")),
      safeFetch(sameOriginUrl(scannedUrl, "/terms")),
      safeFetch(sameOriginUrl(scannedUrl, "/contact")),
    ]);

  return analyzeInbuiltSignals({
    scannedUrl,
    home,
    robots,
    sitemap,
    securityTxt,
    privacy,
    terms,
    contact,
  });
}
