import dns from "node:dns/promises";
import type {
  EngineEvidenceSeed,
  EngineIntensity,
  VulnerabilitySeed,
} from "@/lib/international-security-engine";
import { validatePublicHttpUrl } from "@/lib/security/ssrf";

export type AccessControlComparisonMode =
  "low-privilege-metadata" | "dual-role-metadata";

export type AccessExpectation =
  | "public-ok"
  | "authenticated-ok"
  | "low-privilege-ok"
  | "privileged-only"
  | "admin-only"
  | "blocked"
  | "unknown";

export type AccessControlRouteComparison = {
  url: string;
  path: string;
  expectedAccess: AccessExpectation;
  lowRoleStatus: number | null;
  highRoleStatus: number | null;
  comparisonResult:
    | "expected"
    | "needs-review"
    | "blocked"
    | "not-tested"
    | "potential-bac-signal";
  riskLevel: "Critical" | "High" | "Medium" | "Low" | "Info";
  riskSignals: string[];
  objectIdSignals: string[];
  routeSensitivity: "low" | "medium" | "high";
  evidenceMetadata: Record<string, unknown>;
  privateBodyStored: false;
};

export type AccessControlFinding = {
  category:
    | "Admin Boundary"
    | "Sensitive Route"
    | "Object Identifier"
    | "Role Differential"
    | "Blocked Route"
    | "Safety";
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  confidence: "High" | "Medium" | "Low";
  affectedUrl: string;
  observedValue: string;
  expectedValue: string;
  riskSignals: string[];
  evidenceSummary: string;
  businessImpact: string;
  developerFix: string;
  safeClaim: string;
  blockedClaim: string;
  standards: Record<string, string[]>;
  evidenceMetadata: Record<string, unknown>;
};

export type AccessControlReviewReport = {
  version: string;
  generatedAt: string;
  targetUrl: string;
  hostname: string;
  intensity: EngineIntensity;
  verifiedScope: boolean;
  approvedRequest: boolean;
  comparisonMode: AccessControlComparisonMode;
  privateTargetBlocked: boolean;
  reviewStatus: "completed" | "completed-with-warnings" | "blocked" | "failed";
  reviewPolicy: {
    sameOriginOnly: boolean;
    allowedMethods: string[];
    blockedMethods: string[];
    allowedPaths: string[];
    blockedPaths: string[];
    expectedPrivilegedPaths: string[];
    maxRoutes: number;
    noFormSubmission: boolean;
    noMutationRequests: boolean;
    noPasswordStorage: boolean;
    noSessionStorage: boolean;
    noPrivateBodyStorage: boolean;
    metadataOnly: boolean;
  };
  comparisons: AccessControlRouteComparison[];
  findings: AccessControlFinding[];
  normalizedEvidenceSeeds: EngineEvidenceSeed[];
  vulnerabilitySeeds: VulnerabilitySeed[];
  summary: {
    routeReviewCount: number;
    comparisonCount: number;
    sensitiveRouteSignalCount: number;
    adminRouteSignalCount: number;
    objectIdSignalCount: number;
    unexpectedAccessSignalCount: number;
    blockedRouteCount: number;
    privateEvidenceBlockCount: number;
    highRiskCount: number;
    customerSummary: string;
  };
  safetyBoundary: string[];
};

const SAFETY_BOUNDARY = [
  "Approved authenticated scan request required",
  "Verified website scope required",
  "GET-only metadata comparison",
  "Allowed paths only",
  "Blocked paths enforced",
  "No form submission",
  "No POST/PUT/PATCH/DELETE",
  "No password storage",
  "No session/cookie/token storage",
  "No private response body storage",
  "No exploit payloads",
  "No IDOR exploitation",
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
  "/",
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
  "/logout",
  "/admin/delete",
  "/admin/users/delete",
  "/settings/password",
  "/settings/email",
];

const DEFAULT_PRIVILEGED_PATHS = [
  "/admin",
  "/admin/users",
  "/staff",
  "/owner",
  "/manager",
  "/settings",
  "/billing",
  "/invoices",
  "/orders",
  "/users",
];

const ADMIN_KEYWORDS = [
  "admin",
  "staff",
  "owner",
  "manager",
  "superuser",
  "moderator",
];
const SENSITIVE_KEYWORDS = [
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
  "api-key",
  "apikey",
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

function normalizePath(path: string) {
  if (!path.trim()) return "/";
  return path.trim().startsWith("/") ? path.trim() : `/${path.trim()}`;
}

function sameOrigin(base: URL, candidate: URL) {
  return (
    base.protocol === candidate.protocol &&
    base.hostname === candidate.hostname &&
    base.port === candidate.port
  );
}

function makeUrl(base: URL, path: string) {
  const url = new URL(base.toString());
  url.pathname = normalizePath(path);
  url.hash = "";
  return url;
}

function normalizeCandidateUrl(base: URL, raw: string) {
  try {
    const url = new URL(raw, base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    if (!sameOrigin(base, url)) return null;
    return url;
  } catch {
    return null;
  }
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

function isAdminRoute(pathname: string) {
  const lower = pathname.toLowerCase();
  return ADMIN_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function isSensitiveRoute(pathname: string) {
  const lower = pathname.toLowerCase();
  return (
    SENSITIVE_KEYWORDS.some((keyword) => lower.includes(keyword)) ||
    isAdminRoute(pathname)
  );
}

function objectIdSignals(url: URL) {
  const signals: string[] = [];
  const path = url.pathname;

  if (/\/\d{2,}(?:\/|$)/.test(path)) signals.push("numeric path object id");
  if (/\/[0-9a-f]{8,}(?:\/|$)/i.test(path))
    signals.push("hex/uuid-like path object id");

  for (const [key, value] of url.searchParams.entries()) {
    const lower = key.toLowerCase();
    if (
      [
        "id",
        "user",
        "user_id",
        "userid",
        "account",
        "account_id",
        "order",
        "order_id",
        "invoice",
        "invoice_id",
      ].includes(lower)
    ) {
      signals.push(`object id query parameter: ${key}`);
    }

    if (/^\d{2,}$/.test(value) || /^[0-9a-f-]{8,}$/i.test(value)) {
      signals.push(`identifier-like query value: ${key}`);
    }
  }

  return [...new Set(signals)];
}

function buildPolicy(input: {
  intensity: EngineIntensity;
  allowedPaths?: string[];
  blockedPaths?: string[];
  expectedPrivilegedPaths?: string[];
}) {
  const allowedPaths = [
    ...new Set([
      ...(input.allowedPaths?.length
        ? input.allowedPaths
        : DEFAULT_ALLOWED_PATHS),
      ...DEFAULT_PRIVILEGED_PATHS,
    ]),
  ]
    .map(normalizePath)
    .filter(Boolean);

  const blockedPaths = [
    ...new Set([...DEFAULT_BLOCKED_PATHS, ...(input.blockedPaths || [])]),
  ]
    .map(normalizePath)
    .filter(Boolean);

  const expectedPrivilegedPaths = [
    ...new Set([
      ...(input.expectedPrivilegedPaths || []),
      ...DEFAULT_PRIVILEGED_PATHS,
    ]),
  ]
    .map(normalizePath)
    .filter(Boolean);

  return {
    sameOriginOnly: true,
    allowedMethods: ["GET"],
    blockedMethods: ["POST", "PUT", "PATCH", "DELETE"],
    allowedPaths,
    blockedPaths,
    expectedPrivilegedPaths,
    maxRoutes:
      input.intensity === "light" ? 15 : input.intensity === "deep" ? 80 : 40,
    noFormSubmission: true,
    noMutationRequests: true,
    noPasswordStorage: true,
    noSessionStorage: true,
    noPrivateBodyStorage: true,
    metadataOnly: true,
  };
}

async function fetchMetadata(input: {
  url: URL;
  sessionValue?: string;
  sessionMode: "none" | "cookie" | "authorization";
}) {
  const headers: Record<string, string> = {
    "User-Agent": "SecureMSMEAI-BrokenAccessControlSignalEngine/1.0",
    Accept: "text/html,application/json,text/plain,*/*",
  };

  const secret = input.sessionValue?.trim();
  if (secret && input.sessionMode === "cookie") {
    headers.Cookie = secret;
  }

  if (secret && input.sessionMode === "authorization") {
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

    return {
      statusCode: response.status,
      contentType: response.headers.get("content-type") || null,
      location: response.headers.get("location"),
    };
  } catch {
    return {
      statusCode: null,
      contentType: null,
      location: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function expectedAccess(
  pathname: string,
  expectedPrivilegedPaths: string[],
): AccessExpectation {
  if (isAdminRoute(pathname)) return "admin-only";

  if (
    expectedPrivilegedPaths.some((path) => {
      const expected = normalizePath(path);
      return pathname === expected || pathname.startsWith(`${expected}/`);
    })
  ) {
    return "privileged-only";
  }

  if (isSensitiveRoute(pathname)) return "authenticated-ok";
  return "low-privilege-ok";
}

function statusLooksAccessible(status: number | null) {
  return typeof status === "number" && status >= 200 && status < 400;
}

function classifyComparison(input: {
  url: URL;
  expectedAccess: AccessExpectation;
  lowRoleStatus: number | null;
  highRoleStatus: number | null;
  mode: AccessControlComparisonMode;
  blocked?: boolean;
}) {
  const signals: string[] = [];
  const objectSignals = objectIdSignals(input.url);
  const adminRoute = isAdminRoute(input.url.pathname);
  const sensitiveRoute = isSensitiveRoute(input.url.pathname);
  const lowAccessible = statusLooksAccessible(input.lowRoleStatus);
  const highAccessible = statusLooksAccessible(input.highRoleStatus);

  if (input.blocked) {
    return {
      comparisonResult: "blocked" as const,
      riskLevel: "Info" as const,
      riskSignals: ["blocked by safety policy"],
      objectIdSignals: objectSignals,
      routeSensitivity: "high" as const,
    };
  }

  if (adminRoute) signals.push("admin route signal");
  if (sensitiveRoute) signals.push("sensitive route signal");
  if (objectSignals.length) signals.push("object identifier signal");
  if (
    input.expectedAccess === "admin-only" ||
    input.expectedAccess === "privileged-only"
  )
    signals.push("privileged-only expected access");

  if (
    (input.expectedAccess === "admin-only" ||
      input.expectedAccess === "privileged-only") &&
    lowAccessible
  ) {
    signals.push("low-privilege accessible status on privileged route");
  }

  if (
    input.mode === "dual-role-metadata" &&
    lowAccessible &&
    highAccessible &&
    (input.expectedAccess === "admin-only" ||
      input.expectedAccess === "privileged-only")
  ) {
    signals.push(
      "low and high role both received accessible status on privileged route",
    );
  }

  if (objectSignals.length && lowAccessible && sensitiveRoute) {
    signals.push("low-privilege accessible sensitive object-id route");
  }

  const hasPotentialBac = signals.some(
    (signal) =>
      signal.includes("low-privilege accessible") ||
      signal.includes("both received accessible"),
  );

  const routeSensitivity: "low" | "medium" | "high" =
    adminRoute || objectSignals.length || (sensitiveRoute && lowAccessible)
      ? "high"
      : sensitiveRoute
        ? "medium"
        : "low";

  let riskLevel: AccessControlRouteComparison["riskLevel"] = "Info";
  if (hasPotentialBac && adminRoute) riskLevel = "High";
  else if (hasPotentialBac) riskLevel = "Medium";
  else if (objectSignals.length || sensitiveRoute || adminRoute)
    riskLevel = "Low";

  return {
    comparisonResult: hasPotentialBac
      ? ("potential-bac-signal" as const)
      : signals.length
        ? ("needs-review" as const)
        : ("expected" as const),
    riskLevel,
    riskSignals: signals,
    objectIdSignals: objectSignals,
    routeSensitivity,
  };
}

function findingStandards() {
  return {
    owaspWstg: ["WSTG-ATHZ-01", "WSTG-ATHZ-02"],
    owaspAsvs: ["V4.1", "V4.2", "V13.1"],
    owaspApiTop10: ["API1", "API5"],
    nistSsdf: ["RV.1", "RV.2"],
  };
}

function buildFindings(comparisons: AccessControlRouteComparison[]) {
  const findings: AccessControlFinding[] = [];

  for (const comparison of comparisons) {
    if (comparison.comparisonResult === "blocked") {
      findings.push({
        category: "Blocked Route",
        title: "Route blocked by access-control review safety policy",
        severity: "Info",
        confidence: "High",
        affectedUrl: comparison.url,
        observedValue: comparison.riskSignals.join(", "),
        expectedValue: "Dangerous or outside-scope routes should be blocked",
        riskSignals: comparison.riskSignals,
        evidenceSummary:
          "A route was intentionally not tested because it matched blocked/out-of-scope policy.",
        businessImpact:
          "Blocking protects production data and prevents unsafe authenticated testing.",
        developerFix:
          "Review allowed and blocked path scope before deeper access-control testing.",
        safeClaim: "Can claim route was blocked by safety policy.",
        blockedClaim: "Cannot claim the blocked route was tested.",
        standards: findingStandards(),
        evidenceMetadata: { privateBodyStored: false },
      });
      continue;
    }

    if (
      comparison.riskSignals.includes(
        "low-privilege accessible status on privileged route",
      )
    ) {
      findings.push({
        category:
          comparison.expectedAccess === "admin-only"
            ? "Admin Boundary"
            : "Role Differential",
        title: "Potential broken access control signal",
        severity:
          comparison.expectedAccess === "admin-only" ? "High" : "Medium",
        confidence: "Medium",
        affectedUrl: comparison.url,
        observedValue: comparison.riskSignals.join(", "),
        expectedValue:
          "Low-privilege users should not receive accessible status for privileged-only routes",
        riskSignals: comparison.riskSignals,
        evidenceSummary:
          "A low-privilege metadata check received an accessible HTTP status on a route expected to be privileged/admin-only. Response body was not stored.",
        businessImpact:
          "If confirmed, weak access boundaries can expose admin, account, order, billing or user management areas.",
        developerFix:
          "Enforce server-side authorization on every privileged route. Do not rely only on hidden links or frontend checks.",
        safeClaim: "Can claim a potential access-control signal needs review.",
        blockedClaim:
          "Cannot claim confirmed broken access control without safe role-specific validation and authorization evidence.",
        standards: findingStandards(),
        evidenceMetadata: comparison.evidenceMetadata,
      });
    }

    if (comparison.objectIdSignals.length) {
      findings.push({
        category: "Object Identifier",
        title: "Object identifier route needs authorization review",
        severity: comparison.riskLevel === "High" ? "High" : "Medium",
        confidence: "Medium",
        affectedUrl: comparison.url,
        observedValue: comparison.objectIdSignals.join(", "),
        expectedValue:
          "Object identifiers should be protected by object-level authorization checks",
        riskSignals: comparison.riskSignals,
        evidenceSummary:
          "The route contains object identifier signals. No ID values were modified and no private body was stored.",
        businessImpact:
          "Object identifiers in URLs can become IDOR/BOLA risk if authorization checks are missing.",
        developerFix:
          "Check object ownership/role permissions server-side for every ID-based route and API endpoint.",
        safeClaim:
          "Can claim object identifier authorization review is required.",
        blockedClaim:
          "Cannot claim IDOR/BOLA exploitability because identifiers were not manipulated.",
        standards: findingStandards(),
        evidenceMetadata: comparison.evidenceMetadata,
      });
    }

    if (
      comparison.routeSensitivity === "high" &&
      comparison.comparisonResult !== "potential-bac-signal" &&
      comparison.objectIdSignals.length === 0
    ) {
      findings.push({
        category: isAdminRoute(comparison.path)
          ? "Admin Boundary"
          : "Sensitive Route",
        title: "Sensitive access boundary needs review",
        severity: "Low",
        confidence: "Medium",
        affectedUrl: comparison.url,
        observedValue:
          comparison.riskSignals.join(", ") || "sensitive route pattern",
        expectedValue:
          "Sensitive authenticated routes should enforce server-side authorization",
        riskSignals: comparison.riskSignals,
        evidenceSummary:
          "A sensitive/admin route pattern was observed and classified for authorization review.",
        businessImpact:
          "Sensitive routes need strict authorization to protect account, user, order and admin workflows.",
        developerFix:
          "Review route middleware and server-side authorization for this route.",
        safeClaim:
          "Can claim sensitive route access-boundary review is recommended.",
        blockedClaim:
          "Cannot claim broken access control from route pattern alone.",
        standards: findingStandards(),
        evidenceMetadata: comparison.evidenceMetadata,
      });
    }
  }

  return dedupeFindings(findings);
}

function dedupeFindings(findings: AccessControlFinding[]) {
  const seen = new Set<string>();
  const output: AccessControlFinding[] = [];

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
  comparisons: AccessControlRouteComparison[];
  findings: AccessControlFinding[];
  summary: AccessControlReviewReport["summary"];
}) {
  const evidence: EngineEvidenceSeed[] = [
    {
      evidenceKey: "broken-access-control-signal-review",
      sourceModule: "broken-access-control-signal-engine",
      affectedAsset: input.targetUrl,
      assetType: "auth-route",
      proofType: "metadata",
      severity: input.summary.unexpectedAccessSignalCount ? "Medium" : "Info",
      confidence: "Medium",
      falsePositiveRisk: "Medium",
      title: "Broken access control signal review completed",
      observedValue: `${input.summary.routeReviewCount} routes reviewed, ${input.summary.unexpectedAccessSignalCount} potential signals`,
      expectedValue:
        "Privileged/admin/object routes should enforce server-side authorization",
      evidenceSummary:
        "The engine reviewed authenticated route metadata, role-boundary signals and object-id signals without exploiting, mutating data or storing private response bodies.",
      businessImpact:
        "Access-control failures can expose accounts, orders, invoices, admin areas or object-level data if confirmed.",
      developerFix:
        "Review server-side authorization checks, object ownership checks, route middleware, role policies and audit logs.",
      safeClaim: "Can claim access-control risk signals were reviewed safely.",
      blockedClaim:
        "Cannot claim confirmed broken access control, IDOR/BOLA or private data exposure without safe validation evidence.",
      standards: findingStandards(),
      rawMetadata: input.summary,
    },
  ];

  const vulnerabilities: VulnerabilitySeed[] = [];

  if (input.summary.unexpectedAccessSignalCount > 0) {
    vulnerabilities.push({
      vulnerabilityKey: "potential-broken-access-control-signal",
      title: "Potential broken access control signal",
      category: "Access Control",
      severity: input.summary.adminRouteSignalCount > 0 ? "High" : "Medium",
      confidence: "Medium",
      exploitabilityScore: input.summary.adminRouteSignalCount > 0 ? 70 : 55,
      businessImpactScore: 82,
      priorityScore: input.summary.adminRouteSignalCount > 0 ? 86 : 76,
      affectedAssets: input.comparisons
        .filter((item) => item.comparisonResult === "potential-bac-signal")
        .map((item) => item.url)
        .slice(0, 25),
      standards: findingStandards(),
      businessImpact:
        "If confirmed, low-privilege users may access privileged or sensitive routes.",
      developerFix:
        "Enforce server-side authorization on every privileged route and object-level resource.",
      verificationGuidance:
        "Use approved dual-role test accounts and metadata-only comparison first; do not store private data.",
      safeClaim:
        "Can claim potential broken access control signal needs review.",
      blockedClaim:
        "Cannot claim confirmed access-control bypass without safe proof.",
    });
  }

  if (input.summary.objectIdSignalCount > 0) {
    vulnerabilities.push({
      vulnerabilityKey: "object-level-authorization-review-required",
      title: "Object-level authorization review required",
      category: "Object Authorization",
      severity: "Medium",
      confidence: "Medium",
      exploitabilityScore: 50,
      businessImpactScore: 80,
      priorityScore: 74,
      affectedAssets: input.comparisons
        .filter((item) => item.objectIdSignals.length)
        .map((item) => item.url)
        .slice(0, 25),
      standards: findingStandards(),
      businessImpact:
        "Object identifiers can lead to IDOR/BOLA if ownership and role checks are weak.",
      developerFix:
        "Verify every ID-based route/API checks object ownership and role authorization server-side.",
      verificationGuidance:
        "Do not manipulate IDs on production. Validate safely with approved test-owned objects only.",
      safeClaim: "Can claim object-level authorization review is required.",
      blockedClaim:
        "Cannot claim IDOR/BOLA exploitability because object IDs were not manipulated.",
    });
  }

  return { evidence, vulnerabilities };
}

function createBlockedReport(
  target: URL,
  intensity: EngineIntensity,
  approvedRequest: boolean,
  reason: string,
): AccessControlReviewReport {
  const policy = buildPolicy({ intensity });
  const comparison: AccessControlRouteComparison = {
    url: target.toString(),
    path: target.pathname || "/",
    expectedAccess: "blocked",
    lowRoleStatus: null,
    highRoleStatus: null,
    comparisonResult: "blocked",
    riskLevel: "Info",
    riskSignals: [reason],
    objectIdSignals: [],
    routeSensitivity: "high",
    evidenceMetadata: { reason },
    privateBodyStored: false,
  };

  const summary = {
    routeReviewCount: 0,
    comparisonCount: 0,
    sensitiveRouteSignalCount: 0,
    adminRouteSignalCount: 0,
    objectIdSignalCount: 0,
    unexpectedAccessSignalCount: 0,
    blockedRouteCount: 1,
    privateEvidenceBlockCount: 1,
    highRiskCount: 1,
    customerSummary:
      "Broken access control signal engine was blocked by safety policy.",
  };

  const finding: AccessControlFinding = {
    category: "Safety",
    title: "Broken access control signal engine blocked by safety policy",
    severity: "High",
    confidence: "High",
    affectedUrl: target.toString(),
    observedValue: reason,
    expectedValue:
      "Only verified, approved, allowed-path scopes should be reviewed",
    riskSignals: [reason],
    evidenceSummary:
      "The access-control review did not run because safety/scope requirements were not satisfied.",
    businessImpact:
      "Blocking prevents unsafe authenticated testing and private data exposure.",
    developerFix:
      "Verify ownership, create/approve authenticated request and define safe allowed paths.",
    safeClaim: "Can claim access-control review was blocked by safety policy.",
    blockedClaim: "Cannot claim access-control coverage for blocked runs.",
    standards: findingStandards(),
    evidenceMetadata: { reason },
  };

  const built = buildEvidenceAndVulnerabilities({
    targetUrl: target.toString(),
    comparisons: [comparison],
    findings: [finding],
    summary,
  });

  return {
    version: "42.0",
    generatedAt: new Date().toISOString(),
    targetUrl: target.toString(),
    hostname: target.hostname,
    intensity,
    verifiedScope: false,
    approvedRequest,
    comparisonMode: "low-privilege-metadata",
    privateTargetBlocked: true,
    reviewStatus: "blocked",
    reviewPolicy: policy,
    comparisons: [comparison],
    findings: [finding],
    normalizedEvidenceSeeds: built.evidence,
    vulnerabilitySeeds: built.vulnerabilities,
    summary,
    safetyBoundary: SAFETY_BOUNDARY,
  };
}

function candidateRoutes(input: {
  target: URL;
  allowedPaths: string[];
  blockedPaths: string[];
  expectedPrivilegedPaths: string[];
  routeHints?: string[];
  maxRoutes: number;
}) {
  const candidates: URL[] = [];

  for (const path of [
    ...input.allowedPaths,
    ...input.expectedPrivilegedPaths,
  ]) {
    candidates.push(makeUrl(input.target, path));
  }

  for (const hint of input.routeHints || []) {
    const url = normalizeCandidateUrl(input.target, hint);
    if (url) candidates.push(url);
  }

  return [
    ...new Map(candidates.map((url) => [url.toString(), url])).values(),
  ].slice(0, input.maxRoutes);
}

export async function runBrokenAccessControlSignalEngine(input: {
  targetUrl: string;
  intensity?: EngineIntensity;
  verifiedScope?: boolean;
  approvedRequest?: boolean;
  allowedPaths?: string[];
  blockedPaths?: string[];
  expectedPrivilegedPaths?: string[];
  routeHints?: string[];
  comparisonMode?: AccessControlComparisonMode;
  lowRoleSessionValue?: string;
  highRoleSessionValue?: string;
  lowRoleSessionMode?: "none" | "cookie" | "authorization";
  highRoleSessionMode?: "none" | "cookie" | "authorization";
}): Promise<AccessControlReviewReport> {
  const intensity = input.intensity || "standard";
  const target = normalizeTargetUrl(input.targetUrl);

  if (!input.verifiedScope) {
    return createBlockedReport(
      target,
      intensity,
      Boolean(input.approvedRequest),
      "Verified website scope and permission are required.",
    );
  }

  if (!input.approvedRequest) {
    return createBlockedReport(
      target,
      intensity,
      false,
      "Approved authenticated scan request is required.",
    );
  }

  try {
    await assertPublicTarget(target);
  } catch (error) {
    return createBlockedReport(
      target,
      intensity,
      true,
      error instanceof Error ? error.message : "Target blocked.",
    );
  }

  const comparisonMode = input.comparisonMode || "low-privilege-metadata";
  const policy = buildPolicy({
    intensity,
    allowedPaths: input.allowedPaths,
    blockedPaths: input.blockedPaths,
    expectedPrivilegedPaths: input.expectedPrivilegedPaths,
  });

  const comparisons: AccessControlRouteComparison[] = [];

  for (const route of candidateRoutes({
    target,
    allowedPaths: policy.allowedPaths,
    blockedPaths: policy.blockedPaths,
    expectedPrivilegedPaths: policy.expectedPrivilegedPaths,
    routeHints: input.routeHints,
    maxRoutes: policy.maxRoutes,
  })) {
    if (!sameOrigin(target, route)) continue;

    if (
      !isAllowedPath(route.pathname, policy.allowedPaths) ||
      isBlockedPath(route.pathname, policy.blockedPaths)
    ) {
      comparisons.push({
        url: route.toString(),
        path: route.pathname,
        expectedAccess: "blocked",
        lowRoleStatus: null,
        highRoleStatus: null,
        comparisonResult: "blocked",
        riskLevel: "Info",
        riskSignals: [
          !isAllowedPath(route.pathname, policy.allowedPaths)
            ? "outside allowed paths"
            : "blocked route policy",
        ],
        objectIdSignals: objectIdSignals(route),
        routeSensitivity: "high",
        evidenceMetadata: {
          privateBodyStored: false,
          lowRoleSessionStored: false,
          highRoleSessionStored: false,
        },
        privateBodyStored: false,
      });
      continue;
    }

    const low = await fetchMetadata({
      url: route,
      sessionValue: input.lowRoleSessionValue,
      sessionMode: input.lowRoleSessionMode || "none",
    });

    let highStatus: number | null = null;

    if (comparisonMode === "dual-role-metadata") {
      const high = await fetchMetadata({
        url: route,
        sessionValue: input.highRoleSessionValue,
        sessionMode: input.highRoleSessionMode || "none",
      });
      highStatus = high.statusCode;
    }

    const expected = expectedAccess(
      route.pathname,
      policy.expectedPrivilegedPaths,
    );
    const classified = classifyComparison({
      url: route,
      expectedAccess: expected,
      lowRoleStatus: low.statusCode,
      highRoleStatus: highStatus,
      mode: comparisonMode,
    });

    comparisons.push({
      url: route.toString(),
      path: route.pathname,
      expectedAccess: expected,
      lowRoleStatus: low.statusCode,
      highRoleStatus: highStatus,
      comparisonResult: classified.comparisonResult,
      riskLevel: classified.riskLevel,
      riskSignals: classified.riskSignals,
      objectIdSignals: classified.objectIdSignals,
      routeSensitivity: classified.routeSensitivity,
      evidenceMetadata: {
        comparisonMode,
        lowRoleSessionStored: false,
        highRoleSessionStored: false,
        privateBodyStored: false,
        contentType: low.contentType,
        lowRoleLocationHeaderPresent: Boolean(low.location),
      },
      privateBodyStored: false,
    });
  }

  const findings = buildFindings(comparisons);
  const summary = {
    routeReviewCount: comparisons.filter(
      (item) => item.comparisonResult !== "blocked",
    ).length,
    comparisonCount: comparisons.length,
    sensitiveRouteSignalCount: comparisons.filter(
      (item) =>
        item.routeSensitivity === "high" ||
        item.riskSignals.includes("sensitive route signal"),
    ).length,
    adminRouteSignalCount: comparisons.filter((item) =>
      item.riskSignals.includes("admin route signal"),
    ).length,
    objectIdSignalCount: comparisons.filter(
      (item) => item.objectIdSignals.length,
    ).length,
    unexpectedAccessSignalCount: comparisons.filter(
      (item) => item.comparisonResult === "potential-bac-signal",
    ).length,
    blockedRouteCount: comparisons.filter(
      (item) => item.comparisonResult === "blocked",
    ).length,
    privateEvidenceBlockCount: comparisons.length,
    highRiskCount: comparisons.filter((item) =>
      ["Critical", "High"].includes(item.riskLevel),
    ).length,
    customerSummary:
      "Broken access control signal engine reviewed route access metadata, privileged-route expectations and object-id signals without exploiting access control or storing private response bodies.",
  };

  const built = buildEvidenceAndVulnerabilities({
    targetUrl: target.toString(),
    comparisons,
    findings,
    summary,
  });

  return {
    version: "42.0",
    generatedAt: new Date().toISOString(),
    targetUrl: target.toString(),
    hostname: target.hostname,
    intensity,
    verifiedScope: true,
    approvedRequest: true,
    comparisonMode,
    privateTargetBlocked: false,
    reviewStatus: "completed",
    reviewPolicy: policy,
    comparisons,
    findings,
    normalizedEvidenceSeeds: built.evidence,
    vulnerabilitySeeds: built.vulnerabilities,
    summary,
    safetyBoundary: SAFETY_BOUNDARY,
  };
}
