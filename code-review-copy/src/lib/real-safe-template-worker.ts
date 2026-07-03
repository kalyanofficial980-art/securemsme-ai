import dns from "node:dns/promises";
import type { PentestIntensity } from "@/lib/authorized-pentest-engine";

export type RealTemplateSeverity =
  "Critical" | "High" | "Medium" | "Low" | "Info";
export type RealTemplateStatus =
  "matched" | "not-matched" | "blocked" | "manual-review";
export type RealTemplateMethod = "GET" | "HEAD";

export type RealSafeTemplate = {
  id: string;
  name: string;
  customerName: string;
  category: string;
  severity: RealTemplateSeverity;
  paths: string[];
  method: RealTemplateMethod;
  matchStatusCodes: number[];
  bodyHints?: string[];
  headerHints?: string[];
  sensitive: boolean;
  intensity: PentestIntensity[];
  customerImpact: string;
  developerFix: string;
  safeClaim: string;
  blockedClaim: string;
};

export type RealTemplateObservation = {
  url: string;
  path: string;
  method: RealTemplateMethod;
  status: number | null;
  contentType: string | null;
  contentLength: string | null;
  headerSample: string[];
  bodySample?: string;
  blockedBodyStorage: boolean;
  errorMessage?: string;
};

export type RealTemplateFinding = {
  templateId: string;
  templateName: string;
  customerName: string;
  category: string;
  severity: RealTemplateSeverity;
  status: RealTemplateStatus;
  confidence: "High" | "Medium" | "Low";
  evidence: string[];
  customerImpact: string;
  developerFix: string;
  safeClaim: string;
  blockedClaim: string;
};

export type RealSafeTemplateWorkerReport = {
  version: string;
  generatedAt: string;
  targetUrl: string;
  hostname: string;
  intensity: PentestIntensity;
  privateTargetBlocked: boolean;
  totalTemplates: number;
  executedTemplates: number;
  matchedTemplates: number;
  blockedTemplates: number;
  observations: RealTemplateObservation[];
  findings: RealTemplateFinding[];
  safetyBoundary: string[];
  customerSummary: string;
};

const TEMPLATE_WORKER_BOUNDARY = [
  "Verified website scope required",
  "Permission attestation required",
  "Only GET and HEAD requests",
  "No exploit payloads",
  "No brute force",
  "No login bypass",
  "No form submission",
  "No destructive testing",
  "No private data collection",
  "Sensitive-path bodies are not stored",
  "Internal/private targets are blocked",
];

const PRIVATE_HOST_PATTERNS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
];

function isPrivateIPv4(ip: string) {
  const parts = ip.split(".").map((part) => Number(part));
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

function normalizeTargetUrl(input: string) {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS targets are allowed.");
  }

  return url;
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

  if (!addresses.length) {
    throw new Error("Could not resolve target hostname.");
  }

  const privateAddress = addresses.find((address) =>
    address.family === 4
      ? isPrivateIPv4(address.address)
      : isPrivateIPv6(address.address),
  );

  if (privateAddress) {
    throw new Error("Resolved private/internal IP address is blocked.");
  }

  return addresses.map((address) => address.address);
}

function pathForUrl(baseUrl: URL, path: string) {
  const url = new URL(baseUrl.toString());
  url.pathname = path;
  url.search = "";

  return url;
}

export function getRealSafeTemplateCatalog(): RealSafeTemplate[] {
  return [
    {
      id: "root-security-headers",
      name: "Root Security Header Template",
      customerName: "Main page security headers",
      category: "HTTP Security",
      severity: "Medium",
      paths: ["/"],
      method: "GET",
      matchStatusCodes: [200, 301, 302, 307, 308],
      headerHints: [
        "content-security-policy",
        "strict-transport-security",
        "x-frame-options",
      ],
      sensitive: false,
      intensity: ["light", "standard", "deep"],
      customerImpact:
        "Security headers help browsers protect visitors from common web risks.",
      developerFix:
        "Add and test security headers such as HSTS, CSP, frame protection, and content type protection.",
      safeClaim:
        "Can claim the main page response headers were checked on verified scope.",
      blockedClaim:
        "Cannot claim exploitation or compromise from header evidence alone.",
    },
    {
      id: "security-txt-check",
      name: "security.txt Template",
      customerName: "Security contact file",
      category: "Trust Surface",
      severity: "Low",
      paths: ["/.well-known/security.txt"],
      method: "GET",
      matchStatusCodes: [200],
      bodyHints: ["contact:", "expires:", "policy:"],
      sensitive: false,
      intensity: ["light", "standard", "deep"],
      customerImpact:
        "security.txt gives security researchers a safe way to report issues.",
      developerFix:
        "Create /.well-known/security.txt with contact, policy, and expiry details.",
      safeClaim:
        "Can claim security.txt presence and basic fields were checked.",
      blockedClaim:
        "Cannot claim website insecurity only because security.txt is missing.",
    },
    {
      id: "robots-sitemap-check",
      name: "Robots and Sitemap Template",
      customerName: "Public discovery files",
      category: "Trust Surface",
      severity: "Info",
      paths: ["/robots.txt", "/sitemap.xml"],
      method: "GET",
      matchStatusCodes: [200],
      bodyHints: ["user-agent", "sitemap", "<urlset", "<sitemapindex"],
      sensitive: false,
      intensity: ["light", "standard", "deep"],
      customerImpact:
        "Robots and sitemap files help understand public site discovery signals.",
      developerFix:
        "Keep robots.txt and sitemap.xml clean. Do not reveal sensitive paths unnecessarily.",
      safeClaim: "Can claim public discovery files were checked.",
      blockedClaim: "Cannot claim hidden/private pages are fully discovered.",
    },
    {
      id: "admin-login-surface",
      name: "Admin and Login Surface Template",
      customerName: "Public admin/login surface",
      category: "Attack Surface",
      severity: "Medium",
      paths: ["/login", "/admin", "/wp-login.php", "/wp-admin/"],
      method: "GET",
      matchStatusCodes: [200, 401, 403],
      bodyHints: ["login", "password", "admin", "wp-login", "username"],
      sensitive: false,
      intensity: ["standard", "deep"],
      customerImpact:
        "Public login/admin pages should have strong protection such as MFA, rate limiting, and monitoring.",
      developerFix:
        "Protect admin/login pages with MFA, lockouts, rate limits, monitoring, and least privilege.",
      safeClaim:
        "Can claim public admin/login surfaces were observed or reviewed.",
      blockedClaim:
        "Cannot claim authentication bypass, credential compromise, or account takeover.",
    },
    {
      id: "api-docs-surface",
      name: "API Documentation Surface Template",
      customerName: "Public API documentation surface",
      category: "API Security",
      severity: "Medium",
      paths: [
        "/api/docs",
        "/swagger",
        "/swagger-ui",
        "/swagger-ui/index.html",
        "/openapi.json",
      ],
      method: "GET",
      matchStatusCodes: [200, 401, 403],
      bodyHints: ["swagger", "openapi", "api", "paths", "operationId"],
      sensitive: false,
      intensity: ["standard", "deep"],
      customerImpact:
        "Public API documentation can reveal endpoints and speed up attacker reconnaissance.",
      developerFix:
        "Restrict API docs if not intentionally public and avoid exposing sensitive business endpoints.",
      safeClaim: "Can claim public API documentation surface was checked.",
      blockedClaim:
        "Cannot claim API vulnerability, authorization bypass, or data exposure.",
    },
    {
      id: "debug-config-head-check",
      name: "Debug and Config Exposure Template",
      customerName: "Sensitive debug/config path signals",
      category: "Sensitive Exposure",
      severity: "High",
      paths: [
        "/.env",
        "/config.php",
        "/phpinfo.php",
        "/debug",
        "/backup.zip",
        "/backup.sql",
        "/db.sql",
      ],
      method: "HEAD",
      matchStatusCodes: [200, 401, 403],
      sensitive: true,
      intensity: ["deep"],
      customerImpact:
        "Sensitive files or debug surfaces can be serious if actually accessible.",
      developerFix:
        "Remove debug/config/backup files from public web root and block access at server/CDN.",
      safeClaim:
        "Can claim sensitive-path status was checked without storing sensitive body content.",
      blockedClaim:
        "Cannot claim secrets were exposed because sensitive response bodies are not collected by this worker.",
    },
    {
      id: "git-config-head-check",
      name: "Git Config Exposure Template",
      customerName: "Public .git/config signal",
      category: "Sensitive Exposure",
      severity: "High",
      paths: ["/.git/config"],
      method: "HEAD",
      matchStatusCodes: [200, 401, 403],
      sensitive: true,
      intensity: ["deep"],
      customerImpact:
        "Public .git metadata can expose source code history if accessible.",
      developerFix:
        "Block .git paths at server/CDN and ensure source folders are never deployed to public web roots.",
      safeClaim:
        "Can claim .git/config status was checked without downloading repository content.",
      blockedClaim:
        "Cannot claim source code exposure unless authorized evidence proves it safely.",
    },
  ];
}

function templatesForIntensity(intensity: PentestIntensity) {
  return getRealSafeTemplateCatalog().filter((template) =>
    template.intensity.includes(intensity),
  );
}

async function fetchObservation(
  baseUrl: URL,
  template: RealSafeTemplate,
  path: string,
) {
  const url = pathForUrl(baseUrl, path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url.toString(), {
      method: template.method,
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "SecureMSMEAI-Authorized-TemplateWorker/1.0",
      },
    });

    const trackedHeaders = [
      "content-type",
      "content-length",
      "location",
      "server",
      "x-powered-by",
      "strict-transport-security",
      "content-security-policy",
      "x-frame-options",
      "x-content-type-options",
      "referrer-policy",
      "permissions-policy",
    ];

    const headerSample = trackedHeaders
      .map((header) => {
        const value = response.headers.get(header);
        return value ? `${header}: ${value}` : "";
      })
      .filter(Boolean)
      .slice(0, 12);

    let bodySample: string | undefined;

    if (!template.sensitive && template.method === "GET") {
      const contentType = response.headers.get("content-type") || "";
      if (
        contentType.includes("text") ||
        contentType.includes("json") ||
        contentType.includes("xml") ||
        contentType.includes("html")
      ) {
        bodySample = (await response.text()).slice(0, 6000);
      }
    }

    return {
      url: url.toString(),
      path,
      method: template.method,
      status: response.status,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
      headerSample,
      bodySample,
      blockedBodyStorage: template.sensitive,
    } satisfies RealTemplateObservation;
  } catch (error) {
    return {
      url: url.toString(),
      path,
      method: template.method,
      status: null,
      contentType: null,
      contentLength: null,
      headerSample: [],
      blockedBodyStorage: template.sensitive,
      errorMessage: error instanceof Error ? error.message : "Request failed",
    } satisfies RealTemplateObservation;
  } finally {
    clearTimeout(timeout);
  }
}

function observationMatchesTemplate(
  template: RealSafeTemplate,
  observation: RealTemplateObservation,
) {
  if (observation.status === null) return false;
  if (!template.matchStatusCodes.includes(observation.status)) return false;

  const headerText = observation.headerSample.join("\n").toLowerCase();
  const bodyText = (observation.bodySample || "").toLowerCase();

  if (template.sensitive) {
    return (
      observation.status === 200 ||
      observation.status === 401 ||
      observation.status === 403
    );
  }

  const hintMatches = [
    ...(template.bodyHints || []).map((hint) =>
      bodyText.includes(hint.toLowerCase()),
    ),
    ...(template.headerHints || []).map((hint) =>
      headerText.includes(hint.toLowerCase()),
    ),
  ];

  if (!hintMatches.length) return true;

  return hintMatches.some(Boolean);
}

function confidenceFor(
  template: RealSafeTemplate,
  observation: RealTemplateObservation,
) {
  if (template.sensitive && observation.status === 200) return "Medium";
  if (observation.status === 200) return "High";
  if (observation.status === 401 || observation.status === 403) return "Medium";

  return "Low";
}

function buildFinding(
  template: RealSafeTemplate,
  observation: RealTemplateObservation,
): RealTemplateFinding {
  const protectedStatus =
    observation.status === 401 || observation.status === 403;
  const status: RealTemplateStatus = protectedStatus
    ? "manual-review"
    : "matched";

  return {
    templateId: template.id,
    templateName: template.name,
    customerName: template.customerName,
    category: template.category,
    severity:
      protectedStatus && template.severity === "High"
        ? "Medium"
        : template.severity,
    status,
    confidence: confidenceFor(template, observation),
    evidence: [
      `${observation.method} ${observation.url}`,
      `Status: ${observation.status}`,
      `Content-Type: ${observation.contentType || "not observed"}`,
      `Content-Length: ${observation.contentLength || "not observed"}`,
      observation.blockedBodyStorage
        ? "Sensitive response body was not stored by safety policy."
        : observation.bodySample
          ? `Body sample length: ${observation.bodySample.length}`
          : "No body sample stored.",
      ...observation.headerSample.slice(0, 6),
    ],
    customerImpact: protectedStatus
      ? `${template.customerImpact} This path returned a protected status and should be reviewed.`
      : template.customerImpact,
    developerFix: template.developerFix,
    safeClaim: template.safeClaim,
    blockedClaim: template.blockedClaim,
  };
}

function missingSecurityTxtFinding(observations: RealTemplateObservation[]) {
  const securityTxt = observations.find(
    (item) => item.path === "/.well-known/security.txt",
  );

  if (!securityTxt || securityTxt.status === 200) return null;

  return {
    templateId: "security-txt-missing",
    templateName: "security.txt Missing Check",
    customerName: "Security contact file missing",
    category: "Trust Surface",
    severity: "Low" as RealTemplateSeverity,
    status: "matched" as RealTemplateStatus,
    confidence: "High" as const,
    evidence: [
      `GET ${securityTxt.url}`,
      `Status: ${securityTxt.status || "request failed"}`,
    ],
    customerImpact:
      "Without security.txt, researchers may not know how to responsibly report issues.",
    developerFix:
      "Create /.well-known/security.txt with a security contact and policy.",
    safeClaim:
      "Can claim security.txt was not observed during authorized safe template check.",
    blockedClaim:
      "Cannot claim the website is insecure only because security.txt is missing.",
  } satisfies RealTemplateFinding;
}

function privateBlockedReport(
  url: URL,
  error: unknown,
  intensity: PentestIntensity,
): RealSafeTemplateWorkerReport {
  const finding: RealTemplateFinding = {
    templateId: "target-safety-guard",
    templateName: "Target Safety Guard",
    customerName: "Target blocked by safety policy",
    category: "Safety Control",
    severity: "High",
    status: "blocked",
    confidence: "High",
    evidence: [
      error instanceof Error
        ? error.message
        : "Target blocked by safety policy.",
    ],
    customerImpact:
      "Private/internal targets are blocked to prevent misuse and server-side request risks.",
    developerFix:
      "Use a public verified website domain that you own or are authorized to test.",
    safeClaim: "Can claim target safety guard blocked the run.",
    blockedClaim: "Cannot claim security results for blocked targets.",
  };

  return {
    version: "32.0",
    generatedAt: new Date().toISOString(),
    targetUrl: url.toString(),
    hostname: url.hostname,
    intensity,
    privateTargetBlocked: true,
    totalTemplates: 1,
    executedTemplates: 0,
    matchedTemplates: 0,
    blockedTemplates: 1,
    observations: [],
    findings: [finding],
    safetyBoundary: TEMPLATE_WORKER_BOUNDARY,
    customerSummary:
      "Safe template execution was blocked because the target is private/internal or unsafe for backend testing.",
  };
}

export async function runRealSafeTemplateWorker(input: {
  targetUrl: string;
  intensity?: PentestIntensity;
}): Promise<RealSafeTemplateWorkerReport> {
  const intensity = input.intensity || "standard";
  const url = normalizeTargetUrl(input.targetUrl);

  try {
    await assertPublicTarget(url);
  } catch (error) {
    return privateBlockedReport(url, error, intensity);
  }

  const templates = templatesForIntensity(intensity);
  const observations: RealTemplateObservation[] = [];
  const findings: RealTemplateFinding[] = [];

  for (const template of templates) {
    for (const path of template.paths) {
      const observation = await fetchObservation(url, template, path);
      observations.push(observation);

      if (observationMatchesTemplate(template, observation)) {
        findings.push(buildFinding(template, observation));
      }
    }
  }

  const missingSecurityTxt = missingSecurityTxtFinding(observations);
  if (missingSecurityTxt) findings.push(missingSecurityTxt);

  const uniqueFindings = findings.filter((finding, index, list) => {
    const key = `${finding.templateId}-${finding.customerName}-${finding.status}`;
    return (
      list.findIndex(
        (item) =>
          `${item.templateId}-${item.customerName}-${item.status}` === key,
      ) === index
    );
  });

  return {
    version: "32.0",
    generatedAt: new Date().toISOString(),
    targetUrl: url.toString(),
    hostname: url.hostname,
    intensity,
    privateTargetBlocked: false,
    totalTemplates: templates.length,
    executedTemplates: templates.length,
    matchedTemplates: uniqueFindings.filter(
      (finding) => finding.status === "matched",
    ).length,
    blockedTemplates: uniqueFindings.filter(
      (finding) => finding.status === "blocked",
    ).length,
    observations,
    findings: uniqueFindings,
    safetyBoundary: TEMPLATE_WORKER_BOUNDARY,
    customerSummary:
      "Real safe templates fetched verified public paths, matched response status/header/body patterns, and stored only safe evidence.",
  };
}
