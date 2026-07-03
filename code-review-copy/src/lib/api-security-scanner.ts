import dns from "node:dns/promises";
import type {
  EngineEvidenceSeed,
  EngineIntensity,
  VulnerabilitySeed,
} from "@/lib/international-security-engine";

export type ApiHttpMethod =
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "UNKNOWN";

export type ApiDocumentSignal = {
  url: string;
  statusCode: number | null;
  contentType: string | null;
  documentType:
    "openapi-json" | "swagger-json" | "graphql" | "html-docs" | "unknown";
  title?: string;
  parsed: boolean;
  pathCount: number;
  methodCount: number;
  errorMessage?: string;
};

export type ApiEndpointFinding = {
  endpointUrl: string;
  path: string;
  method: ApiHttpMethod;
  source:
    | "openapi"
    | "swagger"
    | "graphql-signal"
    | "attack-surface-hint"
    | "docs-signal";
  authRequirement: "required" | "optional" | "none-observed" | "unknown";
  riskLevel: "Critical" | "High" | "Medium" | "Low" | "Info";
  riskSignals: string[];
  parameters: string[];
  responseMetadata: Record<string, unknown>;
  apiTop10Mapping: string[];
  safeTestingNotes: string;
};

export type ApiSecurityScannerReport = {
  version: string;
  generatedAt: string;
  targetUrl: string;
  hostname: string;
  intensity: EngineIntensity;
  verifiedScope: boolean;
  privateTargetBlocked: boolean;
  scannerStatus: "completed" | "completed-with-warnings" | "blocked" | "failed";
  scannerPolicy: {
    allowedMethods: string[];
    blockedExecutionMethods: string[];
    openApiDocumentPaths: string[];
    endpointExecution: "GET_HEAD_METADATA_ONLY";
    noMutationRequests: boolean;
    noPrivateBodyStorage: boolean;
    noCredentialStorage: boolean;
  };
  openApiDocuments: ApiDocumentSignal[];
  endpoints: ApiEndpointFinding[];
  normalizedEvidenceSeeds: EngineEvidenceSeed[];
  vulnerabilitySeeds: VulnerabilitySeed[];
  summary: {
    documentCount: number;
    endpointCount: number;
    getEndpointCount: number;
    mutationMethodCount: number;
    authUnknownCount: number;
    sensitivePathCount: number;
    apiRiskSignalCount: number;
    blockedExecutionCount: number;
    customerSummary: string;
  };
  safetyBoundary: string[];
};

const SAFETY_BOUNDARY = [
  "Verified website scope required",
  "OpenAPI/Swagger discovery uses GET only",
  "API endpoint inventory only",
  "No API POST/PUT/PATCH/DELETE execution",
  "No destructive API calls",
  "No authentication bypass testing",
  "No brute force",
  "No data extraction",
  "No private response body storage",
  "No credential/session storage",
  "Private/internal targets blocked",
];

const DOC_PATHS = [
  "/openapi.json",
  "/swagger.json",
  "/api-docs",
  "/api/docs",
  "/v3/api-docs",
  "/v2/api-docs",
  "/swagger/v1/swagger.json",
  "/swagger",
  "/swagger-ui",
  "/swagger-ui/index.html",
  "/docs",
  "/redoc",
  "/graphql",
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

function buildPolicy() {
  return {
    allowedMethods: ["GET", "HEAD"],
    blockedExecutionMethods: ["POST", "PUT", "PATCH", "DELETE"],
    openApiDocumentPaths: DOC_PATHS,
    endpointExecution: "GET_HEAD_METADATA_ONLY" as const,
    noMutationRequests: true,
    noPrivateBodyStorage: true,
    noCredentialStorage: true,
  };
}

function makeUrl(base: URL, path: string) {
  const url = new URL(base.toString());
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url;
}

function sameOrigin(base: URL, candidate: URL) {
  return (
    base.protocol === candidate.protocol &&
    base.hostname === candidate.hostname &&
    base.port === candidate.port
  );
}

function normalizeEndpointUrl(base: URL, rawPath: string) {
  try {
    const url = rawPath.startsWith("http")
      ? new URL(rawPath)
      : new URL(rawPath, base);
    url.hash = "";
    if (!sameOrigin(base, url)) return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchDoc(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "SecureMSMEAI-APIScanner/1.0",
        Accept: "application/json,text/html,text/plain,*/*",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    let body = "";

    if (
      contentType.includes("json") ||
      contentType.includes("text") ||
      contentType.includes("html") ||
      contentType.includes("yaml") ||
      contentType.includes("xml")
    ) {
      body = (await response.text()).slice(0, 280_000);
    }

    return {
      statusCode: response.status,
      contentType,
      body,
      location: response.headers.get("location"),
    };
  } catch (error) {
    return {
      statusCode: null,
      contentType: null,
      body: "",
      errorMessage: error instanceof Error ? error.message : "Request failed",
      location: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function titleFromHtml(body: string) {
  return body.match(/<title[^>]*>([^<]{0,180})<\/title>/i)?.[1]?.trim();
}

function documentType(
  url: string,
  contentType: string | null,
  body: string,
): ApiDocumentSignal["documentType"] {
  const lowerUrl = url.toLowerCase();
  const lowerBody = body.slice(0, 4000).toLowerCase();
  const lowerType = (contentType || "").toLowerCase();

  if (
    (lowerType.includes("json") || lowerUrl.endsWith(".json")) &&
    lowerBody.includes("openapi")
  ) {
    return "openapi-json";
  }

  if (
    (lowerType.includes("json") || lowerUrl.endsWith(".json")) &&
    lowerBody.includes("swagger")
  ) {
    return "swagger-json";
  }

  if (lowerUrl.includes("graphql") || lowerBody.includes("graphql"))
    return "graphql";
  if (
    lowerType.includes("html") ||
    lowerBody.includes("swagger-ui") ||
    lowerBody.includes("redoc")
  )
    return "html-docs";

  return "unknown";
}

function parseJsonSafe(body: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function methodRisk(method: ApiHttpMethod) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) return "Medium";
  if (method === "GET") return "Low";
  return "Info";
}

function isSensitivePath(path: string) {
  const lower = path.toLowerCase();
  return [
    "admin",
    "user",
    "users",
    "account",
    "profile",
    "order",
    "orders",
    "payment",
    "checkout",
    "invoice",
    "token",
    "auth",
    "session",
    "password",
    "upload",
    "file",
    "export",
  ].some((keyword) => lower.includes(keyword));
}

function apiMappingsForEndpoint(
  path: string,
  method: ApiHttpMethod,
  auth: ApiEndpointFinding["authRequirement"],
) {
  const mappings = new Set<string>();

  if (isSensitivePath(path)) mappings.add("API1");
  if (auth === "unknown" || auth === "none-observed") mappings.add("API2");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) mappings.add("API5");
  if (
    path.toLowerCase().includes("export") ||
    path.toLowerCase().includes("file")
  )
    mappings.add("API3");
  mappings.add("API8");

  return [...mappings];
}

function authRequirementFromOperation(
  operation: Record<string, unknown>,
  root: Record<string, unknown>,
): ApiEndpointFinding["authRequirement"] {
  const operationSecurity = operation.security;
  const rootSecurity = root.security;

  if (Array.isArray(operationSecurity)) {
    if (operationSecurity.length === 0) return "none-observed";
    return "required";
  }

  if (Array.isArray(rootSecurity)) {
    if (rootSecurity.length === 0) return "none-observed";
    return "required";
  }

  return "unknown";
}

function parametersFromOperation(operation: Record<string, unknown>) {
  const params = operation.parameters;
  if (!Array.isArray(params)) return [];

  return params
    .map((param) => {
      if (!param || typeof param !== "object") return "";
      const record = param as Record<string, unknown>;
      return typeof record.name === "string" ? record.name : "";
    })
    .filter(Boolean)
    .slice(0, 40);
}

function riskSignals(
  path: string,
  method: ApiHttpMethod,
  auth: ApiEndpointFinding["authRequirement"],
  parameters: string[],
) {
  const signals: string[] = [];
  const lower = path.toLowerCase();

  if (isSensitivePath(path)) signals.push("sensitive business/data path");
  if (auth === "unknown") signals.push("auth requirement unknown");
  if (auth === "none-observed")
    signals.push("no auth requirement observed in specification");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method))
    signals.push("mutation method defined but not executed");
  if (
    parameters.some((param) =>
      ["id", "userId", "accountId", "orderId", "invoiceId"].includes(param),
    )
  ) {
    signals.push("object identifier parameter");
  }
  if (lower.includes("graphql")) signals.push("graphql surface");
  if (lower.includes("admin")) signals.push("admin API surface");

  return signals;
}

function classifyRisk(
  path: string,
  method: ApiHttpMethod,
  auth: ApiEndpointFinding["authRequirement"],
  signals: string[],
) {
  if (
    signals.includes("no auth requirement observed in specification") &&
    isSensitivePath(path)
  )
    return "High";
  if (signals.includes("sensitive business/data path") && auth === "unknown")
    return "Medium";
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) return "Medium";
  if (signals.length) return "Low";
  return methodRisk(method);
}

function parseOpenApiEndpoints(
  base: URL,
  doc: Record<string, unknown>,
  source: ApiEndpointFinding["source"],
) {
  const endpoints: ApiEndpointFinding[] = [];
  const paths = doc.paths;

  if (!paths || typeof paths !== "object") return endpoints;

  for (const [path, value] of Object.entries(
    paths as Record<string, unknown>,
  )) {
    if (!value || typeof value !== "object") continue;
    const pathItem = value as Record<string, unknown>;

    for (const methodRaw of Object.keys(pathItem)) {
      const method = methodRaw.toUpperCase() as ApiHttpMethod;
      if (
        !["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
          method,
        )
      )
        continue;

      const operation = pathItem[methodRaw];
      const operationRecord =
        operation && typeof operation === "object"
          ? (operation as Record<string, unknown>)
          : {};
      const endpointUrl = normalizeEndpointUrl(base, path);
      if (!endpointUrl) continue;

      const auth = authRequirementFromOperation(operationRecord, doc);
      const parameters = parametersFromOperation(operationRecord);
      const signals = riskSignals(path, method, auth, parameters);

      endpoints.push({
        endpointUrl: endpointUrl.toString(),
        path,
        method,
        source,
        authRequirement: auth,
        riskLevel: classifyRisk(path, method, auth, signals),
        riskSignals: signals,
        parameters,
        responseMetadata: {
          summary:
            typeof operationRecord.summary === "string"
              ? operationRecord.summary
              : null,
          operationId:
            typeof operationRecord.operationId === "string"
              ? operationRecord.operationId
              : null,
          responseCodes:
            operationRecord.responses &&
            typeof operationRecord.responses === "object"
              ? Object.keys(
                  operationRecord.responses as Record<string, unknown>,
                )
              : [],
          requestBodyDefined: Boolean(operationRecord.requestBody),
          executed: false,
        },
        apiTop10Mapping: apiMappingsForEndpoint(path, method, auth),
        safeTestingNotes: ["POST", "PUT", "PATCH", "DELETE"].includes(method)
          ? "Mutation method inventoried from specification only. It was not executed."
          : "Endpoint inventoried safely. GET execution is not used for private data extraction.",
      });
    }
  }

  return endpoints;
}

function parseYamlLikeOpenApi(base: URL, body: string) {
  const endpoints: ApiEndpointFinding[] = [];
  const lines = body.split(/\r?\n/);
  let insidePaths = false;

  for (const line of lines) {
    if (/^paths:\s*$/.test(line.trim())) {
      insidePaths = true;
      continue;
    }

    if (!insidePaths) continue;

    const pathMatch = line.match(/^\s{2,}([/][^:\s]+):\s*$/);
    if (!pathMatch) continue;

    const path = pathMatch[1];
    const endpointUrl = normalizeEndpointUrl(base, path);
    if (!endpointUrl) continue;

    endpoints.push({
      endpointUrl: endpointUrl.toString(),
      path,
      method: "UNKNOWN",
      source: "openapi",
      authRequirement: "unknown",
      riskLevel: isSensitivePath(path) ? "Medium" : "Info",
      riskSignals: riskSignals(path, "UNKNOWN", "unknown", []),
      parameters: [],
      responseMetadata: { parsedFromYamlLikeText: true, executed: false },
      apiTop10Mapping: apiMappingsForEndpoint(path, "UNKNOWN", "unknown"),
      safeTestingNotes:
        "YAML-like path discovered from documentation text only. Endpoint was not executed.",
    });
  }

  return endpoints.slice(0, 200);
}

function endpointsFromAttackSurfaceHints(base: URL, hints: string[]) {
  const endpoints: ApiEndpointFinding[] = [];

  for (const raw of hints.slice(0, 150)) {
    const url = normalizeEndpointUrl(base, raw);
    if (!url) continue;

    const auth: ApiEndpointFinding["authRequirement"] = "unknown";
    const method: ApiHttpMethod = "GET";
    const signals = riskSignals(url.pathname, method, auth, [
      ...url.searchParams.keys(),
    ]);

    endpoints.push({
      endpointUrl: url.toString(),
      path: url.pathname,
      method,
      source: "attack-surface-hint",
      authRequirement: auth,
      riskLevel: classifyRisk(url.pathname, method, auth, signals),
      riskSignals: signals,
      parameters: [...url.searchParams.keys()],
      responseMetadata: { discoveredFromAttackSurface: true, executed: false },
      apiTop10Mapping: apiMappingsForEndpoint(url.pathname, method, auth),
      safeTestingNotes:
        "Endpoint imported from attack surface inventory. No API action was executed.",
    });
  }

  return endpoints;
}

function dedupeEndpoints(endpoints: ApiEndpointFinding[]) {
  const seen = new Set<string>();
  const output: ApiEndpointFinding[] = [];

  for (const endpoint of endpoints) {
    const key = `${endpoint.method}:${endpoint.endpointUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(endpoint);
  }

  return output;
}

function createBlockedReport(
  url: URL,
  intensity: EngineIntensity,
  verifiedScope: boolean,
  reason: string,
): ApiSecurityScannerReport {
  const policy = buildPolicy();
  const evidence: EngineEvidenceSeed = {
    evidenceKey: "api-scanner-safety-block",
    sourceModule: "api-discovery-openapi-scanner",
    affectedAsset: url.toString(),
    assetType: "api-endpoint",
    proofType: "policy",
    severity: "High",
    confidence: "High",
    falsePositiveRisk: "Low",
    title: "API scanner blocked by safety policy",
    observedValue: reason,
    expectedValue: "Only verified public website/API targets should be scanned",
    evidenceSummary:
      "The API scanner did not run because the target or scope failed the safety policy.",
    businessImpact:
      "Blocking prevents unsafe internal scanning, unauthorized API testing, and private data access.",
    developerFix:
      "Use a public verified website/API domain with permission attestation.",
    safeClaim: "Can claim the API scanner was blocked by safety policy.",
    blockedClaim: "Cannot claim API security coverage for blocked targets.",
    standards: {
      owaspWstg: ["WSTG-INFO-10"],
      owaspAsvs: ["V13.1"],
      owaspApiTop10: ["API1", "API2", "API5"],
      nistSsdf: ["RV.1"],
    },
    rawMetadata: { reason },
  };

  return {
    version: "38.0",
    generatedAt: new Date().toISOString(),
    targetUrl: url.toString(),
    hostname: url.hostname,
    intensity,
    verifiedScope,
    privateTargetBlocked: true,
    scannerStatus: "blocked",
    scannerPolicy: policy,
    openApiDocuments: [],
    endpoints: [],
    normalizedEvidenceSeeds: [evidence],
    vulnerabilitySeeds: [],
    summary: {
      documentCount: 0,
      endpointCount: 0,
      getEndpointCount: 0,
      mutationMethodCount: 0,
      authUnknownCount: 0,
      sensitivePathCount: 0,
      apiRiskSignalCount: 1,
      blockedExecutionCount: 1,
      customerSummary: "API scanner was blocked by safety policy.",
    },
    safetyBoundary: SAFETY_BOUNDARY,
  };
}

function buildEvidenceAndVulnerabilities(input: {
  targetUrl: string;
  documents: ApiDocumentSignal[];
  endpoints: ApiEndpointFinding[];
}) {
  const summary = {
    documentCount: input.documents.filter(
      (doc) => doc.statusCode && doc.statusCode >= 200 && doc.statusCode < 400,
    ).length,
    endpointCount: input.endpoints.length,
    getEndpointCount: input.endpoints.filter(
      (endpoint) => endpoint.method === "GET",
    ).length,
    mutationMethodCount: input.endpoints.filter((endpoint) =>
      ["POST", "PUT", "PATCH", "DELETE"].includes(endpoint.method),
    ).length,
    authUnknownCount: input.endpoints.filter(
      (endpoint) => endpoint.authRequirement === "unknown",
    ).length,
    sensitivePathCount: input.endpoints.filter((endpoint) =>
      isSensitivePath(endpoint.path),
    ).length,
    apiRiskSignalCount: input.endpoints.filter(
      (endpoint) => endpoint.riskSignals.length,
    ).length,
    blockedExecutionCount: input.endpoints.filter((endpoint) =>
      ["POST", "PUT", "PATCH", "DELETE"].includes(endpoint.method),
    ).length,
  };

  const evidence: EngineEvidenceSeed[] = [
    {
      evidenceKey: "api-discovery-openapi-inventory",
      sourceModule: "api-discovery-openapi-scanner",
      affectedAsset: input.targetUrl,
      assetType: "api-endpoint",
      proofType: "observation",
      severity: "Info",
      confidence: "High",
      falsePositiveRisk: "Low",
      title: "API discovery and OpenAPI inventory generated",
      observedValue: `${summary.documentCount} API docs, ${summary.endpointCount} endpoints, ${summary.mutationMethodCount} mutation methods inventoried`,
      expectedValue:
        "API surfaces should be inventoried and reviewed before deeper API security testing",
      evidenceSummary:
        "The scanner searched for OpenAPI/Swagger/GraphQL documentation and built a safe endpoint inventory without executing mutation methods or storing private response bodies.",
      businessImpact:
        "API inventory helps prioritize authorization, object access, rate-limit, and sensitive-response review.",
      developerFix:
        "Review API endpoint authentication, authorization boundaries, object identifiers, rate limits, and sensitive response handling.",
      safeClaim:
        "Can claim API documentation and endpoint inventory were reviewed safely.",
      blockedClaim:
        "Cannot claim broken authorization, data exposure, or API exploitability without endpoint-specific safe validation.",
      standards: {
        owaspWstg: ["WSTG-INFO-10"],
        owaspAsvs: ["V13.1", "V13.2"],
        owaspApiTop10: ["API1", "API2", "API3", "API5", "API8"],
        nistSsdf: ["RV.1", "RV.2"],
      },
      rawMetadata: summary,
    },
  ];

  const vulnerabilities: VulnerabilitySeed[] = [];

  if (summary.authUnknownCount > 0) {
    vulnerabilities.push({
      vulnerabilityKey: "api-auth-boundary-needs-review",
      title: "API authentication boundary needs review",
      category: "API Security",
      severity: "Medium",
      confidence: "Medium",
      exploitabilityScore: 50,
      businessImpactScore: 75,
      priorityScore: 74,
      affectedAssets: input.endpoints
        .filter((endpoint) => endpoint.authRequirement === "unknown")
        .map((endpoint) => endpoint.endpointUrl)
        .slice(0, 25),
      standards: {
        owaspWstg: ["WSTG-ATHN-01", "WSTG-ATHZ-01"],
        owaspAsvs: ["V13.1", "V13.2"],
        owaspApiTop10: ["API1", "API2", "API5"],
        nistSsdf: ["RV.1"],
      },
      businessImpact:
        "Unknown API auth boundaries can hide broken object authorization or sensitive access risks.",
      developerFix:
        "Document API authentication requirements and verify object-level authorization for sensitive endpoints.",
      verificationGuidance:
        "Use authenticated API test scope and non-destructive endpoint validation in a future API auth boundary module.",
      safeClaim:
        "Can claim auth boundary review is required for inventoried API endpoints.",
      blockedClaim:
        "Cannot claim authentication bypass or broken authorization from documentation alone.",
    });
  }

  if (summary.mutationMethodCount > 0) {
    vulnerabilities.push({
      vulnerabilityKey: "api-mutation-methods-require-safe-validation",
      title: "API mutation methods require safe validation",
      category: "API Method Risk",
      severity: "Medium",
      confidence: "High",
      exploitabilityScore: 45,
      businessImpactScore: 70,
      priorityScore: 70,
      affectedAssets: input.endpoints
        .filter((endpoint) =>
          ["POST", "PUT", "PATCH", "DELETE"].includes(endpoint.method),
        )
        .map((endpoint) => endpoint.endpointUrl)
        .slice(0, 25),
      standards: {
        owaspWstg: ["WSTG-BUSL-04"],
        owaspAsvs: ["V13.1", "V13.2"],
        owaspApiTop10: ["API5", "API6"],
        nistSsdf: ["RV.1"],
      },
      businessImpact:
        "Mutation endpoints can change data, orders, users, payments, or configuration if not protected correctly.",
      developerFix:
        "Review authorization, CSRF/session protections where applicable, input validation, idempotency, and audit logging.",
      verificationGuidance:
        "Do not execute mutation endpoints without staging/test data and explicit non-destructive scope.",
      safeClaim:
        "Can claim mutation methods were inventoried but not executed.",
      blockedClaim:
        "Cannot claim mutation vulnerability or business-logic exploit without safe authorized validation.",
    });
  }

  if (summary.sensitivePathCount > 0) {
    vulnerabilities.push({
      vulnerabilityKey: "sensitive-api-paths-need-review",
      title: "Sensitive API paths need review",
      category: "Sensitive API Surface",
      severity: "Medium",
      confidence: "Medium",
      exploitabilityScore: 40,
      businessImpactScore: 72,
      priorityScore: 68,
      affectedAssets: input.endpoints
        .filter((endpoint) => isSensitivePath(endpoint.path))
        .map((endpoint) => endpoint.endpointUrl)
        .slice(0, 25),
      standards: {
        owaspWstg: ["WSTG-INFO-10", "WSTG-ATHZ-01"],
        owaspAsvs: ["V4.1", "V13.1"],
        owaspApiTop10: ["API1", "API3", "API5"],
        nistSsdf: ["RV.1"],
      },
      businessImpact:
        "Sensitive API paths may involve accounts, users, orders, payments, files, sessions, or tokens.",
      developerFix:
        "Confirm strict authorization, minimal data exposure, logging, and rate limits on sensitive endpoints.",
      verificationGuidance:
        "Run authenticated API review with safe test account and no private data storage.",
      safeClaim: "Can claim sensitive API paths were identified for review.",
      blockedClaim:
        "Cannot claim sensitive data exposure without safe response-level evidence.",
    });
  }

  return { evidence, vulnerabilities, summary };
}

export async function runApiSecurityScanner(input: {
  targetUrl: string;
  intensity?: EngineIntensity;
  verifiedScope?: boolean;
  attackSurfaceHints?: string[];
}): Promise<ApiSecurityScannerReport> {
  const intensity = input.intensity || "standard";
  const verifiedScope = Boolean(input.verifiedScope);
  const target = normalizeTargetUrl(input.targetUrl);
  const policy = buildPolicy();

  if (!verifiedScope) {
    return createBlockedReport(
      target,
      intensity,
      verifiedScope,
      "Verified website scope and permission are required for API security scanner.",
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

  const documents: ApiDocumentSignal[] = [];
  const endpoints: ApiEndpointFinding[] = [];

  for (const path of DOC_PATHS) {
    const docUrl = makeUrl(target, path);
    const fetched = await fetchDoc(docUrl);
    const type = documentType(
      docUrl.toString(),
      fetched.contentType,
      fetched.body,
    );

    let parsed = false;
    let pathCount = 0;
    let methodCount = 0;

    if (
      fetched.statusCode &&
      fetched.statusCode >= 200 &&
      fetched.statusCode < 400
    ) {
      if (type === "openapi-json" || type === "swagger-json") {
        const json = parseJsonSafe(fetched.body);
        if (json) {
          const parsedEndpoints = parseOpenApiEndpoints(
            target,
            json,
            type === "swagger-json" ? "swagger" : "openapi",
          );
          endpoints.push(...parsedEndpoints);
          parsed = true;
          pathCount = Object.keys(
            (json.paths || {}) as Record<string, unknown>,
          ).length;
          methodCount = parsedEndpoints.length;
        }
      } else if (
        fetched.body.toLowerCase().includes("openapi:") ||
        fetched.body.toLowerCase().includes("swagger:")
      ) {
        const parsedEndpoints = parseYamlLikeOpenApi(target, fetched.body);
        endpoints.push(...parsedEndpoints);
        parsed = parsedEndpoints.length > 0;
        pathCount = parsedEndpoints.length;
        methodCount = parsedEndpoints.length;
      } else if (type === "graphql") {
        const graphqlUrl = normalizeEndpointUrl(target, path);
        if (graphqlUrl) {
          endpoints.push({
            endpointUrl: graphqlUrl.toString(),
            path,
            method: "POST",
            source: "graphql-signal",
            authRequirement: "unknown",
            riskLevel: "Medium",
            riskSignals: [
              "graphql surface",
              "mutation method defined but not executed",
              "auth requirement unknown",
            ],
            parameters: [],
            responseMetadata: { graphqlSignal: true, executed: false },
            apiTop10Mapping: ["API1", "API2", "API5", "API8"],
            safeTestingNotes:
              "GraphQL surface observed. No introspection or POST query was executed.",
          });
          pathCount = 1;
          methodCount = 1;
        }
      }
    }

    documents.push({
      url: docUrl.toString(),
      statusCode: fetched.statusCode,
      contentType: fetched.contentType,
      documentType: type,
      title: titleFromHtml(fetched.body),
      parsed,
      pathCount,
      methodCount,
      errorMessage: fetched.errorMessage,
    });
  }

  endpoints.push(
    ...endpointsFromAttackSurfaceHints(target, input.attackSurfaceHints || []),
  );
  const dedupedEndpoints = dedupeEndpoints(endpoints).slice(
    0,
    intensity === "deep" ? 600 : intensity === "light" ? 120 : 300,
  );

  const built = buildEvidenceAndVulnerabilities({
    targetUrl: target.toString(),
    documents,
    endpoints: dedupedEndpoints,
  });

  return {
    version: "38.0",
    generatedAt: new Date().toISOString(),
    targetUrl: target.toString(),
    hostname: target.hostname,
    intensity,
    verifiedScope,
    privateTargetBlocked: false,
    scannerStatus: "completed",
    scannerPolicy: policy,
    openApiDocuments: documents,
    endpoints: dedupedEndpoints,
    normalizedEvidenceSeeds: built.evidence,
    vulnerabilitySeeds: built.vulnerabilities,
    summary: {
      ...built.summary,
      customerSummary:
        "API scanner discovered OpenAPI/Swagger/GraphQL documentation signals and created a safe endpoint inventory with API Top 10 mapping. Mutation methods were inventoried but not executed.",
    },
    safetyBoundary: SAFETY_BOUNDARY,
  };
}
