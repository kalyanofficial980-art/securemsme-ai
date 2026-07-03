import { createHash } from "node:crypto";
import { validatePublicHttpUrl } from "@/lib/security/ssrf";

export type ApiReviewMode = "safe-light" | "safe-standard" | "safe-deep";
export type ApiSpecType =
  | "openapi-json"
  | "openapi-yaml"
  | "swagger-ui"
  | "graphql"
  | "api-docs"
  | "unknown";
export type ApiEndpointType =
  | "api-endpoint"
  | "auth-endpoint"
  | "user-data"
  | "admin-api"
  | "payment-api"
  | "file-api"
  | "graphql"
  | "documentation"
  | "unknown";

export type ApiDiscoveredSpec = {
  specUrl: string;
  specType: ApiSpecType;
  httpStatus?: number | null;
  contentType?: string | null;
  title?: string | null;
  version?: string | null;
  isPublic: boolean;
  endpointCount: number;
  methodCount: number;
  authSchemeCount: number;
  sensitivePathCount: number;
  riskLevel: "High" | "Medium" | "Low" | "Info";
  evidenceSummary: string;
  developerNote: string;
  clientSafeNote: string;
  blockedClaim: string;
  specFingerprint: string;
  rawSummary: Record<string, unknown>;
};

export type ApiEndpointInventory = {
  endpointPath: string;
  fullUrl?: string | null;
  method: string;
  operationId?: string | null;
  summary?: string | null;
  endpointGroup: string;
  endpointType: ApiEndpointType;
  authRequirement: "required" | "optional" | "none-documented" | "unclear";
  mutationRisk: boolean;
  customerDataSignal: boolean;
  adminSignal: boolean;
  paymentSignal: boolean;
  fileSignal: boolean;
  sensitiveSignal: boolean;
  riskLevel: "High" | "Medium" | "Low" | "Info";
  reviewStatus:
    "reviewed" | "needs-review" | "accepted-risk" | "false-positive";
  endpointFingerprint: string;
  evidenceSummary: string;
  developerNote: string;
  clientSafeNote: string;
  blockedClaim: string;
  rawOperation: Record<string, unknown>;
};

export type ApiObservation = {
  observationKey: string;
  category: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  confidence: "Confirmed" | "High" | "Medium" | "Low" | "Needs manual review";
  title: string;
  evidenceSummary: string;
  developerNote: string;
  clientSafeNote: string;
  blockedClaim: string;
  safeRetestSteps: string;
  payload: Record<string, unknown>;
};

export type ApiChecklistItem = {
  checklistKey: string;
  title: string;
  category: string;
  status:
    "pass" | "needs-fix" | "not-checked" | "not-applicable" | "accepted-risk";
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  evidenceSummary: string;
  developerNote: string;
  clientSafeNote: string;
  blockedClaim: string;
};

export type ApiSecurityReviewReport = {
  targetUrl: string;
  normalizedOrigin: string;
  reviewMode: ApiReviewMode;
  runStatus: "completed" | "completed-with-warnings" | "blocked" | "failed";
  specs: ApiDiscoveredSpec[];
  endpoints: ApiEndpointInventory[];
  observations: ApiObservation[];
  checklist: ApiChecklistItem[];
  discoveredSpecCount: number;
  endpointCount: number;
  publicDocsCount: number;
  graphqlSignalCount: number;
  sensitiveEndpointCount: number;
  mutationEndpointCount: number;
  authRequiredCount: number;
  authUnclearCount: number;
  checklistNeedsFixCount: number;
  apiCoverageScore: number;
  apiRiskScore: number;
  safeSummary: string;
  developerSummary: string;
  clientSafeSummary: string;
  blockedActions: string[];
};

export const apiSecurityBlockedActions = [
  "No POST/PUT/PATCH/DELETE execution",
  "No fuzzing",
  "No exploit payloads",
  "No auth bypass",
  "No brute force",
  "No token guessing",
  "No private data extraction",
  "No mutation of customer/order/payment data",
  "No destructive testing",
  "No denial-of-service testing",
];

export const defaultApiChecklist: ApiChecklistItem[] = [
  {
    checklistKey: "api-inventory-reviewed",
    title: "API inventory reviewed",
    category: "API Inventory",
    status: "not-checked",
    severity: "Medium",
    evidenceSummary:
      "Confirm known API routes and public documentation are inventoried.",
    developerNote:
      "Maintain an API inventory with owner, authentication requirement and data sensitivity.",
    clientSafeNote: "API inventory helps prioritize security review.",
    blockedClaim:
      "Do not claim every endpoint was discovered from public docs alone.",
  },
  {
    checklistKey: "auth-required-for-sensitive-endpoints",
    title: "Sensitive endpoints require authentication",
    category: "Authorization",
    status: "not-checked",
    severity: "High",
    evidenceSummary:
      "Sensitive data, admin and payment endpoints should require authentication and authorization.",
    developerNote:
      "Enforce authentication and server-side authorization for sensitive endpoints.",
    clientSafeNote: "Sensitive APIs should require strong access controls.",
    blockedClaim:
      "Do not claim bypass unless verified with authorized role testing.",
  },
  {
    checklistKey: "mutation-methods-reviewed",
    title: "Mutation methods reviewed",
    category: "Mutation Safety",
    status: "not-checked",
    severity: "High",
    evidenceSummary:
      "POST/PUT/PATCH/DELETE endpoints should be reviewed manually without executing mutation requests.",
    developerNote:
      "Protect mutation endpoints with validation, authorization, rate limiting and audit logging.",
    clientSafeNote: "Write/update/delete APIs need additional protection.",
    blockedClaim: "Do not execute mutation requests during safe review.",
  },
  {
    checklistKey: "public-api-docs-intended",
    title: "Public API docs exposure is intended",
    category: "Documentation Exposure",
    status: "not-checked",
    severity: "Medium",
    evidenceSummary:
      "Swagger/OpenAPI/GraphQL docs should be public only if intended and sanitized.",
    developerNote:
      "Hide internal docs or sanitize schemas that reveal sensitive internal operations.",
    clientSafeNote:
      "Public API documentation can be useful but should not expose sensitive operations.",
    blockedClaim: "Do not claim data leakage from docs exposure alone.",
  },
  {
    checklistKey: "graphql-reviewed",
    title: "GraphQL exposure reviewed",
    category: "GraphQL",
    status: "not-checked",
    severity: "Medium",
    evidenceSummary:
      "GraphQL endpoints should be reviewed for auth, authorization, introspection policy and query controls.",
    developerNote:
      "Apply resolver authorization, depth/complexity limits and production introspection policy.",
    clientSafeNote:
      "GraphQL endpoints require access and query-control review.",
    blockedClaim:
      "Do not run introspection or queries without explicit authorization.",
  },
  {
    checklistKey: "api-cors-reviewed",
    title: "API CORS policy reviewed",
    category: "CORS",
    status: "not-checked",
    severity: "Medium",
    evidenceSummary:
      "API CORS should restrict trusted origins and avoid credentialed wildcard exposure.",
    developerNote:
      "Restrict allowed origins, headers and credentials behavior.",
    clientSafeNote:
      "CORS controls browser access to APIs and should match trusted domains.",
    blockedClaim: "Do not claim account data leakage from CORS signals alone.",
  },
];

function sha(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeApiReviewMode(value?: string | null): ApiReviewMode {
  if (value === "safe-light" || value === "safe-deep") return value;
  return "safe-standard";
}

export function normalizeApiTarget(input: string) {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);
  url.hash = "";
  return url;
}

export function sameOrigin(a: URL, b: URL) {
  return (
    a.protocol === b.protocol && a.hostname === b.hostname && a.port === b.port
  );
}

function candidateSpecPaths(mode: ApiReviewMode) {
  const common = [
    "/openapi.json",
    "/swagger.json",
    "/api-docs",
    "/api/docs",
    "/docs",
    "/swagger",
    "/swagger-ui",
    "/graphql",
  ];
  if (mode === "safe-light") return common.slice(0, 4);
  const extra = [
    "/v1/openapi.json",
    "/api/openapi.json",
    "/api/swagger.json",
    "/swagger/v1/swagger.json",
    "/redoc",
    "/api/graphql",
    "/graphiql",
  ];
  return mode === "safe-deep"
    ? [...common, ...extra]
    : [...common, ...extra.slice(0, 4)];
}

async function safeFetch(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    await validatePublicHttpUrl(url.toString());
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "SecureMSME-AI-APISecurityReview/2.0",
        accept:
          "application/json,application/yaml,text/yaml,text/html,text/plain,*/*",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    let body = "";

    if (/json|yaml|html|text|xml/i.test(contentType)) {
      body = (await response.text()).slice(0, 350_000);
    }

    return {
      ok: true,
      status: response.status,
      contentType,
      body,
      cors: response.headers.get("access-control-allow-origin"),
      allowCredentials: response.headers.get(
        "access-control-allow-credentials",
      ),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      contentType: "",
      body: "",
      cors: null,
      allowCredentials: null,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function detectSpecType(
  url: URL,
  body: string,
  contentType: string,
): ApiSpecType {
  const path = url.pathname.toLowerCase();
  const lower = body.slice(0, 5000).toLowerCase();

  if (
    path.includes("graphql") ||
    lower.includes("graphql") ||
    lower.includes("graphiql")
  )
    return "graphql";
  if (
    lower.includes("swagger-ui") ||
    lower.includes("swagger ui") ||
    lower.includes("redoc")
  )
    return "swagger-ui";
  if (contentType.includes("json") || body.trim().startsWith("{")) {
    if (
      lower.includes('"openapi"') ||
      lower.includes('"swagger"') ||
      lower.includes('"paths"')
    )
      return "openapi-json";
  }
  if (/openapi:|swagger:|paths:/i.test(body.slice(0, 5000)))
    return "openapi-yaml";
  if (
    path.includes("docs") ||
    path.includes("api-docs") ||
    path.includes("swagger")
  )
    return "api-docs";
  return "unknown";
}

function titleFromHtml(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match
    ? match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200)
    : null;
}

function parseJsonSpec(body: string) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function classifyEndpoint(
  path: string,
  method: string,
  summary: string,
): ApiEndpointType {
  const text = `${path} ${method} ${summary}`.toLowerCase();

  if (/graphql/.test(text)) return "graphql";
  if (/login|logout|auth|token|oauth|session|password|reset/.test(text))
    return "auth-endpoint";
  if (/admin|manage|staff|internal/.test(text)) return "admin-api";
  if (/payment|billing|invoice|checkout|order|cart|subscription/.test(text))
    return "payment-api";
  if (/upload|file|download|media|attachment|document/.test(text))
  if (/\b(upload|files?|download|media|attachments?|documents?)\b/.test(text)) return "file-api";
  if (
    /user|profile|customer|patient|student|lead|contact|address|email|phone/.test(
      text,
    )
  )
    return "user-data";
  if (/docs|swagger|openapi/.test(text)) return "documentation";
  return "api-endpoint";
}

function inferAuthRequirement(
  operation: Record<string, unknown>,
  globalSecurity: unknown,
): ApiEndpointInventory["authRequirement"] {
  if (Array.isArray(operation.security)) {
    if (operation.security.length === 0) return "none-documented";
    return "required";
  }

  if (Array.isArray(globalSecurity)) {
    if (globalSecurity.length === 0) return "none-documented";
    return "required";
  }

  return "unclear";
}

function endpointSignals(path: string, summary: string, type: ApiEndpointType) {
  const text = `${path} ${summary}`.toLowerCase();
  const customerDataSignal =
    type === "user-data" ||
    /email|phone|address|customer|patient|student|profile|lead/.test(text);
  const adminSignal = type === "admin-api";
  const paymentSignal = type === "payment-api";
  const fileSignal = type === "file-api";
  const sensitiveSignal =
    customerDataSignal ||
    adminSignal ||
    paymentSignal ||
    fileSignal ||
    /secret|token|key|credential|private/.test(text);

  return {
    customerDataSignal,
    adminSignal,
    paymentSignal,
    fileSignal,
    sensitiveSignal,
  };
}

function endpointRiskLevel(
  type: ApiEndpointType,
  auth: ApiEndpointInventory["authRequirement"],
  mutation: boolean,
  sensitive: boolean,
): ApiEndpointInventory["riskLevel"] {
  if (
    (sensitive || type === "admin-api" || type === "payment-api") &&
    (auth === "none-documented" || auth === "unclear")
  )
    return "High";
  if (mutation && (auth === "none-documented" || auth === "unclear"))
    return "High";
  if (sensitive || mutation) return "Medium";
  return "Low";
}

function developerNoteForEndpoint(
  type: ApiEndpointType,
  auth: ApiEndpointInventory["authRequirement"],
  mutation: boolean,
) {
  if (auth === "none-documented" || auth === "unclear")
    return "Confirm authentication and server-side authorization are enforced for this endpoint.";
  if (mutation)
    return "Review validation, authorization, rate limiting, audit logging and abuse protection.";
  if (type === "graphql")
    return "Review GraphQL auth, resolver-level authorization, introspection policy and query complexity limits.";
  return "Keep endpoint documented with auth requirement, owner, data sensitivity and safe retest steps.";
}

function blockedClaimForEndpoint(type: ApiEndpointType) {
  if (type === "admin-api")
    return "Do not claim admin bypass without authorized role testing.";
  if (type === "payment-api")
    return "Do not execute payment/order mutations or claim payment compromise from inventory alone.";
  if (type === "user-data")
    return "Do not extract or store private user/customer data.";
  return "Do not claim exploitation from API inventory alone.";
}

function buildEndpointFromOperation(input: {
  path: string;
  method: string;
  operation: Record<string, unknown>;
  globalSecurity: unknown;
  origin: URL | null;
}): ApiEndpointInventory {
  const method = input.method.toUpperCase();
  const summary = String(
    input.operation.summary || input.operation.description || "",
  ).slice(0, 240);
  const operationId =
    typeof input.operation.operationId === "string"
      ? input.operation.operationId
      : null;
  const endpointType = classifyEndpoint(input.path, method, summary);
  const authRequirement = inferAuthRequirement(
    input.operation,
    input.globalSecurity,
  );
  const mutationRisk = !["GET", "HEAD", "OPTIONS"].includes(method);
  const signals = endpointSignals(input.path, summary, endpointType);
  const riskLevel = endpointRiskLevel(
    endpointType,
    authRequirement,
    mutationRisk,
    signals.sensitiveSignal,
  );
  const endpointGroup = input.path.split("/").filter(Boolean)[0] || "root";
  const fullUrl = input.origin
    ? new URL(
        input.path.replace(/^\//, ""),
        `${input.origin.origin}/`,
      ).toString()
    : null;
  const endpointFingerprint = sha(
    `${method}:${input.path}:${endpointType}:${authRequirement}`,
  );

  return {
    endpointPath: input.path,
    fullUrl,
    method,
    operationId,
    summary,
    endpointGroup,
    endpointType,
    authRequirement,
    mutationRisk,
    customerDataSignal: signals.customerDataSignal,
    adminSignal: signals.adminSignal,
    paymentSignal: signals.paymentSignal,
    fileSignal: signals.fileSignal,
    sensitiveSignal: signals.sensitiveSignal,
    riskLevel,
    reviewStatus: riskLevel === "High" ? "needs-review" : "reviewed",
    endpointFingerprint,
    evidenceSummary: `${method} ${input.path} classified as ${endpointType}, auth ${authRequirement}, risk ${riskLevel}.`,
    developerNote: developerNoteForEndpoint(
      endpointType,
      authRequirement,
      mutationRisk,
    ),
    clientSafeNote: `${endpointType} endpoint inventoried with ${riskLevel.toLowerCase()} review priority.`,
    blockedClaim: blockedClaimForEndpoint(endpointType),
    rawOperation: {
      operationId,
      summary,
      security: input.operation.security || null,
      tags: input.operation.tags || null,
      parametersCount: Array.isArray(input.operation.parameters)
        ? input.operation.parameters.length
        : 0,
    },
  };
}

function parseOpenApiJson(
  spec: Record<string, any>,
  origin: URL,
): ApiEndpointInventory[] {
  const endpoints: ApiEndpointInventory[] = [];
  const paths = spec.paths && typeof spec.paths === "object" ? spec.paths : {};
  const globalSecurity = spec.security;

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;

    for (const method of [
      "get",
      "head",
      "options",
      "post",
      "put",
      "patch",
      "delete",
    ]) {
      const operation = (pathItem as Record<string, unknown>)[method];
      if (!operation || typeof operation !== "object") continue;

      endpoints.push(
        buildEndpointFromOperation({
          path,
          method: method.toUpperCase(),
          operation: operation as Record<string, unknown>,
          globalSecurity,
          origin,
        }),
      );
    }
  }

  return endpoints.slice(0, 500);
}

function parseYamlLikeEndpoints(
  body: string,
  origin: URL,
): ApiEndpointInventory[] {
  const endpoints: ApiEndpointInventory[] = [];
  const lines = body.split(/\r?\n/);
  let currentPath = "";

  for (const line of lines) {
    const pathMatch = line.match(/^\s{0,4}(\/[A-Za-z0-9_{}:./-]+)\s*:\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }

    const methodMatch = line.match(
      /^\s{2,8}(get|post|put|patch|delete|head|options)\s*:\s*$/i,
    );
    if (methodMatch && currentPath) {
      endpoints.push(
        buildEndpointFromOperation({
          path: currentPath,
          method: methodMatch[1].toUpperCase(),
          operation: {},
          globalSecurity: undefined,
          origin,
        }),
      );
    }
  }

  return endpoints.slice(0, 300);
}

function specRiskLevel(
  specType: ApiSpecType,
  endpoints: number,
  sensitive: number,
  authSchemes: number,
): ApiDiscoveredSpec["riskLevel"] {
  if (specType === "graphql") return "Medium";
  if (sensitive > 0 && authSchemes === 0) return "High";
  if (endpoints > 50 || sensitive > 0) return "Medium";
  if (specType === "unknown") return "Info";
  return "Low";
}

function buildSpecAndEndpoints(input: {
  url: URL;
  status: number;
  contentType: string;
  body: string;
  origin: URL;
}) {
  const specType = detectSpecType(input.url, input.body, input.contentType);
  let endpoints: ApiEndpointInventory[] = [];
  let title: string | null = null;
  let version: string | null = null;
  let authSchemeCount = 0;

  if (specType === "openapi-json") {
    const json = parseJsonSpec(input.body);
    if (json) {
      title = json.info?.title || null;
      version = json.info?.version || json.openapi || json.swagger || null;
      authSchemeCount = json.components?.securitySchemes
        ? Object.keys(json.components.securitySchemes).length
        : json.securityDefinitions
          ? Object.keys(json.securityDefinitions).length
          : 0;
      endpoints = parseOpenApiJson(json, input.origin);
    }
  } else if (specType === "openapi-yaml") {
    endpoints = parseYamlLikeEndpoints(input.body, input.origin);
    title = input.body.match(/title:\s*["']?([^"'\n]+)/i)?.[1]?.trim() || null;
    version =
      input.body.match(/version:\s*["']?([^"'\n]+)/i)?.[1]?.trim() || null;
    authSchemeCount = (
      input.body.match(/securitySchemes|securityDefinitions/g) || []
    ).length;
  } else if (specType === "swagger-ui" || specType === "api-docs") {
    title = titleFromHtml(input.body) || "API documentation";
  } else if (specType === "graphql") {
    title = "GraphQL endpoint or UI";
    endpoints = [
      buildEndpointFromOperation({
        path: input.url.pathname || "/graphql",
        method: "POST",
        operation: { summary: "GraphQL endpoint signal" },
        globalSecurity: undefined,
        origin: input.origin,
      }),
    ];
  }

  const sensitivePathCount = endpoints.filter(
    (endpoint) => endpoint.sensitiveSignal,
  ).length;
  const riskLevel = specRiskLevel(
    specType,
    endpoints.length,
    sensitivePathCount,
    authSchemeCount,
  );
  const specFingerprint = sha(
    `${input.url.toString()}:${specType}:${title || ""}:${version || ""}:${endpoints.length}`,
  );

  const spec: ApiDiscoveredSpec = {
    specUrl: input.url.toString(),
    specType,
    httpStatus: input.status,
    contentType: input.contentType,
    title,
    version,
    isPublic: input.status >= 200 && input.status < 400,
    endpointCount: endpoints.length,
    methodCount: new Set(endpoints.map((endpoint) => endpoint.method)).size,
    authSchemeCount,
    sensitivePathCount,
    riskLevel,
    evidenceSummary: `${specType} signal observed at ${input.url.pathname} with ${endpoints.length} endpoint(s) parsed.`,
    developerNote:
      specType === "graphql"
        ? "Review GraphQL auth, resolver authorization, introspection policy and query limits."
        : "Confirm API documentation exposure is intended and sensitive operations are protected.",
    clientSafeNote: `${specType} API documentation/spec signal was discovered for review.`,
    blockedClaim:
      "Do not claim API compromise or data exposure from public documentation alone.",
    specFingerprint,
    rawSummary: {
      status: input.status,
      contentType: input.contentType,
      title,
      version,
      endpointCount: endpoints.length,
      authSchemeCount,
    },
  };

  return { spec, endpoints };
}

function observationsFor(
  specs: ApiDiscoveredSpec[],
  endpoints: ApiEndpointInventory[],
): ApiObservation[] {
  const observations: ApiObservation[] = [];
  const publicDocs = specs.filter(
    (spec) =>
      spec.isPublic &&
      ["openapi-json", "openapi-yaml", "swagger-ui", "api-docs"].includes(
        spec.specType,
      ),
  );

  if (publicDocs.length) {
    observations.push({
      observationKey: "public-api-docs",
      category: "API Documentation Exposure",
      severity: publicDocs.some((spec) => spec.riskLevel === "High")
        ? "High"
        : "Medium",
      confidence: "High",
      title: "Public API documentation/spec discovered",
      evidenceSummary: `${publicDocs.length} public API documentation/spec signal(s) discovered.`,
      developerNote:
        "Confirm docs are intentionally public and do not expose sensitive internal operations.",
      clientSafeNote: "Public API documentation exposure should be reviewed.",
      blockedClaim: "Do not claim data leakage from docs exposure alone.",
      safeRetestSteps:
        "Restrict/sanitize docs if needed, then rerun API Security Review.",
      payload: { count: publicDocs.length },
    });
  }

  if (
    specs.some((spec) => spec.specType === "graphql") ||
    endpoints.some((endpoint) => endpoint.endpointType === "graphql")
  ) {
    observations.push({
      observationKey: "graphql-signal",
      category: "GraphQL Review",
      severity: "Medium",
      confidence: "Medium",
      title: "GraphQL signal discovered",
      evidenceSummary: "GraphQL endpoint/UI signal was observed.",
      developerNote:
        "Review auth, resolver authorization, introspection policy and query limits.",
      clientSafeNote:
        "GraphQL endpoints require specialized API security review.",
      blockedClaim:
        "Do not run introspection or queries without explicit authorization.",
      safeRetestSteps:
        "Review GraphQL policy with approved scope and update evidence.",
      payload: {},
    });
  }

  const high = endpoints.filter((endpoint) => endpoint.riskLevel === "High");
  if (high.length) {
    observations.push({
      observationKey: "high-risk-api-endpoints",
      category: "API Authorization",
      severity: "High",
      confidence: "Medium",
      title: "Sensitive or mutation endpoints need authorization review",
      evidenceSummary: `${high.length} endpoint(s) have high review priority due to sensitive/mutation/auth-unclear signals.`,
      developerNote:
        "Verify authentication and server-side authorization for each high-priority endpoint.",
      clientSafeNote:
        "Some API endpoints need additional access-control review.",
      blockedClaim:
        "Do not claim bypass or data leak without authorized validation.",
      safeRetestSteps:
        "Review endpoint authorization in code/staging and update checklist.",
      payload: { count: high.length },
    });
  }

  return observations;
}

export async function runApiSecurityReview(input: {
  targetUrl: string;
  mode?: ApiReviewMode;
  permissionAccepted?: boolean;
  extraSpecUrls?: string[];
}): Promise<ApiSecurityReviewReport> {
  const reviewMode = input.mode || "safe-standard";
  const target = normalizeApiTarget(input.targetUrl);
  const origin = new URL(target.origin);

  if (!input.permissionAccepted) {
    return emptyReport(
      target.toString(),
      origin.origin,
      reviewMode,
      "blocked",
      "API review blocked because authorization was not accepted.",
    );
  }

  const candidates = new Map<string, URL>();
  for (const path of candidateSpecPaths(reviewMode))
    candidates.set(new URL(path, origin).toString(), new URL(path, origin));

  for (const extra of input.extraSpecUrls || []) {
    try {
      const url = normalizeApiTarget(extra);
      if (sameOrigin(url, origin)) candidates.set(url.toString(), url);
    } catch {
      // ignore invalid optional urls
    }
  }

  const specs: ApiDiscoveredSpec[] = [];
  const endpoints: ApiEndpointInventory[] = [];

  for (const url of candidates.values()) {
    const response = await safeFetch(url);
    if (!response.ok || response.status < 200 || response.status >= 500)
      continue;

    const type = detectSpecType(url, response.body, response.contentType);
    if (type === "unknown" && response.status === 404) continue;
    if (
      type === "unknown" &&
      !/api|swagger|openapi|graphql|docs/i.test(url.pathname)
    )
      continue;

    const parsed = buildSpecAndEndpoints({
      url,
      status: response.status,
      contentType: response.contentType,
      body: response.body,
      origin,
    });

    specs.push(parsed.spec);
    endpoints.push(...parsed.endpoints);
  }

  const deduped = dedupeEndpoints(endpoints);
  const observations = observationsFor(specs, deduped);
  const publicDocsCount = specs.filter((spec) => spec.isPublic).length;
  const graphqlSignalCount =
    specs.filter((spec) => spec.specType === "graphql").length +
    deduped.filter((endpoint) => endpoint.endpointType === "graphql").length;
  const sensitiveEndpointCount = deduped.filter(
    (endpoint) => endpoint.sensitiveSignal,
  ).length;
  const mutationEndpointCount = deduped.filter(
    (endpoint) => endpoint.mutationRisk,
  ).length;
  const authRequiredCount = deduped.filter(
    (endpoint) => endpoint.authRequirement === "required",
  ).length;
  const authUnclearCount = deduped.filter(
    (endpoint) =>
      endpoint.authRequirement === "unclear" ||
      endpoint.authRequirement === "none-documented",
  ).length;
  const apiCoverageScore = calculateApiCoverageScore(
    specs.length,
    deduped.length,
    publicDocsCount,
  );
  const apiRiskScore = calculateApiRiskScore(
    publicDocsCount,
    graphqlSignalCount,
    sensitiveEndpointCount,
    mutationEndpointCount,
    authUnclearCount,
    observations.filter((obs) => obs.severity === "High").length,
  );

  return {
    targetUrl: target.toString(),
    normalizedOrigin: origin.origin,
    reviewMode,
    runStatus: observations.some((obs) => obs.severity === "High")
      ? "completed-with-warnings"
      : "completed",
    specs,
    endpoints: deduped,
    observations,
    checklist: defaultApiChecklist,
    discoveredSpecCount: specs.length,
    endpointCount: deduped.length,
    publicDocsCount,
    graphqlSignalCount,
    sensitiveEndpointCount,
    mutationEndpointCount,
    authRequiredCount,
    authUnclearCount,
    checklistNeedsFixCount: 0,
    apiCoverageScore,
    apiRiskScore,
    safeSummary: `${specs.length} API spec/doc signal(s), ${deduped.length} endpoint(s), ${observations.length} observation(s) reviewed with safe GET-only discovery.`,
    developerSummary: buildDeveloperSummary(deduped, observations),
    clientSafeSummary: `API Security Review inventoried ${deduped.length} endpoint(s) and ${publicDocsCount} public documentation signal(s). No mutation requests or exploit tests were performed.`,
    blockedActions: apiSecurityBlockedActions,
  };
}

function emptyReport(
  targetUrl: string,
  normalizedOrigin: string,
  reviewMode: ApiReviewMode,
  runStatus: ApiSecurityReviewReport["runStatus"],
  summary: string,
): ApiSecurityReviewReport {
  return {
    targetUrl,
    normalizedOrigin,
    reviewMode,
    runStatus,
    specs: [],
    endpoints: [],
    observations: [],
    checklist: defaultApiChecklist,
    discoveredSpecCount: 0,
    endpointCount: 0,
    publicDocsCount: 0,
    graphqlSignalCount: 0,
    sensitiveEndpointCount: 0,
    mutationEndpointCount: 0,
    authRequiredCount: 0,
    authUnclearCount: 0,
    checklistNeedsFixCount: 0,
    apiCoverageScore: 0,
    apiRiskScore: 0,
    safeSummary: summary,
    developerSummary: "No API review was performed.",
    clientSafeSummary: "API review was blocked.",
    blockedActions: apiSecurityBlockedActions,
  };
}

function dedupeEndpoints(endpoints: ApiEndpointInventory[]) {
  const map = new Map<string, ApiEndpointInventory>();
  for (const endpoint of endpoints) {
    const key = `${endpoint.method}:${endpoint.endpointPath}`;
    if (!map.has(key)) map.set(key, endpoint);
  }
  return [...map.values()];
}

function calculateApiCoverageScore(
  specs: number,
  endpoints: number,
  publicDocs: number,
) {
  let score = 0;
  if (specs > 0) score += 35;
  if (endpoints > 0) score += Math.min(35, endpoints * 2);
  if (publicDocs > 0) score += 10;
  score += 20;
  return Math.max(0, Math.min(100, score));
}

function calculateApiRiskScore(
  publicDocs: number,
  graphql: number,
  sensitive: number,
  mutation: number,
  authUnclear: number,
  highObservations: number,
) {
  const score =
    publicDocs * 8 +
    graphql * 10 +
    sensitive * 8 +
    mutation * 6 +
    authUnclear * 5 +
    highObservations * 15;
  return Math.max(0, Math.min(100, score));
}

function buildDeveloperSummary(
  endpoints: ApiEndpointInventory[],
  observations: ApiObservation[],
) {
  const high = endpoints.filter(
    (endpoint) => endpoint.riskLevel === "High",
  ).length;
  const mutation = endpoints.filter((endpoint) => endpoint.mutationRisk).length;
  const authUnclear = endpoints.filter(
    (endpoint) =>
      endpoint.authRequirement === "unclear" ||
      endpoint.authRequirement === "none-documented",
  ).length;

  if (!endpoints.length && !observations.length)
    return "No public API documentation or endpoint inventory was discovered from safe checks.";

  return `Developer priorities: review ${high} high-priority endpoint(s), ${mutation} mutation endpoint(s), and ${authUnclear} endpoint(s) with unclear/no documented auth.`;
}

export function createManualApiEndpoint(input: {
  endpointPath: string;
  method: string;
  summary?: string;
  authRequirement?: ApiEndpointInventory["authRequirement"];
  origin?: string;
}): ApiEndpointInventory {
  const origin = input.origin ? new URL(input.origin) : null;
  return buildEndpointFromOperation({
    path: input.endpointPath,
    method: input.method.toUpperCase(),
    operation: {
      summary: input.summary || "Manual endpoint inventory",
      security:
        input.authRequirement === "required"
          ? [{ bearerAuth: [] }]
          : input.authRequirement === "none-documented"
            ? []
            : undefined,
    },
    globalSecurity: undefined,
    origin,
  });
}
