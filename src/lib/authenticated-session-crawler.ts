import dns from "node:dns/promises";
import type {
  EngineEvidenceSeed,
  EngineIntensity,
  VulnerabilitySeed,
} from "@/lib/international-security-engine";
import { validatePublicHttpUrl } from "@/lib/security/ssrf";

export type AuthExecutionMode =
  | "metadata-only"
  | "short-lived-cookie-in-memory"
  | "short-lived-authorization-in-memory";

export type AuthenticatedRouteObservation = {
  url: string;
  path: string;
  method: "GET";
  statusCode: number | null;
  contentType: string | null;
  title: string | null;
  routeType:
    | "authenticated-route"
    | "blocked-route"
    | "form-surface"
    | "input-surface"
    | "auth-signal"
    | "sensitive-route";
  authSignal?: string;
  sensitivity: "low" | "medium" | "high";
  formsMetadata: Array<{
    action: string;
    method: string;
    inputNames: string[];
    inputTypes: string[];
    submitted: false;
  }>;
  linksDiscovered: number;
  blockedReason?: string;
  privateBodyStored: false;
  evidenceMetadata: Record<string, unknown>;
};

export type AuthenticatedCrawlerReport = {
  version: string;
  generatedAt: string;
  targetUrl: string;
  hostname: string;
  intensity: EngineIntensity;
  verifiedScope: boolean;
  executionMode: AuthExecutionMode;
  privateTargetBlocked: boolean;
  runStatus: "completed" | "completed-with-warnings" | "blocked" | "failed";
  crawlerPolicy: {
    sameOriginOnly: boolean;
    allowedMethods: string[];
    blockedMethods: string[];
    allowedPaths: string[];
    blockedPaths: string[];
    maxPages: number;
    maxLinksPerPage: number;
    noFormSubmission: boolean;
    noMutationRequests: boolean;
    noPasswordStorage: boolean;
    noSessionStorage: boolean;
    noPrivateBodyStorage: boolean;
    privateEvidenceProtection: boolean;
  };
  observations: AuthenticatedRouteObservation[];
  normalizedEvidenceSeeds: EngineEvidenceSeed[];
  vulnerabilitySeeds: VulnerabilitySeed[];
  summary: {
    authenticatedRouteCount: number;
    blockedRouteCount: number;
    formCount: number;
    inputCount: number;
    authSignalCount: number;
    sensitiveRouteCount: number;
    privateEvidenceBlockCount: number;
    highRiskCount: number;
    customerSummary: string;
  };
  safetyBoundary: string[];
};

const SAFETY_BOUNDARY = [
  "Approved authenticated scan request required",
  "Verified website scope required",
  "Allowed paths only",
  "Blocked paths enforced",
  "GET-only crawling",
  "No form submission",
  "No POST/PUT/PATCH/DELETE",
  "No password storage",
  "No session/cookie/token storage",
  "No private response body storage",
  "No payment/order mutation",
  "No destructive testing",
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

const DEFAULT_ALLOWED_PATHS = [
  "/dashboard",
  "/account",
  "/profile",
  "/orders",
  "/my-account",
  "/user",
  "/members",
];

const DEFAULT_BLOCKED_PATHS = [
  "/checkout",
  "/payment",
  "/pay",
  "/delete",
  "/remove",
  "/destroy",
  "/edit",
  "/update",
  "/publish",
  "/upload",
  "/admin/delete",
  "/admin/users",
  "/settings/password",
  "/settings/email",
  "/logout",
];

const SENSITIVE_ROUTE_KEYWORDS = [
  "account",
  "profile",
  "user",
  "users",
  "member",
  "members",
  "order",
  "orders",
  "invoice",
  "billing",
  "payment",
  "address",
  "settings",
  "token",
  "session",
  "admin",
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

function buildPolicy(input: {
  intensity: EngineIntensity;
  allowedPaths?: string[];
  blockedPaths?: string[];
}) {
  const allowedPaths = (
    input.allowedPaths?.length ? input.allowedPaths : DEFAULT_ALLOWED_PATHS
  )
    .map((path) => path.trim())
    .filter(Boolean);

  const blockedPaths = [...DEFAULT_BLOCKED_PATHS, ...(input.blockedPaths || [])]
    .map((path) => path.trim())
    .filter(Boolean);

  return {
    sameOriginOnly: true,
    allowedMethods: ["GET"],
    blockedMethods: ["POST", "PUT", "PATCH", "DELETE"],
    allowedPaths,
    blockedPaths,
    maxPages:
      input.intensity === "light" ? 8 : input.intensity === "deep" ? 40 : 20,
    maxLinksPerPage:
      input.intensity === "light" ? 15 : input.intensity === "deep" ? 70 : 35,
    noFormSubmission: true,
    noMutationRequests: true,
    noPasswordStorage: true,
    noSessionStorage: true,
    noPrivateBodyStorage: true,
    privateEvidenceProtection: true,
  };
}

function sameOrigin(base: URL, candidate: URL) {
  return (
    base.protocol === candidate.protocol &&
    base.hostname === candidate.hostname &&
    base.port === candidate.port
  );
}

function normalizePath(path: string) {
  if (!path.trim()) return "/";
  return path.trim().startsWith("/") ? path.trim() : `/${path.trim()}`;
}

function isAllowedPath(pathname: string, allowedPaths: string[]) {
  return allowedPaths.some((path) => {
    const allowed = normalizePath(path);
    return pathname === allowed || pathname.startsWith(`${allowed}/`);
  });
}

function isBlockedPath(pathname: string, blockedPaths: string[]) {
  const lower = pathname.toLowerCase();

  return blockedPaths.some((path) => {
    const blocked = normalizePath(path).toLowerCase();
    return (
      lower === blocked ||
      lower.startsWith(`${blocked}/`) ||
      lower.includes(blocked)
    );
  });
}

function isSensitiveRoute(pathname: string) {
  const lower = pathname.toLowerCase();

  return SENSITIVE_ROUTE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function normalizeCandidateUrl(base: URL, raw: string) {
  const value = raw.trim();
  if (
    !value ||
    value.startsWith("#") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("javascript:")
  ) {
    return null;
  }

  try {
    const url = new URL(value, base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    if (!sameOrigin(base, url)) return null;
    return url;
  } catch {
    return null;
  }
}

function makeUrl(base: URL, path: string) {
  const url = new URL(base.toString());
  url.pathname = normalizePath(path);
  url.search = "";
  url.hash = "";
  return url;
}

function extractTitle(html: string) {
  return html.match(/<title[^>]*>([^<]{0,180})<\/title>/i)?.[1]?.trim() || null;
}

function extractLinks(baseUrl: URL, html: string) {
  return [...html.matchAll(/\s(?:href|src)=["']([^"']{1,700})["']/gi)]
    .map((match) => normalizeCandidateUrl(baseUrl, match[1]))
    .filter((url): url is URL => Boolean(url));
}

function extractForms(baseUrl: URL, html: string) {
  const forms: AuthenticatedRouteObservation["formsMetadata"] = [];

  for (const formMatch of html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/gi)) {
    const full = formMatch[0];
    const body = formMatch[1] || "";
    const method =
      full.match(/\smethod=["']?([a-zA-Z]+)["']?/i)?.[1]?.toUpperCase() ||
      "GET";
    const action =
      full.match(/\saction=["']([^"']{0,700})["']/i)?.[1] || baseUrl.pathname;
    const actionUrl = normalizeCandidateUrl(baseUrl, action) || baseUrl;
    const inputNames = [...body.matchAll(/\sname=["']([^"']{1,120})["']/gi)]
      .map((match) => match[1])
      .filter((name) => !/password|token|secret|csrf/i.test(name))
      .slice(0, 30);
    const inputTypes = [...body.matchAll(/\stype=["']([^"']{1,60})["']/gi)]
      .map((match) => match[1].toLowerCase())
      .filter((type) => type !== "password" && type !== "hidden")
      .slice(0, 20);

    forms.push({
      action: actionUrl.toString(),
      method,
      inputNames: [...new Set(inputNames)],
      inputTypes: [...new Set(inputTypes)],
      submitted: false,
    });
  }

  return forms;
}

function authSignal(statusCode: number | null, body: string) {
  const lower = body.toLowerCase();

  if (statusCode === 401) return "authentication required";
  if (statusCode === 403) return "authorization denied";
  if (
    lower.includes("login") ||
    lower.includes("sign in") ||
    lower.includes("signin")
  )
    return "login wall signal";
  if (lower.includes("unauthorized") || lower.includes("forbidden"))
    return "auth error text signal";
  return undefined;
}

async function fetchAuthenticatedMetadata(input: {
  url: URL;
  executionMode: AuthExecutionMode;
  sessionHeaderValue?: string;
  maxBodyReadBytes: number;
}) {
  const headers: Record<string, string> = {
    "User-Agent": "SecureMSMEAI-AuthenticatedCrawler/1.0",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  const secret = input.sessionHeaderValue?.trim();
  if (secret && input.executionMode === "short-lived-cookie-in-memory") {
    headers.Cookie = secret;
  }

  if (secret && input.executionMode === "short-lived-authorization-in-memory") {
    headers.Authorization = secret.toLowerCase().startsWith("bearer ")
      ? secret
      : `Bearer ${secret}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    await validatePublicHttpUrl(input.url.toString());
    const response = await fetch(input.url.toString(), {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers,
    });

    const contentType = response.headers.get("content-type") || "";
    let body = "";

    if (
      contentType.includes("text") ||
      contentType.includes("html") ||
      contentType.includes("json") ||
      contentType.includes("xml")
    ) {
      body = (await response.text()).slice(0, input.maxBodyReadBytes);
    }

    return {
      statusCode: response.status,
      contentType,
      body,
    };
  } catch (error) {
    return {
      statusCode: null,
      contentType: null,
      body: "",
      errorMessage: error instanceof Error ? error.message : "Request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function createBlockedReport(
  target: URL,
  intensity: EngineIntensity,
  reason: string,
): AuthenticatedCrawlerReport {
  const policy = buildPolicy({ intensity });
  const evidence: EngineEvidenceSeed = {
    evidenceKey: "authenticated-crawler-safety-block",
    sourceModule: "authenticated-session-safe-crawler",
    affectedAsset: target.toString(),
    assetType: "auth-route",
    proofType: "policy",
    severity: "High",
    confidence: "High",
    falsePositiveRisk: "Low",
    title: "Authenticated crawler blocked by safety policy",
    observedValue: reason,
    expectedValue:
      "Only verified and approved authenticated scopes should be crawled",
    evidenceSummary:
      "The authenticated crawler did not run because safety/scope requirements were not satisfied.",
    businessImpact:
      "Blocking prevents unsafe authenticated testing, private data exposure and unauthorized route access.",
    developerFix:
      "Create an authenticated scan request, get approval, use allowed paths only, and avoid private data storage.",
    safeClaim: "Can claim authenticated crawler was blocked by safety policy.",
    blockedClaim: "Cannot claim authenticated route coverage for blocked runs.",
    standards: {
      owaspWstg: ["WSTG-ATHN-01", "WSTG-ATHZ-01"],
      owaspAsvs: ["V3.1", "V4.1"],
      owaspApiTop10: ["API1", "API2", "API5"],
      nistSsdf: ["RV.1"],
    },
    rawMetadata: { reason },
  };

  return {
    version: "41.0",
    generatedAt: new Date().toISOString(),
    targetUrl: target.toString(),
    hostname: target.hostname,
    intensity,
    verifiedScope: false,
    executionMode: "metadata-only",
    privateTargetBlocked: true,
    runStatus: "blocked",
    crawlerPolicy: policy,
    observations: [
      {
        url: target.toString(),
        path: target.pathname || "/",
        method: "GET",
        statusCode: null,
        contentType: null,
        title: null,
        routeType: "blocked-route",
        sensitivity: "high",
        formsMetadata: [],
        linksDiscovered: 0,
        blockedReason: reason,
        privateBodyStored: false,
        evidenceMetadata: { reason },
      },
    ],
    normalizedEvidenceSeeds: [evidence],
    vulnerabilitySeeds: [],
    summary: {
      authenticatedRouteCount: 0,
      blockedRouteCount: 1,
      formCount: 0,
      inputCount: 0,
      authSignalCount: 0,
      sensitiveRouteCount: 0,
      privateEvidenceBlockCount: 1,
      highRiskCount: 1,
      customerSummary: "Authenticated crawler was blocked by safety policy.",
    },
    safetyBoundary: SAFETY_BOUNDARY,
  };
}

function dedupeObservations(observations: AuthenticatedRouteObservation[]) {
  const seen = new Set<string>();
  const output: AuthenticatedRouteObservation[] = [];

  for (const observation of observations) {
    const key = `${observation.routeType}:${observation.url}:${observation.blockedReason || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(observation);
  }

  return output;
}

function buildEvidenceAndVulnerabilities(input: {
  targetUrl: string;
  observations: AuthenticatedRouteObservation[];
  summary: AuthenticatedCrawlerReport["summary"];
}) {
  const evidence: EngineEvidenceSeed[] = [
    {
      evidenceKey: "authenticated-session-safe-crawler-execution",
      sourceModule: "authenticated-session-safe-crawler",
      affectedAsset: input.targetUrl,
      assetType: "auth-route",
      proofType: "observation",
      severity: input.summary.highRiskCount ? "Medium" : "Info",
      confidence: "Medium",
      falsePositiveRisk: "Medium",
      title: "Authenticated route metadata inventory generated",
      observedValue: `${input.summary.authenticatedRouteCount} routes, ${input.summary.formCount} forms, ${input.summary.blockedRouteCount} blocked routes`,
      expectedValue:
        "Authenticated route crawling should be safe, allowed-path scoped and metadata-only",
      evidenceSummary:
        "The crawler used approved scope rules to observe authenticated routes, forms and auth signals without submitting forms, mutating data or storing private response bodies.",
      businessImpact:
        "Authenticated route inventory helps identify where access-control, session, CSRF and private-data protections need review.",
      developerFix:
        "Review sensitive authenticated routes, enforce object-level authorization, protect forms, and retest using safe authenticated scope.",
      safeClaim:
        "Can claim authenticated route metadata was inventoried safely.",
      blockedClaim:
        "Cannot claim broken access control, private data exposure or business-logic vulnerability without safe validation.",
      standards: {
        owaspWstg: ["WSTG-ATHN-01", "WSTG-ATHZ-01", "WSTG-SESS-01"],
        owaspAsvs: ["V3.1", "V4.1", "V5.1"],
        owaspApiTop10: ["API1", "API2", "API5"],
        nistSsdf: ["RV.1", "RV.2"],
      },
      rawMetadata: input.summary,
    },
  ];

  const vulnerabilities: VulnerabilitySeed[] = [];

  const sensitiveRoutes = input.observations.filter(
    (observation) => observation.routeType === "sensitive-route",
  );
  if (sensitiveRoutes.length) {
    vulnerabilities.push({
      vulnerabilityKey:
        "authenticated-sensitive-routes-need-access-control-review",
      title: "Sensitive authenticated routes need access-control review",
      category: "Authenticated Security",
      severity: "Medium",
      confidence: "Medium",
      exploitabilityScore: 45,
      businessImpactScore: 78,
      priorityScore: 74,
      affectedAssets: sensitiveRoutes
        .map((observation) => observation.url)
        .slice(0, 25),
      standards: {
        owaspWstg: ["WSTG-ATHZ-01"],
        owaspAsvs: ["V4.1"],
        owaspApiTop10: ["API1", "API5"],
        nistSsdf: ["RV.1"],
      },
      businessImpact:
        "Sensitive authenticated routes can expose user/account/order/profile data if access control is weak.",
      developerFix:
        "Review object-level authorization, role checks and least-privilege access for sensitive routes.",
      verificationGuidance:
        "Use a future broken access control signal engine with approved test accounts and no private data storage.",
      safeClaim:
        "Can claim sensitive authenticated routes need access-control review.",
      blockedClaim:
        "Cannot claim broken access control from route inventory alone.",
    });
  }

  if (input.summary.formCount > 0) {
    vulnerabilities.push({
      vulnerabilityKey:
        "authenticated-form-surface-needs-csrf-validation-review",
      title: "Authenticated form surface needs CSRF and validation review",
      category: "Authenticated Input Surface",
      severity: "Medium",
      confidence: "Medium",
      exploitabilityScore: 40,
      businessImpactScore: 70,
      priorityScore: 68,
      affectedAssets: input.observations
        .filter((observation) => observation.formsMetadata.length)
        .map((observation) => observation.url)
        .slice(0, 25),
      standards: {
        owaspWstg: ["WSTG-SESS-05", "WSTG-INPV-01"],
        owaspAsvs: ["V5.1", "V3.5"],
        owaspApiTop10: ["API5"],
        nistSsdf: ["PW.8", "RV.1"],
      },
      businessImpact:
        "Authenticated forms may change user or business data if CSRF, validation, or authorization controls are weak.",
      developerFix:
        "Review CSRF protection, server-side validation, authorization checks and audit logging for authenticated forms.",
      verificationGuidance:
        "No forms were submitted. Use future safe form validation workflow only in staging or explicit approved scope.",
      safeClaim: "Can claim authenticated forms were inventoried for review.",
      blockedClaim:
        "Cannot claim CSRF/injection vulnerability without safe validation evidence.",
    });
  }

  if (input.summary.blockedRouteCount > 0) {
    vulnerabilities.push({
      vulnerabilityKey: "authenticated-blocked-route-policy-enforced",
      title: "Authenticated crawler blocked risky/mutation routes",
      category: "Safety Control",
      severity: "Low",
      confidence: "High",
      exploitabilityScore: 10,
      businessImpactScore: 45,
      priorityScore: 40,
      affectedAssets: input.observations
        .filter((observation) => observation.routeType === "blocked-route")
        .map((observation) => observation.url)
        .slice(0, 25),
      standards: {
        owaspWstg: ["WSTG-BUSL-04"],
        owaspAsvs: ["V1.1"],
        owaspApiTop10: ["API5"],
        nistSsdf: ["RV.1"],
      },
      businessImpact:
        "Blocking mutation and dangerous routes protects test accounts and production data during authenticated review.",
      developerFix:
        "Keep blocked path policies strict. Use staging for business-flow testing.",
      verificationGuidance:
        "Review blocked route list before any future deeper authenticated testing.",
      safeClaim: "Can claim dangerous route blocking policy was enforced.",
      blockedClaim: "Cannot claim blocked routes were tested.",
    });
  }

  return { evidence, vulnerabilities };
}

export async function runAuthenticatedSessionCrawler(input: {
  targetUrl: string;
  intensity?: EngineIntensity;
  verifiedScope?: boolean;
  approvedRequest?: boolean;
  allowedPaths?: string[];
  blockedPaths?: string[];
  executionMode?: AuthExecutionMode;
  sessionHeaderValue?: string;
}): Promise<AuthenticatedCrawlerReport> {
  const intensity = input.intensity || "standard";
  const target = normalizeTargetUrl(input.targetUrl);

  if (!input.verifiedScope) {
    return createBlockedReport(
      target,
      intensity,
      "Verified website scope and permission are required.",
    );
  }

  if (!input.approvedRequest) {
    return createBlockedReport(
      target,
      intensity,
      "Approved authenticated scan request is required.",
    );
  }

  try {
    await assertPublicTarget(target);
  } catch (error) {
    return createBlockedReport(
      target,
      intensity,
      error instanceof Error ? error.message : "Target blocked.",
    );
  }

  const executionMode = input.executionMode || "metadata-only";
  const policy = buildPolicy({
    intensity,
    allowedPaths: input.allowedPaths,
    blockedPaths: input.blockedPaths,
  });

  const queue = policy.allowedPaths.map((path) => makeUrl(target, path));
  const queued = new Set(queue.map((url) => url.toString()));
  const visited = new Set<string>();
  const observations: AuthenticatedRouteObservation[] = [];

  while (queue.length && visited.size < policy.maxPages) {
    const current = queue.shift()!;
    const currentKey = current.toString();

    if (visited.has(currentKey)) continue;

    if (!sameOrigin(target, current)) {
      observations.push({
        url: current.toString(),
        path: current.pathname,
        method: "GET",
        statusCode: null,
        contentType: null,
        title: null,
        routeType: "blocked-route",
        sensitivity: "high",
        formsMetadata: [],
        linksDiscovered: 0,
        blockedReason: "cross-origin blocked",
        privateBodyStored: false,
        evidenceMetadata: { sameOrigin: false },
      });
      continue;
    }

    if (
      !isAllowedPath(current.pathname, policy.allowedPaths) ||
      isBlockedPath(current.pathname, policy.blockedPaths)
    ) {
      observations.push({
        url: current.toString(),
        path: current.pathname,
        method: "GET",
        statusCode: null,
        contentType: null,
        title: null,
        routeType: "blocked-route",
        sensitivity: "high",
        formsMetadata: [],
        linksDiscovered: 0,
        blockedReason: !isAllowedPath(current.pathname, policy.allowedPaths)
          ? "outside allowed paths"
          : "blocked path policy",
        privateBodyStored: false,
        evidenceMetadata: {
          allowedPaths: policy.allowedPaths,
          blockedPaths: policy.blockedPaths,
        },
      });
      continue;
    }

    visited.add(currentKey);
    const fetched = await fetchAuthenticatedMetadata({
      url: current,
      executionMode,
      sessionHeaderValue: input.sessionHeaderValue,
      maxBodyReadBytes: 160_000,
    });

    const title = extractTitle(fetched.body);
    const links = extractLinks(current, fetched.body).slice(
      0,
      policy.maxLinksPerPage,
    );
    const forms = extractForms(current, fetched.body);
    const signal = authSignal(fetched.statusCode, fetched.body);
    const sensitive = isSensitiveRoute(current.pathname);

    observations.push({
      url: current.toString(),
      path: current.pathname,
      method: "GET",
      statusCode: fetched.statusCode,
      contentType: fetched.contentType,
      title,
      routeType: signal
        ? "auth-signal"
        : sensitive
          ? "sensitive-route"
          : "authenticated-route",
      authSignal: signal,
      sensitivity: sensitive ? "high" : signal ? "medium" : "medium",
      formsMetadata: forms,
      linksDiscovered: links.length,
      privateBodyStored: false,
      evidenceMetadata: {
        executionMode,
        sessionHeaderStored: false,
        bodyStored: false,
        bodyParsedInMemoryOnly: true,
        formsSubmitted: false,
      },
    });

    for (const link of links) {
      if (!sameOrigin(target, link)) continue;

      if (
        !isAllowedPath(link.pathname, policy.allowedPaths) ||
        isBlockedPath(link.pathname, policy.blockedPaths)
      ) {
        observations.push({
          url: link.toString(),
          path: link.pathname,
          method: "GET",
          statusCode: null,
          contentType: null,
          title: null,
          routeType: "blocked-route",
          sensitivity: "high",
          formsMetadata: [],
          linksDiscovered: 0,
          blockedReason: !isAllowedPath(link.pathname, policy.allowedPaths)
            ? "outside allowed paths"
            : "blocked path policy",
          privateBodyStored: false,
          evidenceMetadata: {
            sourceUrl: current.toString(),
            formsSubmitted: false,
          },
        });
        continue;
      }

      if (!queued.has(link.toString()) && !visited.has(link.toString())) {
        queued.add(link.toString());
        queue.push(link);
      }
    }
  }

  const deduped = dedupeObservations(observations);
  const summary = {
    authenticatedRouteCount: deduped.filter(
      (observation) =>
        observation.routeType === "authenticated-route" ||
        observation.routeType === "sensitive-route",
    ).length,
    blockedRouteCount: deduped.filter(
      (observation) => observation.routeType === "blocked-route",
    ).length,
    formCount: deduped.reduce(
      (total, observation) => total + observation.formsMetadata.length,
      0,
    ),
    inputCount: deduped.reduce(
      (total, observation) =>
        total +
        observation.formsMetadata.reduce(
          (count, form) => count + form.inputNames.length,
          0,
        ),
      0,
    ),
    authSignalCount: deduped.filter((observation) => observation.authSignal)
      .length,
    sensitiveRouteCount: deduped.filter(
      (observation) => observation.routeType === "sensitive-route",
    ).length,
    privateEvidenceBlockCount: deduped.length,
    highRiskCount: deduped.filter(
      (observation) => observation.sensitivity === "high",
    ).length,
    customerSummary:
      "Authenticated session-safe crawler generated metadata-only route inventory using approved allowed paths. No forms, mutations, passwords, sessions or private response bodies were stored.",
  };

  const built = buildEvidenceAndVulnerabilities({
    targetUrl: target.toString(),
    observations: deduped,
    summary,
  });

  return {
    version: "41.0",
    generatedAt: new Date().toISOString(),
    targetUrl: target.toString(),
    hostname: target.hostname,
    intensity,
    verifiedScope: true,
    executionMode,
    privateTargetBlocked: false,
    runStatus: "completed",
    crawlerPolicy: policy,
    observations: deduped,
    normalizedEvidenceSeeds: built.evidence,
    vulnerabilitySeeds: built.vulnerabilities,
    summary,
    safetyBoundary: SAFETY_BOUNDARY,
  };
}
