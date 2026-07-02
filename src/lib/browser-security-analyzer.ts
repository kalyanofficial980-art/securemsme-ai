import dns from "node:dns/promises";
import type {
  EngineEvidenceSeed,
  EngineIntensity,
  VulnerabilitySeed,
} from "@/lib/international-security-engine";

export type BrowserSecurityFinding = {
  category:
    | "CSP"
    | "CORS"
    | "Cookie"
    | "Clickjacking"
    | "HSTS"
    | "Referrer-Policy"
    | "Permissions-Policy"
    | "Mixed Content"
    | "External Script"
    | "MIME/Content"
    | "Safety";
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  confidence: "High" | "Medium" | "Low";
  affectedUrl: string;
  observedValue: string;
  expectedValue: string;
  evidenceSummary: string;
  businessImpact: string;
  developerFix: string;
  safeClaim: string;
  blockedClaim: string;
  standards: Record<string, string[]>;
  evidenceMetadata: Record<string, unknown>;
};

export type BrowserPageObservation = {
  url: string;
  statusCode: number | null;
  contentType: string | null;
  headerNames: string[];
  cookiesObserved: number;
  externalScripts: number;
  mixedContentSignals: number;
  bodyParsedInMemoryOnly: boolean;
};

export type BrowserSecurityReport = {
  version: string;
  generatedAt: string;
  targetUrl: string;
  hostname: string;
  intensity: EngineIntensity;
  verifiedScope: boolean;
  privateTargetBlocked: boolean;
  analyzerStatus:
    "completed" | "completed-with-warnings" | "blocked" | "failed";
  analyzerPolicy: {
    allowedMethods: string[];
    maxPages: number;
    maxBodyReadBytes: number;
    noFormSubmission: boolean;
    noMutationRequests: boolean;
    noPrivateBodyStorage: boolean;
    noExploitPayloads: boolean;
  };
  pages: BrowserPageObservation[];
  findings: BrowserSecurityFinding[];
  normalizedEvidenceSeeds: EngineEvidenceSeed[];
  vulnerabilitySeeds: VulnerabilitySeed[];
  summary: {
    browserSecurityScore: number;
    pageCount: number;
    findingCount: number;
    cspFindingCount: number;
    corsFindingCount: number;
    cookieFindingCount: number;
    clickjackingFindingCount: number;
    mixedContentCount: number;
    externalScriptCount: number;
    highRiskCount: number;
    customerSummary: string;
  };
  safetyBoundary: string[];
};

const SAFETY_BOUNDARY = [
  "Verified website scope required",
  "GET-only browser security observation",
  "No form submission",
  "No POST/PUT/PATCH/DELETE",
  "No exploit payloads",
  "No private body storage",
  "No credential/session storage",
  "Private/internal targets blocked",
];

const PRIVATE_HOST_PATTERNS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
];

function normalizeTargetUrl(input: string) {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS targets are allowed.");
  }

  url.hash = "";
  return url;
}

function isPrivateIPv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part)))
    return false;
  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0 ||
    a >= 224
  );
}

function isPrivateIPv6(ip: string) {
  const lower = ip.toLowerCase();

  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:") ||
    lower.includes("::ffff:127.") ||
    lower.includes("::ffff:10.") ||
    lower.includes("::ffff:192.168.")
  );
}

async function assertPublicTarget(url: URL) {
  const hostname = url.hostname.toLowerCase();

  if (
    PRIVATE_HOST_PATTERNS.includes(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error("Private/internal hostnames are blocked.");
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: false });
  if (!addresses.length) throw new Error("Could not resolve target hostname.");

  const privateAddress = addresses.find((address) =>
    address.family === 4
      ? isPrivateIPv4(address.address)
      : isPrivateIPv6(address.address),
  );

  if (privateAddress)
    throw new Error("Resolved private/internal IP address is blocked.");
}

function buildPolicy(intensity: EngineIntensity) {
  return {
    allowedMethods: ["GET"],
    maxPages: intensity === "light" ? 3 : intensity === "deep" ? 15 : 8,
    maxBodyReadBytes: 160_000,
    noFormSubmission: true,
    noMutationRequests: true,
    noPrivateBodyStorage: true,
    noExploitPayloads: true,
  };
}

function sameOrigin(base: URL, candidate: URL) {
  return (
    base.protocol === candidate.protocol &&
    base.hostname === candidate.hostname &&
    base.port === candidate.port
  );
}

function normalizeCandidateUrl(base: URL, raw: string) {
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, base);
    url.hash = "";
    if (!sameOrigin(base, url)) return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchPage(url: URL, maxBodyReadBytes: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "SecureMSMEAI-BrowserSecurityAnalyzer/2.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const setCookieHeader = response.headers.get("set-cookie");
    const contentType = response.headers.get("content-type") || "";
    let body = "";

    if (
      contentType.includes("text") ||
      contentType.includes("html") ||
      contentType.includes("javascript") ||
      contentType.includes("json") ||
      contentType.includes("xml")
    ) {
      body = (await response.text()).slice(0, maxBodyReadBytes);
    }

    return {
      statusCode: response.status,
      contentType,
      headers,
      setCookieHeader,
      body,
    };
  } catch (error) {
    return {
      statusCode: null,
      contentType: null,
      headers: {},
      setCookieHeader: null,
      body: "",
      errorMessage: error instanceof Error ? error.message : "Request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function splitSetCookie(setCookieHeader: string | null) {
  if (!setCookieHeader) return [];

  return setCookieHeader
    .split(/,(?=\s*[^;,]+=)/)
    .map((cookie) => cookie.trim())
    .filter(Boolean);
}

function extractScriptTags(base: URL, html: string) {
  return [...html.matchAll(/<script\b([^>]*)>/gi)].map((match) => {
    const attrs = match[1] || "";
    const src = attrs.match(/\ssrc=["']([^"']{1,900})["']/i)?.[1] || "";
    const integrity = /\sintegrity=["'][^"']+["']/i.test(attrs);
    const url = src ? new URL(src, base) : null;

    return {
      src,
      url,
      integrity,
      external: Boolean(url && !sameOrigin(base, url)),
    };
  });
}

function mixedContentSignals(pageUrl: URL, html: string) {
  if (pageUrl.protocol !== "https:") return [];

  const signals = [
    ...html.matchAll(/\s(?:src|href)=["'](http:\/\/[^"']{1,900})["']/gi),
  ]
    .map((match) => match[1])
    .slice(0, 30);

  return [...new Set(signals)];
}

function addFinding(
  findings: BrowserSecurityFinding[],
  finding: BrowserSecurityFinding,
) {
  findings.push(finding);
}

const browserStandards = {
  csp: {
    owaspWstg: ["WSTG-CONF-07", "WSTG-CLNT-12"],
    owaspAsvs: ["V14.4", "V14.5"],
    owaspApiTop10: [],
    nistSsdf: ["PW.8", "RV.1"],
  },
  cors: {
    owaspWstg: ["WSTG-CLNT-07"],
    owaspAsvs: ["V14.5"],
    owaspApiTop10: ["API8"],
    nistSsdf: ["PW.8", "RV.1"],
  },
  cookie: {
    owaspWstg: ["WSTG-SESS-02"],
    owaspAsvs: ["V3.4"],
    owaspApiTop10: [],
    nistSsdf: ["PW.8", "RV.1"],
  },
  clickjacking: {
    owaspWstg: ["WSTG-CLNT-09"],
    owaspAsvs: ["V14.4"],
    owaspApiTop10: [],
    nistSsdf: ["PW.8", "RV.1"],
  },
  hsts: {
    owaspWstg: ["WSTG-CONF-07"],
    owaspAsvs: ["V9.1", "V14.4"],
    owaspApiTop10: [],
    nistSsdf: ["PW.8", "RV.1"],
  },
};

function analyzeHeaders(input: {
  pageUrl: URL;
  headers: Record<string, string>;
  findings: BrowserSecurityFinding[];
}) {
  const { pageUrl, headers, findings } = input;
  const affectedUrl = pageUrl.toString();
  const csp = headers["content-security-policy"] || "";
  const xfo = headers["x-frame-options"] || "";
  const corsOrigin = headers["access-control-allow-origin"] || "";
  const corsCredentials = headers["access-control-allow-credentials"] || "";
  const hsts = headers["strict-transport-security"] || "";
  const referrerPolicy = headers["referrer-policy"] || "";
  const permissionsPolicy = headers["permissions-policy"] || "";
  const nosniff = headers["x-content-type-options"] || "";

  if (!csp) {
    addFinding(findings, {
      category: "CSP",
      title: "Content Security Policy is missing",
      severity: "Medium",
      confidence: "High",
      affectedUrl,
      observedValue: "content-security-policy header not observed",
      expectedValue:
        "A restrictive CSP with default-src, script-src, object-src, base-uri and frame-ancestors",
      evidenceSummary:
        "The response did not include a Content-Security-Policy header.",
      businessImpact:
        "Missing CSP can increase browser-side impact from XSS, script injection, clickjacking and content injection.",
      developerFix:
        "Add a restrictive CSP and tune it safely in report-only mode before enforcement.",
      safeClaim:
        "Can claim CSP header was not observed on the checked response.",
      blockedClaim: "Cannot claim XSS exploitability from missing CSP alone.",
      standards: browserStandards.csp,
      evidenceMetadata: { headerPresent: false },
    });
  } else {
    const weaknesses: string[] = [];
    if (csp.includes("'unsafe-inline'")) weaknesses.push("unsafe-inline");
    if (csp.includes("'unsafe-eval'")) weaknesses.push("unsafe-eval");
    if (/(^|[\s;])script-src[^;]*\*/i.test(csp))
      weaknesses.push("wildcard script-src");
    if (!/object-src/i.test(csp)) weaknesses.push("missing object-src");
    if (!/base-uri/i.test(csp)) weaknesses.push("missing base-uri");
    if (!/frame-ancestors/i.test(csp))
      weaknesses.push("missing frame-ancestors");

    if (weaknesses.length) {
      addFinding(findings, {
        category: "CSP",
        title: "Content Security Policy has weakness signals",
        severity:
          weaknesses.includes("unsafe-inline") ||
          weaknesses.includes("unsafe-eval")
            ? "Medium"
            : "Low",
        confidence: "High",
        affectedUrl,
        observedValue: weaknesses.join(", "),
        expectedValue:
          "Restrictive CSP without unsafe-inline/unsafe-eval and with object-src/base-uri/frame-ancestors",
        evidenceSummary:
          "CSP exists but contains weakness signals that should be reviewed.",
        businessImpact:
          "Weak CSP can reduce protection against browser-side script and content injection risks.",
        developerFix:
          "Remove unsafe directives where possible and add missing hardening directives.",
        safeClaim: "Can claim CSP weakness signals were observed.",
        blockedClaim: "Cannot claim exploitability without safe validation.",
        standards: browserStandards.csp,
        evidenceMetadata: { cspSample: csp.slice(0, 500), weaknesses },
      });
    }
  }

  if (!xfo && !/frame-ancestors/i.test(csp)) {
    addFinding(findings, {
      category: "Clickjacking",
      title: "Clickjacking protection not observed",
      severity: "Medium",
      confidence: "High",
      affectedUrl,
      observedValue: "No X-Frame-Options and no CSP frame-ancestors observed",
      expectedValue: "Use CSP frame-ancestors and/or X-Frame-Options",
      evidenceSummary:
        "The response does not show common frame embedding protections.",
      businessImpact:
        "Pages may be more exposed to clickjacking-style UI redress risks.",
      developerFix:
        "Add CSP frame-ancestors 'self' or a strict allowlist. Use X-Frame-Options where compatible.",
      safeClaim: "Can claim clickjacking protection headers were not observed.",
      blockedClaim:
        "Cannot claim confirmed clickjacking exploitability without safe validation.",
      standards: browserStandards.clickjacking,
      evidenceMetadata: {
        xFrameOptions: xfo || null,
        frameAncestorsPresent: /frame-ancestors/i.test(csp),
      },
    });
  }

  if (pageUrl.protocol === "https:" && !hsts) {
    addFinding(findings, {
      category: "HSTS",
      title: "HSTS header is missing",
      severity: "Medium",
      confidence: "High",
      affectedUrl,
      observedValue: "strict-transport-security header not observed",
      expectedValue:
        "Strict-Transport-Security with appropriate max-age and includeSubDomains after validation",
      evidenceSummary: "HTTPS response did not include HSTS.",
      businessImpact:
        "Missing HSTS can weaken protection against protocol downgrade and cookie exposure on repeat visits.",
      developerFix:
        "Add Strict-Transport-Security after confirming all subdomains support HTTPS.",
      safeClaim: "Can claim HSTS header was not observed.",
      blockedClaim:
        "Cannot claim active downgrade attack from missing HSTS alone.",
      standards: browserStandards.hsts,
      evidenceMetadata: { headerPresent: false },
    });
  }

  if (corsOrigin === "*" && corsCredentials.toLowerCase() === "true") {
    addFinding(findings, {
      category: "CORS",
      title: "High-risk CORS signal: wildcard origin with credentials",
      severity: "High",
      confidence: "High",
      affectedUrl,
      observedValue:
        "Access-Control-Allow-Origin: * and Access-Control-Allow-Credentials: true",
      expectedValue: "Credentialed CORS should use a strict origin allowlist",
      evidenceSummary:
        "A high-risk CORS combination was observed in response headers.",
      businessImpact:
        "Weak CORS can expose authenticated browser data flows if combined with sensitive endpoints.",
      developerFix:
        "Remove wildcard origin for credentialed requests and implement strict origin allowlist.",
      safeClaim: "Can claim high-risk CORS header combination was observed.",
      blockedClaim:
        "Cannot claim data theft without endpoint-specific browser validation.",
      standards: browserStandards.cors,
      evidenceMetadata: { corsOrigin, corsCredentials },
    });
  } else if (corsOrigin === "*") {
    addFinding(findings, {
      category: "CORS",
      title: "CORS wildcard origin observed",
      severity: "Low",
      confidence: "High",
      affectedUrl,
      observedValue: "Access-Control-Allow-Origin: *",
      expectedValue:
        "Use strict allowlist if the response contains sensitive data",
      evidenceSummary: "Wildcard CORS origin was observed.",
      businessImpact:
        "Wildcard CORS can be acceptable for public static resources but risky for sensitive API responses.",
      developerFix:
        "Confirm the response is public. For private APIs, use strict origin allowlist.",
      safeClaim: "Can claim wildcard CORS was observed.",
      blockedClaim:
        "Cannot claim sensitive data exposure without response-level validation.",
      standards: browserStandards.cors,
      evidenceMetadata: { corsOrigin, corsCredentials },
    });
  }

  if (!referrerPolicy) {
    addFinding(findings, {
      category: "Referrer-Policy",
      title: "Referrer-Policy is missing",
      severity: "Low",
      confidence: "High",
      affectedUrl,
      observedValue: "referrer-policy header not observed",
      expectedValue:
        "Use strict-origin-when-cross-origin or stricter based on app needs",
      evidenceSummary: "The response did not include Referrer-Policy.",
      businessImpact:
        "URLs may leak more referrer information to external sites than intended.",
      developerFix:
        "Add Referrer-Policy, commonly strict-origin-when-cross-origin.",
      safeClaim: "Can claim Referrer-Policy was not observed.",
      blockedClaim:
        "Cannot claim sensitive leakage without URL/context review.",
      standards: {
        owaspWstg: ["WSTG-CONF-07"],
        owaspAsvs: ["V14.4"],
        owaspApiTop10: [],
        nistSsdf: ["PW.8"],
      },
      evidenceMetadata: { headerPresent: false },
    });
  }

  if (!permissionsPolicy) {
    addFinding(findings, {
      category: "Permissions-Policy",
      title: "Permissions-Policy is missing",
      severity: "Low",
      confidence: "High",
      affectedUrl,
      observedValue: "permissions-policy header not observed",
      expectedValue:
        "Limit powerful browser features such as camera, microphone, geolocation and payment",
      evidenceSummary: "The response did not include Permissions-Policy.",
      businessImpact:
        "Browser features may not be restricted as tightly as possible.",
      developerFix:
        "Add Permissions-Policy with least-privilege feature allowlists.",
      safeClaim: "Can claim Permissions-Policy was not observed.",
      blockedClaim:
        "Cannot claim browser permission abuse from missing header alone.",
      standards: {
        owaspWstg: ["WSTG-CONF-07"],
        owaspAsvs: ["V14.4"],
        owaspApiTop10: [],
        nistSsdf: ["PW.8"],
      },
      evidenceMetadata: { headerPresent: false },
    });
  }

  if (nosniff.toLowerCase() !== "nosniff") {
    addFinding(findings, {
      category: "MIME/Content",
      title: "X-Content-Type-Options nosniff not observed",
      severity: "Low",
      confidence: "High",
      affectedUrl,
      observedValue: nosniff || "x-content-type-options header not observed",
      expectedValue: "X-Content-Type-Options: nosniff",
      evidenceSummary: "The response does not show MIME sniffing protection.",
      businessImpact:
        "Missing nosniff can weaken browser protection against some content-type confusion cases.",
      developerFix: "Add X-Content-Type-Options: nosniff.",
      safeClaim: "Can claim nosniff header was not observed.",
      blockedClaim:
        "Cannot claim MIME confusion exploitability without validation.",
      standards: {
        owaspWstg: ["WSTG-CONF-07"],
        owaspAsvs: ["V14.4"],
        owaspApiTop10: [],
        nistSsdf: ["PW.8"],
      },
      evidenceMetadata: { observed: nosniff || null },
    });
  }
}

function analyzeCookies(input: {
  pageUrl: URL;
  setCookieHeader: string | null;
  findings: BrowserSecurityFinding[];
}) {
  const cookies = splitSetCookie(input.setCookieHeader);

  for (const cookie of cookies) {
    const lower = cookie.toLowerCase();
    const cookieName = cookie.split("=")[0]?.trim() || "cookie";
    const sessionLike = /sess|auth|token|jwt|sid|login/i.test(cookieName);
    const missing: string[] = [];

    if (!lower.includes("secure")) missing.push("Secure");
    if (!lower.includes("httponly") && sessionLike) missing.push("HttpOnly");
    if (!lower.includes("samesite")) missing.push("SameSite");

    if (missing.length) {
      addFinding(input.findings, {
        category: "Cookie",
        title: `Cookie flag review needed: ${cookieName}`,
        severity:
          sessionLike &&
          (missing.includes("Secure") || missing.includes("HttpOnly"))
            ? "Medium"
            : "Low",
        confidence: "High",
        affectedUrl: input.pageUrl.toString(),
        observedValue: `Missing/needs review: ${missing.join(", ")}`,
        expectedValue:
          "Session cookies should use Secure, HttpOnly and SameSite where appropriate",
        evidenceSummary:
          "A Set-Cookie header was observed with missing or review-worthy security attributes.",
        businessImpact:
          "Weak cookie flags can increase session exposure risk if combined with other browser or network weaknesses.",
        developerFix:
          "Set Secure, HttpOnly and SameSite attributes for session/auth cookies where compatible.",
        safeClaim: "Can claim cookie flag weakness signals were observed.",
        blockedClaim: "Cannot claim session theft without exploit evidence.",
        standards: browserStandards.cookie,
        evidenceMetadata: {
          cookieName,
          missing,
          sessionLike,
          cookieBodyStored: false,
        },
      });
    }
  }
}

function analyzeHtml(input: {
  pageUrl: URL;
  body: string;
  findings: BrowserSecurityFinding[];
}) {
  const scripts = extractScriptTags(input.pageUrl, input.body);
  const externalScripts = scripts.filter((script) => script.external);
  const externalWithoutSri = externalScripts.filter(
    (script) => !script.integrity,
  );
  const mixed = mixedContentSignals(input.pageUrl, input.body);

  if (mixed.length) {
    addFinding(input.findings, {
      category: "Mixed Content",
      title: "Mixed content signals observed",
      severity: "Medium",
      confidence: "High",
      affectedUrl: input.pageUrl.toString(),
      observedValue: `${mixed.length} http:// resources referenced from HTTPS page`,
      expectedValue:
        "HTTPS pages should load active/passive resources over HTTPS",
      evidenceSummary:
        "The page references HTTP resources while served over HTTPS.",
      businessImpact:
        "Mixed content can weaken transport security and may cause browser blocking or content tampering risk.",
      developerFix:
        "Update HTTP resource URLs to HTTPS or remove unsafe resources.",
      safeClaim: "Can claim mixed content signals were observed.",
      blockedClaim:
        "Cannot claim active content tampering without network-level evidence.",
      standards: {
        owaspWstg: ["WSTG-CONF-07"],
        owaspAsvs: ["V9.1", "V14.4"],
        owaspApiTop10: [],
        nistSsdf: ["PW.8"],
      },
      evidenceMetadata: {
        sampleResources: mixed.slice(0, 10),
        bodyStored: false,
      },
    });
  }

  if (externalScripts.length >= 5) {
    addFinding(input.findings, {
      category: "External Script",
      title: "Large external script supply-chain surface",
      severity: "Low",
      confidence: "Medium",
      affectedUrl: input.pageUrl.toString(),
      observedValue: `${externalScripts.length} external scripts observed`,
      expectedValue:
        "Minimize third-party scripts and monitor supply-chain risk",
      evidenceSummary: "The page loads multiple third-party scripts.",
      businessImpact:
        "Third-party scripts can increase supply-chain, privacy and performance risk.",
      developerFix:
        "Review every external script, remove unused vendors, and monitor script integrity/ownership.",
      safeClaim: "Can claim external script surface was observed.",
      blockedClaim:
        "Cannot claim a third-party script is malicious without verification.",
      standards: {
        owaspWstg: ["WSTG-CLNT-12"],
        owaspAsvs: ["V14.5"],
        owaspApiTop10: [],
        nistSsdf: ["PW.4", "RV.1"],
      },
      evidenceMetadata: {
        externalScriptCount: externalScripts.length,
        externalWithoutSri: externalWithoutSri.length,
        bodyStored: false,
      },
    });
  }

  if (externalWithoutSri.length > 0) {
    addFinding(input.findings, {
      category: "External Script",
      title: "External scripts without integrity metadata",
      severity: "Low",
      confidence: "Medium",
      affectedUrl: input.pageUrl.toString(),
      observedValue: `${externalWithoutSri.length} external scripts without SRI attribute`,
      expectedValue:
        "Use subresource integrity where practical for static third-party scripts",
      evidenceSummary:
        "Some external scripts do not include an integrity attribute.",
      businessImpact:
        "Missing SRI can reduce protection against unexpected third-party script changes for static assets.",
      developerFix:
        "Add SRI for static third-party scripts where practical, or use trusted first-party hosting and vendor monitoring.",
      safeClaim: "Can claim SRI was not observed on some external scripts.",
      blockedClaim: "Cannot claim script compromise without verification.",
      standards: {
        owaspWstg: ["WSTG-CLNT-12"],
        owaspAsvs: ["V14.5"],
        owaspApiTop10: [],
        nistSsdf: ["PW.4", "RV.1"],
      },
      evidenceMetadata: {
        externalWithoutSri: externalWithoutSri.length,
        bodyStored: false,
      },
    });
  }
}

function calculateScore(findings: BrowserSecurityFinding[]) {
  let score = 100;

  for (const finding of findings) {
    if (finding.severity === "Critical") score -= 25;
    else if (finding.severity === "High") score -= 18;
    else if (finding.severity === "Medium") score -= 10;
    else if (finding.severity === "Low") score -= 4;
  }

  return Math.max(0, Math.min(100, score));
}

function dedupeFindings(findings: BrowserSecurityFinding[]) {
  const seen = new Set<string>();
  const output: BrowserSecurityFinding[] = [];

  for (const finding of findings) {
    const key = `${finding.category}:${finding.title}:${finding.affectedUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(finding);
  }

  return output;
}

function buildEvidenceAndVulnerabilities(input: {
  targetUrl: string;
  findings: BrowserSecurityFinding[];
  score: number;
}) {
  const evidence: EngineEvidenceSeed[] = [
    {
      evidenceKey: "advanced-browser-security-analysis",
      sourceModule: "advanced-browser-security-analyzer-v2",
      affectedAsset: input.targetUrl,
      assetType: "web-url",
      proofType: "header",
      severity: input.score < 60 ? "Medium" : "Info",
      confidence: "High",
      falsePositiveRisk: "Low",
      title: "Advanced browser security analysis completed",
      observedValue: `Browser security score: ${input.score}, findings: ${input.findings.length}`,
      expectedValue:
        "Strong CSP, safe CORS, secure cookies, clickjacking protection, HSTS, referrer policy, permissions policy and no mixed content",
      evidenceSummary:
        "The analyzer reviewed browser-facing headers, cookie flags, mixed-content signals and external script supply-chain metadata using safe GET-only observation.",
      businessImpact:
        "Browser security controls reduce risk from XSS impact, clickjacking, weak CORS, session exposure, downgrade risks and third-party script exposure.",
      developerFix:
        "Prioritize high and medium browser security findings, then retest to confirm header/cookie improvements.",
      safeClaim:
        "Can claim browser security controls were reviewed with safe evidence.",
      blockedClaim:
        "Cannot claim exploitability or compromise without safe validation.",
      standards: {
        owaspWstg: ["WSTG-CONF-07", "WSTG-CLNT-12", "WSTG-SESS-02"],
        owaspAsvs: ["V3.4", "V9.1", "V14.4", "V14.5"],
        owaspApiTop10: ["API8"],
        nistSsdf: ["PW.8", "RV.1"],
      },
      rawMetadata: {
        browserSecurityScore: input.score,
        categories: [
          ...new Set(input.findings.map((finding) => finding.category)),
        ],
      },
    },
  ];

  const vulnerabilities: VulnerabilitySeed[] = [];

  const cspFindings = input.findings.filter(
    (finding) => finding.category === "CSP",
  );
  if (cspFindings.length) {
    vulnerabilities.push({
      vulnerabilityKey: "browser-csp-hardening-required",
      title: "CSP hardening required",
      category: "Browser Security",
      severity: cspFindings.some((finding) => finding.severity === "Medium")
        ? "Medium"
        : "Low",
      confidence: "High",
      exploitabilityScore: 45,
      businessImpactScore: 70,
      priorityScore: 68,
      affectedAssets: cspFindings
        .map((finding) => finding.affectedUrl)
        .slice(0, 20),
      standards: browserStandards.csp,
      businessImpact:
        "Weak or missing CSP can increase impact of browser-side injection risks.",
      developerFix:
        "Create a CSP baseline, remove unsafe directives, add object-src/base-uri/frame-ancestors, and deploy safely.",
      verificationGuidance:
        "Retest after CSP is deployed and confirm no unsafe directives remain.",
      safeClaim:
        "Can claim CSP hardening is recommended based on observed headers.",
      blockedClaim: "Cannot claim XSS exploitability from CSP findings alone.",
    });
  }

  const corsFindings = input.findings.filter(
    (finding) => finding.category === "CORS",
  );
  if (corsFindings.length) {
    vulnerabilities.push({
      vulnerabilityKey: "cors-policy-review-required",
      title: "CORS policy review required",
      category: "Browser/API Security",
      severity: corsFindings.some((finding) => finding.severity === "High")
        ? "High"
        : "Low",
      confidence: "High",
      exploitabilityScore: corsFindings.some(
        (finding) => finding.severity === "High",
      )
        ? 70
        : 30,
      businessImpactScore: 75,
      priorityScore: corsFindings.some((finding) => finding.severity === "High")
        ? 82
        : 50,
      affectedAssets: corsFindings
        .map((finding) => finding.affectedUrl)
        .slice(0, 20),
      standards: browserStandards.cors,
      businessImpact:
        "Weak CORS can increase browser-based API/data exposure risk when sensitive endpoints are involved.",
      developerFix:
        "Use strict origin allowlists for credentialed or sensitive responses.",
      verificationGuidance:
        "Validate CORS behavior against sensitive endpoints in a safe API/authenticated testing scope.",
      safeClaim: "Can claim CORS review is needed based on observed headers.",
      blockedClaim:
        "Cannot claim data exposure without response-specific validation.",
    });
  }

  const cookieFindings = input.findings.filter(
    (finding) => finding.category === "Cookie",
  );
  if (cookieFindings.length) {
    vulnerabilities.push({
      vulnerabilityKey: "session-cookie-hardening-required",
      title: "Session cookie hardening required",
      category: "Session Security",
      severity: "Medium",
      confidence: "High",
      exploitabilityScore: 45,
      businessImpactScore: 70,
      priorityScore: 66,
      affectedAssets: cookieFindings
        .map((finding) => finding.affectedUrl)
        .slice(0, 20),
      standards: browserStandards.cookie,
      businessImpact:
        "Weak cookie attributes can increase session exposure risk when combined with XSS, downgrade or cross-site flows.",
      developerFix:
        "Set Secure, HttpOnly and SameSite attributes on session/auth cookies where compatible.",
      verificationGuidance: "Retest after cookie attributes are updated.",
      safeClaim: "Can claim cookie flag review is required.",
      blockedClaim: "Cannot claim session hijacking without exploit evidence.",
    });
  }

  return { evidence, vulnerabilities };
}

function createBlockedReport(
  url: URL,
  intensity: EngineIntensity,
  verifiedScope: boolean,
  reason: string,
): BrowserSecurityReport {
  const policy = buildPolicy(intensity);
  const finding: BrowserSecurityFinding = {
    category: "Safety",
    title: "Browser security analyzer blocked by safety policy",
    severity: "High",
    confidence: "High",
    affectedUrl: url.toString(),
    observedValue: reason,
    expectedValue: "Only verified public website targets should be analyzed",
    evidenceSummary:
      "The analyzer did not run because the target or scope failed the safety policy.",
    businessImpact:
      "Blocking prevents unsafe internal scanning and unauthorized analysis.",
    developerFix:
      "Use a public verified website domain with permission attestation.",
    safeClaim: "Can claim analyzer was blocked by safety policy.",
    blockedClaim: "Cannot claim browser security coverage for blocked targets.",
    standards: {
      owaspWstg: ["WSTG-CONF-07"],
      owaspAsvs: ["V14.4"],
      owaspApiTop10: [],
      nistSsdf: ["RV.1"],
    },
    evidenceMetadata: { reason },
  };

  const built = buildEvidenceAndVulnerabilities({
    targetUrl: url.toString(),
    findings: [finding],
    score: 0,
  });

  return {
    version: "39.0",
    generatedAt: new Date().toISOString(),
    targetUrl: url.toString(),
    hostname: url.hostname,
    intensity,
    verifiedScope,
    privateTargetBlocked: true,
    analyzerStatus: "blocked",
    analyzerPolicy: policy,
    pages: [],
    findings: [finding],
    normalizedEvidenceSeeds: built.evidence,
    vulnerabilitySeeds: built.vulnerabilities,
    summary: {
      browserSecurityScore: 0,
      pageCount: 0,
      findingCount: 1,
      cspFindingCount: 0,
      corsFindingCount: 0,
      cookieFindingCount: 0,
      clickjackingFindingCount: 0,
      mixedContentCount: 0,
      externalScriptCount: 0,
      highRiskCount: 1,
      customerSummary:
        "Browser security analyzer was blocked by safety policy.",
    },
    safetyBoundary: SAFETY_BOUNDARY,
  };
}

export async function runAdvancedBrowserSecurityAnalyzer(input: {
  targetUrl: string;
  intensity?: EngineIntensity;
  verifiedScope?: boolean;
  routeHints?: string[];
}): Promise<BrowserSecurityReport> {
  const intensity = input.intensity || "standard";
  const verifiedScope = Boolean(input.verifiedScope);
  const target = normalizeTargetUrl(input.targetUrl);

  if (!verifiedScope) {
    return createBlockedReport(
      target,
      intensity,
      verifiedScope,
      "Verified website scope and permission are required for browser security analyzer.",
    );
  }

  try {
    await assertPublicTarget(target);
  } catch (error) {
    return createBlockedReport(
      target,
      intensity,
      verifiedScope,
      error instanceof Error ? error.message : "Target blocked.",
    );
  }

  const policy = buildPolicy(intensity);
  const queue = [
    target,
    ...(input.routeHints || [])
      .map((hint) => normalizeCandidateUrl(target, hint))
      .filter((url): url is URL => Boolean(url)),
  ];

  const uniqueUrls = [
    ...new Map(queue.map((url) => [url.toString(), url])).values(),
  ].slice(0, policy.maxPages);
  const pages: BrowserPageObservation[] = [];
  const findings: BrowserSecurityFinding[] = [];

  for (const pageUrl of uniqueUrls) {
    const fetched = await fetchPage(pageUrl, policy.maxBodyReadBytes);
    const headers = fetched.headers;
    const scriptTags = extractScriptTags(pageUrl, fetched.body);
    const mixed = mixedContentSignals(pageUrl, fetched.body);

    analyzeHeaders({ pageUrl, headers, findings });
    analyzeCookies({
      pageUrl,
      setCookieHeader: fetched.setCookieHeader,
      findings,
    });
    analyzeHtml({ pageUrl, body: fetched.body, findings });

    pages.push({
      url: pageUrl.toString(),
      statusCode: fetched.statusCode,
      contentType: fetched.contentType,
      headerNames: Object.keys(headers).sort(),
      cookiesObserved: splitSetCookie(fetched.setCookieHeader).length,
      externalScripts: scriptTags.filter((script) => script.external).length,
      mixedContentSignals: mixed.length,
      bodyParsedInMemoryOnly: true,
    });
  }

  const dedupedFindings = dedupeFindings(findings);
  const score = calculateScore(dedupedFindings);
  const built = buildEvidenceAndVulnerabilities({
    targetUrl: target.toString(),
    findings: dedupedFindings,
    score,
  });

  const summary = {
    browserSecurityScore: score,
    pageCount: pages.length,
    findingCount: dedupedFindings.length,
    cspFindingCount: dedupedFindings.filter(
      (finding) => finding.category === "CSP",
    ).length,
    corsFindingCount: dedupedFindings.filter(
      (finding) => finding.category === "CORS",
    ).length,
    cookieFindingCount: dedupedFindings.filter(
      (finding) => finding.category === "Cookie",
    ).length,
    clickjackingFindingCount: dedupedFindings.filter(
      (finding) => finding.category === "Clickjacking",
    ).length,
    mixedContentCount: dedupedFindings.filter(
      (finding) => finding.category === "Mixed Content",
    ).length,
    externalScriptCount: pages.reduce(
      (total, page) => total + page.externalScripts,
      0,
    ),
    highRiskCount: dedupedFindings.filter((finding) =>
      ["Critical", "High"].includes(finding.severity),
    ).length,
    customerSummary:
      "Advanced browser security analyzer reviewed CSP, CORS, cookies, clickjacking, HSTS, Referrer-Policy, Permissions-Policy, mixed content and external scripts using safe GET-only observation.",
  };

  return {
    version: "39.0",
    generatedAt: new Date().toISOString(),
    targetUrl: target.toString(),
    hostname: target.hostname,
    intensity,
    verifiedScope,
    privateTargetBlocked: false,
    analyzerStatus: "completed",
    analyzerPolicy: policy,
    pages,
    findings: dedupedFindings,
    normalizedEvidenceSeeds: built.evidence,
    vulnerabilitySeeds: built.vulnerabilities,
    summary,
    safetyBoundary: SAFETY_BOUNDARY,
  };
}
