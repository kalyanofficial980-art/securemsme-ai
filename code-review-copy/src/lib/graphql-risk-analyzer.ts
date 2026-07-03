import dns from "node:dns/promises";
import type {
  EngineEvidenceSeed,
  EngineIntensity,
  VulnerabilitySeed,
} from "@/lib/international-security-engine";

export type GraphqlEndpointObservation = {
  url: string;
  path: string;
  statusCode: number | null;
  contentType: string | null;
  observedSignals: string[];
  ideSignals: string[];
  sensitiveKeywords: string[];
  bodyParsedInMemoryOnly: boolean;
  operationExecuted: false;
  introspectionExecuted: false;
  mutationExecuted: false;
};

export type GraphqlRiskFinding = {
  category:
    | "GraphQL Surface"
    | "GraphQL IDE"
    | "Introspection Review"
    | "Auth Boundary"
    | "Sensitive Schema"
    | "Mutation Surface"
    | "Safety";
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  confidence: "High" | "Medium" | "Low";
  affectedUrl: string;
  observedValue: string;
  expectedValue: string;
  riskSignals: string[];
  apiTop10Mapping: string[];
  evidenceSummary: string;
  businessImpact: string;
  developerFix: string;
  safeClaim: string;
  blockedClaim: string;
  standards: Record<string, string[]>;
  evidenceMetadata: Record<string, unknown>;
};

export type GraphqlRiskReport = {
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
    candidatePaths: string[];
    noGraphqlOperationExecution: boolean;
    noIntrospectionExecution: boolean;
    noMutationExecution: boolean;
    noBruteForce: boolean;
    noPrivateBodyStorage: boolean;
    noCredentialStorage: boolean;
    maxBodyReadBytes: number;
  };
  endpointObservations: GraphqlEndpointObservation[];
  findings: GraphqlRiskFinding[];
  normalizedEvidenceSeeds: EngineEvidenceSeed[];
  vulnerabilitySeeds: VulnerabilitySeed[];
  summary: {
    endpointCount: number;
    ideSignalCount: number;
    introspectionSignalCount: number;
    authUnknownCount: number;
    sensitiveKeywordCount: number;
    mutationSignalCount: number;
    graphqlRiskSignalCount: number;
    blockedExecutionCount: number;
    graphqlRiskScore: number;
    customerSummary: string;
  };
  safetyBoundary: string[];
};

const SAFETY_BOUNDARY = [
  "Verified website scope required",
  "GET/HEAD metadata-only GraphQL discovery",
  "No GraphQL query execution",
  "No introspection query execution",
  "No mutation execution",
  "No brute force",
  "No exploit payloads",
  "No schema dumping",
  "No private response body storage",
  "No credential/session storage",
  "Private/internal targets blocked",
];

const GRAPHQL_PATHS = [
  "/graphql",
  "/api/graphql",
  "/v1/graphql",
  "/v2/graphql",
  "/query",
  "/gql",
  "/graphiql",
  "/playground",
  "/graphql/playground",
  "/apollo",
  "/api",
];

const PRIVATE_HOST_PATTERNS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
];

const SENSITIVE_SCHEMA_KEYWORDS = [
  "password",
  "token",
  "jwt",
  "secret",
  "apiKey",
  "apikey",
  "session",
  "email",
  "phone",
  "address",
  "payment",
  "card",
  "invoice",
  "order",
  "admin",
  "role",
  "permission",
  "user",
  "account",
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
    candidatePaths: GRAPHQL_PATHS,
    noGraphqlOperationExecution: true,
    noIntrospectionExecution: true,
    noMutationExecution: true,
    noBruteForce: true,
    noPrivateBodyStorage: true,
    noCredentialStorage: true,
    maxBodyReadBytes: 120_000,
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

function makeUrl(base: URL, path: string) {
  const url = new URL(base.toString());
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url;
}

async function fetchEndpointMetadata(url: URL, maxBodyReadBytes: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "SecureMSMEAI-GraphQLRiskAnalyzer/1.0",
        Accept: "text/html,application/json,text/plain,*/*",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    let body = "";

    if (
      contentType.includes("text") ||
      contentType.includes("html") ||
      contentType.includes("json") ||
      contentType.includes("javascript")
    ) {
      body = (await response.text()).slice(0, maxBodyReadBytes);
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

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function detectGraphqlSignals(
  url: URL,
  statusCode: number | null,
  contentType: string | null,
  body: string,
) {
  const lowerBody = body.toLowerCase();
  const lowerPath = url.pathname.toLowerCase();
  const signals: string[] = [];

  if (lowerPath.includes("graphql") || lowerPath.includes("gql"))
    signals.push("graphql path signal");
  if (lowerBody.includes("graphql")) signals.push("graphql body signal");
  if (
    lowerBody.includes("cannot query field") ||
    lowerBody.includes("must provide query string")
  )
    signals.push("graphql error message signal");
  if (lowerBody.includes("query") && lowerBody.includes("mutation"))
    signals.push("query/mutation text signal");
  if (
    (contentType || "").toLowerCase().includes("json") &&
    statusCode &&
    statusCode < 500
  )
    signals.push("json response signal");
  if (statusCode === 400 || statusCode === 405)
    signals.push("graphql endpoint style error/status signal");

  return unique(signals);
}

function detectIdeSignals(body: string) {
  const lower = body.toLowerCase();
  const signals: string[] = [];

  if (lower.includes("graphiql")) signals.push("GraphiQL IDE signal");
  if (lower.includes("graphql playground"))
    signals.push("GraphQL Playground signal");
  if (lower.includes("apollo studio") || lower.includes("apollo sandbox"))
    signals.push("Apollo Sandbox/Studio signal");
  if (lower.includes("voyager")) signals.push("GraphQL Voyager signal");
  if (lower.includes("__schema") || lower.includes("__type"))
    signals.push("introspection keyword visible in page");
  if (lower.includes("introspection"))
    signals.push("introspection keyword visible");

  return unique(signals);
}

function detectSensitiveKeywords(body: string) {
  const lower = body.toLowerCase();

  return unique(
    SENSITIVE_SCHEMA_KEYWORDS.filter((keyword) =>
      lower.includes(keyword.toLowerCase()),
    ),
  ).slice(0, 20);
}

function detectMutationSignals(body: string) {
  const lower = body.toLowerCase();
  const signals: string[] = [];

  if (lower.includes("mutation")) signals.push("mutation keyword visible");
  if (
    /\b(create|update|delete|remove|checkout|payment|upload|resetpassword)\b/i.test(
      body,
    )
  ) {
    signals.push("mutation-like operation keyword visible");
  }

  return unique(signals);
}

function authUnknown(url: URL, body: string, statusCode: number | null) {
  const lower = body.toLowerCase();

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden")
  ) {
    return false;
  }

  return true;
}

function severityFromSignals(input: {
  ideSignals: string[];
  introspectionSignals: string[];
  sensitiveKeywords: string[];
  mutationSignals: string[];
  authUnknown: boolean;
}) {
  if (
    input.ideSignals.length &&
    input.sensitiveKeywords.length &&
    input.authUnknown
  )
    return "High";
  if (input.introspectionSignals.length && input.authUnknown) return "Medium";
  if (input.mutationSignals.length && input.authUnknown) return "Medium";
  if (input.sensitiveKeywords.length) return "Medium";
  if (input.ideSignals.length) return "Low";

  return "Info";
}

const graphqlStandards = {
  surface: {
    owaspWstg: ["WSTG-INFO-10"],
    owaspAsvs: ["V13.1", "V13.2"],
    owaspApiTop10: ["API1", "API2", "API5", "API8"],
    nistSsdf: ["RV.1", "RV.2"],
  },
  auth: {
    owaspWstg: ["WSTG-ATHN-01", "WSTG-ATHZ-01"],
    owaspAsvs: ["V4.1", "V13.1", "V13.2"],
    owaspApiTop10: ["API1", "API2", "API5"],
    nistSsdf: ["RV.1"],
  },
  sensitive: {
    owaspWstg: ["WSTG-INFO-10"],
    owaspAsvs: ["V13.1", "V13.2"],
    owaspApiTop10: ["API3", "API5"],
    nistSsdf: ["RV.1", "RV.2"],
  },
  ide: {
    owaspWstg: ["WSTG-CONF-06", "WSTG-INFO-10"],
    owaspAsvs: ["V14.2", "V13.1"],
    owaspApiTop10: ["API8", "API9"],
    nistSsdf: ["PW.8", "RV.1"],
  },
};

function apiTop10Mapping(signals: string[]) {
  const mappings = new Set<string>(["API8"]);

  if (signals.some((signal) => signal.toLowerCase().includes("auth")))
    mappings.add("API2");
  if (signals.some((signal) => signal.toLowerCase().includes("sensitive")))
    mappings.add("API3");
  if (signals.some((signal) => signal.toLowerCase().includes("mutation")))
    mappings.add("API5");
  if (
    signals.some(
      (signal) =>
        signal.toLowerCase().includes("schema") ||
        signal.toLowerCase().includes("introspection"),
    )
  )
    mappings.add("API9");

  return [...mappings];
}

function buildFindingsForObservation(observation: GraphqlEndpointObservation) {
  const findings: GraphqlRiskFinding[] = [];

  if (observation.observedSignals.length) {
    findings.push({
      category: "GraphQL Surface",
      title: "GraphQL endpoint surface observed",
      severity: "Info",
      confidence: "Medium",
      affectedUrl: observation.url,
      observedValue: observation.observedSignals.join(", "),
      expectedValue:
        "GraphQL endpoints should be documented, authenticated where needed, and monitored",
      riskSignals: observation.observedSignals,
      apiTop10Mapping: ["API8"],
      evidenceSummary:
        "GraphQL endpoint-style signals were observed from safe GET metadata.",
      businessImpact:
        "GraphQL endpoints can centralize sensitive data access and require careful authorization boundaries.",
      developerFix:
        "Confirm this endpoint is intentional, documented, monitored, and protected by appropriate authentication/authorization.",
      safeClaim: "Can claim GraphQL surface signals were observed.",
      blockedClaim:
        "Cannot claim GraphQL vulnerability or schema exposure without safe validation.",
      standards: graphqlStandards.surface,
      evidenceMetadata: { operationExecuted: false, bodyStored: false },
    });
  }

  if (observation.ideSignals.length) {
    findings.push({
      category: "GraphQL IDE",
      title: "GraphQL IDE/playground exposure signal",
      severity: observation.sensitiveKeywords.length ? "Medium" : "Low",
      confidence: "Medium",
      affectedUrl: observation.url,
      observedValue: observation.ideSignals.join(", "),
      expectedValue:
        "Disable public GraphQL IDEs in production or restrict them to trusted users/networks",
      riskSignals: observation.ideSignals,
      apiTop10Mapping: ["API8", "API9"],
      evidenceSummary: "GraphQL IDE/playground-style signals were observed.",
      businessImpact:
        "Public IDEs can help attackers explore API behavior if combined with weak auth or introspection.",
      developerFix:
        "Disable production GraphQL IDEs or restrict access. Keep API documentation behind approved access where needed.",
      safeClaim: "Can claim GraphQL IDE exposure signals were observed.",
      blockedClaim:
        "Cannot claim schema dump or exploitability because introspection was not executed.",
      standards: graphqlStandards.ide,
      evidenceMetadata: {
        ideSignals: observation.ideSignals,
        bodyStored: false,
      },
    });
  }

  const introspectionSignals = observation.ideSignals.filter((signal) =>
    signal.toLowerCase().includes("introspection"),
  );
  if (introspectionSignals.length) {
    findings.push({
      category: "Introspection Review",
      title: "Introspection review signal observed",
      severity: "Medium",
      confidence: "Low",
      affectedUrl: observation.url,
      observedValue: introspectionSignals.join(", "),
      expectedValue:
        "Production introspection should be controlled based on business need",
      riskSignals: introspectionSignals,
      apiTop10Mapping: ["API8", "API9"],
      evidenceSummary:
        "Introspection-related keywords were observed in public metadata/page content. No introspection query was executed.",
      businessImpact:
        "Public introspection can make API schema exploration easier if enabled without controls.",
      developerFix:
        "Review whether introspection is enabled in production and restrict/monitor it if unnecessary.",
      safeClaim:
        "Can claim introspection review is recommended from observed signals.",
      blockedClaim:
        "Cannot claim introspection is enabled because introspection query was not executed.",
      standards: graphqlStandards.ide,
      evidenceMetadata: { introspectionExecuted: false, bodyStored: false },
    });
  }

  if (observation.sensitiveKeywords.length) {
    findings.push({
      category: "Sensitive Schema",
      title: "Sensitive GraphQL keyword signals observed",
      severity: "Medium",
      confidence: "Low",
      affectedUrl: observation.url,
      observedValue: observation.sensitiveKeywords.join(", "),
      expectedValue:
        "Sensitive schema/data concepts should require strict object-level authorization",
      riskSignals: observation.sensitiveKeywords.map(
        (keyword) => `sensitive keyword: ${keyword}`,
      ),
      apiTop10Mapping: ["API1", "API2", "API3", "API5"],
      evidenceSummary:
        "Sensitive business/data keywords were observed in public GraphQL-related metadata/page text.",
      businessImpact:
        "GraphQL APIs involving users, accounts, payments, orders, roles or tokens need strict authorization and response controls.",
      developerFix:
        "Review schema fields/resolvers for object-level authorization, minimal data exposure and logging.",
      safeClaim:
        "Can claim sensitive GraphQL review is recommended from keyword signals.",
      blockedClaim:
        "Cannot claim sensitive data exposure because private responses were not accessed or stored.",
      standards: graphqlStandards.sensitive,
      evidenceMetadata: {
        sensitiveKeywords: observation.sensitiveKeywords,
        bodyStored: false,
      },
    });
  }

  const mutationSignals = observation.observedSignals.filter((signal) =>
    signal.toLowerCase().includes("mutation"),
  );
  if (mutationSignals.length) {
    findings.push({
      category: "Mutation Surface",
      title: "GraphQL mutation surface signal observed",
      severity: "Medium",
      confidence: "Low",
      affectedUrl: observation.url,
      observedValue: mutationSignals.join(", "),
      expectedValue:
        "Mutations should have strict authorization, validation, rate limits and audit logging",
      riskSignals: mutationSignals,
      apiTop10Mapping: ["API1", "API2", "API5", "API6"],
      evidenceSummary:
        "Mutation-related text signals were observed. No mutation was executed.",
      businessImpact:
        "GraphQL mutations can change accounts, orders, payments, files or other business data if weakly protected.",
      developerFix:
        "Review mutation resolvers for authorization, validation, anti-abuse controls and audit logging.",
      safeClaim: "Can claim mutation surface review is recommended.",
      blockedClaim:
        "Cannot claim mutation vulnerability because no mutation was executed.",
      standards: graphqlStandards.auth,
      evidenceMetadata: { mutationExecuted: false, bodyStored: false },
    });
  }

  return findings;
}

function dedupeFindings(findings: GraphqlRiskFinding[]) {
  const seen = new Set<string>();
  const output: GraphqlRiskFinding[] = [];

  for (const finding of findings) {
    const key = `${finding.category}:${finding.title}:${finding.affectedUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(finding);
  }

  return output;
}

function calculateRiskScore(findings: GraphqlRiskFinding[]) {
  let score = 0;

  for (const finding of findings) {
    if (finding.severity === "Critical") score += 30;
    else if (finding.severity === "High") score += 24;
    else if (finding.severity === "Medium") score += 14;
    else if (finding.severity === "Low") score += 6;
    else score += 2;
  }

  return Math.max(0, Math.min(100, score));
}

function buildEvidenceAndVulnerabilities(input: {
  targetUrl: string;
  findings: GraphqlRiskFinding[];
  observations: GraphqlEndpointObservation[];
  riskScore: number;
}) {
  const evidence: EngineEvidenceSeed[] = [
    {
      evidenceKey: "graphql-risk-analysis",
      sourceModule: "graphql-risk-analyzer",
      affectedAsset: input.targetUrl,
      assetType: "api-endpoint",
      proofType: "metadata",
      severity: input.riskScore >= 50 ? "Medium" : "Info",
      confidence: "Medium",
      falsePositiveRisk: "Medium",
      title: "GraphQL risk analysis completed",
      observedValue: `${input.observations.length} GraphQL observations, ${input.findings.length} findings, risk score ${input.riskScore}`,
      expectedValue:
        "GraphQL surfaces should be controlled, documented, authenticated and monitored",
      evidenceSummary:
        "The analyzer reviewed GraphQL endpoint/IDE/introspection/mutation/sensitive keyword signals using safe metadata-only observation. No GraphQL operation or introspection query was executed.",
      businessImpact:
        "GraphQL APIs can concentrate sensitive object access and business logic, making authorization and schema controls important.",
      developerFix:
        "Review GraphQL endpoint exposure, IDE availability, introspection policy, resolver authorization, mutation controls and monitoring.",
      safeClaim:
        "Can claim GraphQL surface and risk signals were reviewed safely.",
      blockedClaim:
        "Cannot claim schema dump, introspection enabled, broken authorization or data exposure without safe validation.",
      standards: {
        owaspWstg: ["WSTG-INFO-10", "WSTG-ATHZ-01"],
        owaspAsvs: ["V4.1", "V13.1", "V13.2"],
        owaspApiTop10: ["API1", "API2", "API3", "API5", "API8", "API9"],
        nistSsdf: ["RV.1", "RV.2"],
      },
      rawMetadata: {
        riskScore: input.riskScore,
        categories: unique(input.findings.map((finding) => finding.category)),
      },
    },
  ];

  const vulnerabilities: VulnerabilitySeed[] = [];

  if (input.findings.some((finding) => finding.category === "GraphQL IDE")) {
    vulnerabilities.push({
      vulnerabilityKey: "graphql-ide-exposure-review-required",
      title: "GraphQL IDE exposure review required",
      category: "GraphQL Security",
      severity: "Medium",
      confidence: "Medium",
      exploitabilityScore: 45,
      businessImpactScore: 70,
      priorityScore: 68,
      affectedAssets: input.findings
        .filter((finding) => finding.category === "GraphQL IDE")
        .map((finding) => finding.affectedUrl)
        .slice(0, 20),
      standards: graphqlStandards.ide,
      businessImpact:
        "Public GraphQL IDEs can make API exploration easier if paired with weak authentication or introspection.",
      developerFix:
        "Disable production GraphQL IDEs or restrict them to trusted users/networks.",
      verificationGuidance:
        "Confirm IDE exposure and introspection policy in a safe authorized review.",
      safeClaim: "Can claim GraphQL IDE exposure review is required.",
      blockedClaim:
        "Cannot claim schema dump or exploitability without safe validation.",
    });
  }

  if (
    input.findings.some((finding) => finding.category === "Sensitive Schema")
  ) {
    vulnerabilities.push({
      vulnerabilityKey: "graphql-sensitive-schema-review-required",
      title: "GraphQL sensitive schema review required",
      category: "GraphQL Security",
      severity: "Medium",
      confidence: "Low",
      exploitabilityScore: 40,
      businessImpactScore: 75,
      priorityScore: 66,
      affectedAssets: input.findings
        .filter((finding) => finding.category === "Sensitive Schema")
        .map((finding) => finding.affectedUrl)
        .slice(0, 20),
      standards: graphqlStandards.sensitive,
      businessImpact:
        "Sensitive schema/data concepts require strict object-level authorization and minimal response exposure.",
      developerFix:
        "Review resolvers for object-level authorization, role checks, field-level authorization and logging.",
      verificationGuidance:
        "Run authenticated GraphQL resolver review with a test account and no private data storage.",
      safeClaim: "Can claim sensitive GraphQL review is recommended.",
      blockedClaim:
        "Cannot claim sensitive data exposure from keyword signals alone.",
    });
  }

  if (
    input.findings.some((finding) => finding.category === "Mutation Surface")
  ) {
    vulnerabilities.push({
      vulnerabilityKey: "graphql-mutation-controls-review-required",
      title: "GraphQL mutation controls review required",
      category: "GraphQL Security",
      severity: "Medium",
      confidence: "Low",
      exploitabilityScore: 45,
      businessImpactScore: 72,
      priorityScore: 70,
      affectedAssets: input.findings
        .filter((finding) => finding.category === "Mutation Surface")
        .map((finding) => finding.affectedUrl)
        .slice(0, 20),
      standards: graphqlStandards.auth,
      businessImpact:
        "GraphQL mutations can change business data and need strong authorization, validation and logging.",
      developerFix:
        "Review mutation resolvers, require authorization, validate input, add rate limits and audit logs.",
      verificationGuidance:
        "Do not execute mutations without staging/test data and explicit safe scope.",
      safeClaim: "Can claim mutation controls review is required.",
      blockedClaim:
        "Cannot claim mutation vulnerability because no mutation was executed.",
    });
  }

  return { evidence, vulnerabilities };
}

function createBlockedReport(
  url: URL,
  intensity: EngineIntensity,
  verifiedScope: boolean,
  reason: string,
): GraphqlRiskReport {
  const policy = buildPolicy();
  const finding: GraphqlRiskFinding = {
    category: "Safety",
    title: "GraphQL risk analyzer blocked by safety policy",
    severity: "High",
    confidence: "High",
    affectedUrl: url.toString(),
    observedValue: reason,
    expectedValue:
      "Only verified public website/API targets should be analyzed",
    riskSignals: [reason],
    apiTop10Mapping: ["API8"],
    evidenceSummary:
      "The GraphQL analyzer did not run because the target or scope failed the safety policy.",
    businessImpact:
      "Blocking prevents unsafe internal scanning, unauthorized API testing and private data access.",
    developerFix:
      "Use a public verified website/API domain with permission attestation.",
    safeClaim: "Can claim GraphQL analyzer was blocked by safety policy.",
    blockedClaim: "Cannot claim GraphQL coverage for blocked targets.",
    standards: {
      owaspWstg: ["WSTG-INFO-10"],
      owaspAsvs: ["V13.1"],
      owaspApiTop10: ["API8"],
      nistSsdf: ["RV.1"],
    },
    evidenceMetadata: { reason },
  };

  const built = buildEvidenceAndVulnerabilities({
    targetUrl: url.toString(),
    findings: [finding],
    observations: [],
    riskScore: 0,
  });

  return {
    version: "40.0",
    generatedAt: new Date().toISOString(),
    targetUrl: url.toString(),
    hostname: url.hostname,
    intensity,
    verifiedScope,
    privateTargetBlocked: true,
    analyzerStatus: "blocked",
    analyzerPolicy: policy,
    endpointObservations: [],
    findings: [finding],
    normalizedEvidenceSeeds: built.evidence,
    vulnerabilitySeeds: built.vulnerabilities,
    summary: {
      endpointCount: 0,
      ideSignalCount: 0,
      introspectionSignalCount: 0,
      authUnknownCount: 0,
      sensitiveKeywordCount: 0,
      mutationSignalCount: 0,
      graphqlRiskSignalCount: 1,
      blockedExecutionCount: 1,
      graphqlRiskScore: 0,
      customerSummary: "GraphQL risk analyzer was blocked by safety policy.",
    },
    safetyBoundary: SAFETY_BOUNDARY,
  };
}

function candidateUrls(
  target: URL,
  hints: string[],
  intensity: EngineIntensity,
) {
  const urls: URL[] = GRAPHQL_PATHS.map((path) => makeUrl(target, path));

  for (const hint of hints) {
    const normalized = normalizeCandidateUrl(target, hint);
    if (!normalized) continue;

    const lower = normalized.pathname.toLowerCase();
    if (
      lower.includes("graphql") ||
      lower.includes("gql") ||
      lower.includes("query")
    ) {
      urls.push(normalized);
    }
  }

  const limit = intensity === "light" ? 8 : intensity === "deep" ? 40 : 20;

  return [...new Map(urls.map((url) => [url.toString(), url])).values()].slice(
    0,
    limit,
  );
}

export async function runGraphqlRiskAnalyzer(input: {
  targetUrl: string;
  intensity?: EngineIntensity;
  verifiedScope?: boolean;
  endpointHints?: string[];
}): Promise<GraphqlRiskReport> {
  const intensity = input.intensity || "standard";
  const verifiedScope = Boolean(input.verifiedScope);
  const target = normalizeTargetUrl(input.targetUrl);
  const policy = buildPolicy();

  if (!verifiedScope) {
    return createBlockedReport(
      target,
      intensity,
      verifiedScope,
      "Verified website/API scope and permission are required for GraphQL risk analyzer.",
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

  const observations: GraphqlEndpointObservation[] = [];

  for (const url of candidateUrls(
    target,
    input.endpointHints || [],
    intensity,
  )) {
    const fetched = await fetchEndpointMetadata(url, policy.maxBodyReadBytes);
    const graphqlSignals = detectGraphqlSignals(
      url,
      fetched.statusCode,
      fetched.contentType,
      fetched.body,
    );
    const ideSignals = detectIdeSignals(fetched.body);
    const sensitiveKeywords = detectSensitiveKeywords(fetched.body);
    const mutationSignals = detectMutationSignals(fetched.body);
    const observedSignals = unique([...graphqlSignals, ...mutationSignals]);

    if (
      observedSignals.length ||
      ideSignals.length ||
      sensitiveKeywords.length ||
      url.pathname.toLowerCase().includes("graphql")
    ) {
      observations.push({
        url: url.toString(),
        path: url.pathname,
        statusCode: fetched.statusCode,
        contentType: fetched.contentType,
        observedSignals,
        ideSignals,
        sensitiveKeywords,
        bodyParsedInMemoryOnly: true,
        operationExecuted: false,
        introspectionExecuted: false,
        mutationExecuted: false,
      });
    }
  }

  const findings = dedupeFindings(
    observations.flatMap((observation) =>
      buildFindingsForObservation(observation),
    ),
  );
  const riskScore = calculateRiskScore(findings);
  const built = buildEvidenceAndVulnerabilities({
    targetUrl: target.toString(),
    findings,
    observations,
    riskScore,
  });

  const introspectionSignalCount = findings.filter(
    (finding) => finding.category === "Introspection Review",
  ).length;
  const summary = {
    endpointCount: observations.length,
    ideSignalCount: findings.filter(
      (finding) => finding.category === "GraphQL IDE",
    ).length,
    introspectionSignalCount,
    authUnknownCount: observations.filter((observation) =>
      authUnknown(new URL(observation.url), "", observation.statusCode),
    ).length,
    sensitiveKeywordCount: findings.filter(
      (finding) => finding.category === "Sensitive Schema",
    ).length,
    mutationSignalCount: findings.filter(
      (finding) => finding.category === "Mutation Surface",
    ).length,
    graphqlRiskSignalCount: findings.length,
    blockedExecutionCount: observations.length,
    graphqlRiskScore: riskScore,
    customerSummary:
      "GraphQL risk analyzer reviewed endpoint, IDE/playground, introspection, mutation and sensitive keyword signals using metadata-only observation. No GraphQL query, introspection query or mutation was executed.",
  };

  return {
    version: "40.0",
    generatedAt: new Date().toISOString(),
    targetUrl: target.toString(),
    hostname: target.hostname,
    intensity,
    verifiedScope,
    privateTargetBlocked: false,
    analyzerStatus: "completed",
    analyzerPolicy: policy,
    endpointObservations: observations,
    findings,
    normalizedEvidenceSeeds: built.evidence,
    vulnerabilitySeeds: built.vulnerabilities,
    summary,
    safetyBoundary: SAFETY_BOUNDARY,
  };
}
