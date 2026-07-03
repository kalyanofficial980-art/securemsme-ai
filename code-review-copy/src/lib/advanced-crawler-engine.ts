import dns from "node:dns/promises";
import type {
  EngineIntensity,
  EngineEvidenceSeed,
  VulnerabilitySeed,
} from "@/lib/international-security-engine";

export type AttackSurfaceItemType =
  | "route"
  | "api-endpoint"
  | "form"
  | "input"
  | "parameter"
  | "script"
  | "link"
  | "javascript-route"
  | "resource"
  | "blocked-route"
  | "risk-signal";

export type AttackSurfaceItem = {
  itemType: AttackSurfaceItemType;
  method?: string;
  url: string;
  path?: string;
  sourceUrl?: string;
  statusCode?: number | null;
  contentType?: string | null;
  title?: string;
  riskSignal?: string;
  sensitivity: "low" | "medium" | "high";
  evidenceMetadata: Record<string, unknown>;
};

export type CrawledPage = {
  url: string;
  path: string;
  statusCode: number | null;
  contentType: string | null;
  title: string | null;
  linksFound: number;
  scriptsFound: number;
  formsFound: number;
  parametersFound: number;
  jsRoutesFound: number;
  riskSignals: string[];
};

export type AdvancedCrawlerReport = {
  version: string;
  generatedAt: string;
  targetUrl: string;
  hostname: string;
  intensity: EngineIntensity;
  verifiedScope: boolean;
  privateTargetBlocked: boolean;
  crawlerStatus: "completed" | "completed-with-warnings" | "blocked" | "failed";
  crawlerPolicy: {
    sameOriginOnly: boolean;
    allowedMethods: string[];
    blockedMethods: string[];
    maxPages: number;
    maxLinksPerPage: number;
    maxRuntimeSeconds: number;
    maxBodyReadBytes: number;
    noFormSubmission: boolean;
    noMutationRequests: boolean;
    noPrivateBodyStorage: boolean;
  };
  pages: CrawledPage[];
  items: AttackSurfaceItem[];
  normalizedEvidenceSeeds: EngineEvidenceSeed[];
  vulnerabilitySeeds: VulnerabilitySeed[];
  summary: {
    routeCount: number;
    apiEndpointCount: number;
    formCount: number;
    inputCount: number;
    scriptCount: number;
    parameterCount: number;
    jsRouteCount: number;
    blockedCount: number;
    riskSignalCount: number;
    customerSummary: string;
  };
  safetyBoundary: string[];
};

const SAFETY_BOUNDARY = [
  "Verified website scope required",
  "Same-origin crawling only",
  "GET and HEAD only",
  "No form submission",
  "No POST/PUT/PATCH/DELETE",
  "No login attempt",
  "No brute force",
  "No exploit payloads",
  "No destructive testing",
  "No payment/order mutation",
  "No private page body storage",
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

const BLOCKED_PATH_KEYWORDS = [
  "logout",
  "delete",
  "remove",
  "destroy",
  "checkout",
  "payment",
  "pay",
  "order/cancel",
  "cart/checkout",
  "settings/password",
  "settings/email",
  "admin/delete",
  "upload",
  "publish",
  "edit",
  "update",
];

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

  const blocked = addresses.find((address) =>
    address.family === 4
      ? isPrivateIPv4(address.address)
      : isPrivateIPv6(address.address),
  );

  if (blocked)
    throw new Error("Resolved private/internal IP address is blocked.");
}

function buildPolicy(intensity: EngineIntensity) {
  return {
    sameOriginOnly: true,
    allowedMethods: ["GET", "HEAD"],
    blockedMethods: ["POST", "PUT", "PATCH", "DELETE"],
    maxPages: intensity === "light" ? 8 : intensity === "deep" ? 50 : 25,
    maxLinksPerPage:
      intensity === "light" ? 20 : intensity === "deep" ? 80 : 45,
    maxRuntimeSeconds:
      intensity === "light" ? 60 : intensity === "deep" ? 240 : 150,
    maxBodyReadBytes: 180_000,
    noFormSubmission: true,
    noMutationRequests: true,
    noPrivateBodyStorage: true,
  };
}

function isSameOrigin(base: URL, candidate: URL) {
  return (
    base.protocol === candidate.protocol &&
    base.hostname === candidate.hostname &&
    base.port === candidate.port
  );
}

function normalizeDiscoveredUrl(base: URL, raw: string) {
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
    return url;
  } catch {
    return null;
  }
}

function isBlockedPath(url: URL) {
  const text = `${url.pathname}${url.search}`.toLowerCase();

  return BLOCKED_PATH_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isApiPath(path: string) {
  const lower = path.toLowerCase();

  return (
    lower.includes("/api") ||
    lower.includes("graphql") ||
    lower.includes("swagger") ||
    lower.includes("openapi") ||
    lower.endsWith(".json")
  );
}

function extractTitle(html: string) {
  return html.match(/<title[^>]*>([^<]{0,180})<\/title>/i)?.[1]?.trim() || null;
}

function extractLinks(baseUrl: URL, html: string) {
  const links = [...html.matchAll(/\s(?:href|src)=["']([^"']{1,700})["']/gi)]
    .map((match) => normalizeDiscoveredUrl(baseUrl, match[1]))
    .filter((url): url is URL => Boolean(url));

  return links;
}

function extractScriptSources(baseUrl: URL, html: string) {
  return [...html.matchAll(/<script[^>]+src=["']([^"']{1,700})["'][^>]*>/gi)]
    .map((match) => normalizeDiscoveredUrl(baseUrl, match[1]))
    .filter((url): url is URL => Boolean(url));
}

function extractJsRoutes(baseUrl: URL, html: string) {
  const routePatterns = [
    /["'`]((?:\/|\.\.?\/)[a-zA-Z0-9_./?=&%-]{2,220})["'`]/g,
    /fetch\(\s*["'`]([^"'`]{2,220})["'`]/g,
    /axios\.(?:get|post|put|delete|patch)\(\s*["'`]([^"'`]{2,220})["'`]/g,
  ];

  const routes: URL[] = [];

  for (const pattern of routePatterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = match[1];
      if (!raw || raw.includes("<") || raw.includes("{") || raw.includes("}"))
        continue;
      const url = normalizeDiscoveredUrl(baseUrl, raw);
      if (url) routes.push(url);
    }
  }

  return routes;
}

function extractForms(baseUrl: URL, html: string) {
  const forms: Array<{
    method: string;
    actionUrl: URL;
    inputNames: string[];
    inputTypes: string[];
    hasPassword: boolean;
    hasFile: boolean;
  }> = [];

  for (const formMatch of html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/gi)) {
    const full = formMatch[0];
    const body = formMatch[1] || "";
    const method =
      full.match(/\smethod=["']?([a-zA-Z]+)["']?/i)?.[1]?.toUpperCase() ||
      "GET";
    const action =
      full.match(/\saction=["']([^"']{0,700})["']/i)?.[1] || baseUrl.pathname;
    const actionUrl = normalizeDiscoveredUrl(baseUrl, action) || baseUrl;
    const inputNames = [
      ...body.matchAll(/\sname=["']([^"']{1,120})["']/gi),
    ].map((match) => match[1]);
    const inputTypes = [...body.matchAll(/\stype=["']([^"']{1,60})["']/gi)].map(
      (match) => match[1].toLowerCase(),
    );
    forms.push({
      method,
      actionUrl,
      inputNames: [...new Set(inputNames)].slice(0, 30),
      inputTypes: [...new Set(inputTypes)].slice(0, 20),
      hasPassword: inputTypes.includes("password"),
      hasFile: inputTypes.includes("file"),
    });
  }

  return forms;
}

function queryParams(url: URL) {
  return [...url.searchParams.keys()].filter(Boolean);
}

function riskSignalsForUrl(url: URL, title?: string | null) {
  const text = `${url.pathname} ${url.search} ${title || ""}`.toLowerCase();
  const signals: string[] = [];

  if (text.includes("admin")) signals.push("admin surface signal");
  if (text.includes("login") || text.includes("signin"))
    signals.push("login surface signal");
  if (text.includes("debug") || text.includes("phpinfo"))
    signals.push("debug surface signal");
  if (text.includes("swagger") || text.includes("openapi"))
    signals.push("api documentation surface");
  if (text.includes("graphql")) signals.push("graphql surface signal");
  if (text.includes("backup") || text.includes(".sql") || text.includes(".zip"))
    signals.push("backup/sensitive file path signal");
  if (queryParams(url).length) signals.push("url parameter surface");

  return signals;
}

function sensitivityFromSignals(
  signals: string[],
  form?: { hasPassword?: boolean; hasFile?: boolean; method?: string },
) {
  if (
    form?.hasPassword ||
    form?.hasFile ||
    signals.some(
      (signal) => signal.includes("debug") || signal.includes("backup"),
    )
  ) {
    return "high";
  }

  if (form?.method && !["GET", "HEAD"].includes(form.method)) return "medium";
  if (signals.length) return "medium";

  return "low";
}

async function fetchPage(url: URL, maxBodyReadBytes: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "SecureMSMEAI-AdvancedCrawler/1.0",
      },
    });

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

function createBlockedReport(
  url: URL,
  intensity: EngineIntensity,
  verifiedScope: boolean,
  reason: string,
): AdvancedCrawlerReport {
  const policy = buildPolicy(intensity);
  const evidence: EngineEvidenceSeed = {
    evidenceKey: "advanced-crawler-safety-block",
    sourceModule: "advanced-crawler-foundation",
    affectedAsset: url.toString(),
    assetType: "web-url",
    proofType: "policy",
    severity: "High",
    confidence: "High",
    falsePositiveRisk: "Low",
    title: "Advanced crawler blocked by safety policy",
    observedValue: reason,
    expectedValue: "Only verified public website targets should be crawled",
    evidenceSummary:
      "The crawler did not run because the target or scope failed the safety policy.",
    businessImpact:
      "Blocking prevents unsafe SSRF/internal scanning and unauthorized crawling.",
    developerFix:
      "Use a public verified website domain with permission attestation.",
    safeClaim: "Can claim the crawler was blocked by safety policy.",
    blockedClaim: "Cannot claim attack surface coverage for blocked targets.",
    standards: {
      owaspWstg: ["WSTG-INFO-01"],
      owaspAsvs: ["V1.1"],
      owaspApiTop10: [],
      nistSsdf: ["RV.1"],
    },
    rawMetadata: { reason },
  };

  return {
    version: "37.0",
    generatedAt: new Date().toISOString(),
    targetUrl: url.toString(),
    hostname: url.hostname,
    intensity,
    verifiedScope,
    privateTargetBlocked: true,
    crawlerStatus: "blocked",
    crawlerPolicy: policy,
    pages: [],
    items: [
      {
        itemType: "blocked-route",
        method: "GET",
        url: url.toString(),
        path: url.pathname,
        sensitivity: "high",
        riskSignal: reason,
        evidenceMetadata: { reason },
      },
    ],
    normalizedEvidenceSeeds: [evidence],
    vulnerabilitySeeds: [],
    summary: {
      routeCount: 0,
      apiEndpointCount: 0,
      formCount: 0,
      inputCount: 0,
      scriptCount: 0,
      parameterCount: 0,
      jsRouteCount: 0,
      blockedCount: 1,
      riskSignalCount: 1,
      customerSummary: "Advanced crawler was blocked by safety policy.",
    },
    safetyBoundary: SAFETY_BOUNDARY,
  };
}

function dedupeItems(items: AttackSurfaceItem[]) {
  const seen = new Set<string>();
  const output: AttackSurfaceItem[] = [];

  for (const item of items) {
    const key = `${item.itemType}:${item.method || ""}:${item.url}:${item.riskSignal || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

function buildEvidenceAndVulnerabilities(input: {
  targetUrl: string;
  summary: AdvancedCrawlerReport["summary"];
  pages: CrawledPage[];
  items: AttackSurfaceItem[];
}) {
  const standards = {
    owaspWstg: ["WSTG-INFO-05", "WSTG-CONF-04"],
    owaspAsvs: ["V1.2", "V14.4"],
    owaspApiTop10: input.summary.apiEndpointCount
      ? ["API1", "API2", "API5", "API8"]
      : [],
    nistSsdf: ["PW.8", "RV.1"],
  };

  const evidence: EngineEvidenceSeed[] = [
    {
      evidenceKey: "advanced-attack-surface-inventory",
      sourceModule: "advanced-crawler-foundation",
      affectedAsset: input.targetUrl,
      assetType: "web-url",
      proofType: "observation",
      severity: "Info",
      confidence: "High",
      falsePositiveRisk: "Low",
      title: "Advanced attack surface inventory generated",
      observedValue: `${input.summary.routeCount} routes, ${input.summary.apiEndpointCount} API endpoints, ${input.summary.formCount} forms, ${input.summary.parameterCount} parameters`,
      expectedValue:
        "Attack surface should be inventoried and reviewed before deeper testing",
      evidenceSummary:
        "Crawler discovered safe same-origin routes, API signals, forms, inputs, parameters, scripts, and JavaScript routes without submitting forms or mutating data.",
      businessImpact:
        "A clear attack surface inventory helps prioritize deeper security testing and remediation.",
      developerFix:
        "Review discovered routes and protect sensitive/API/admin surfaces with correct authentication, authorization, and monitoring.",
      safeClaim:
        "Can claim safe same-origin attack surface inventory was generated.",
      blockedClaim:
        "Cannot claim vulnerabilities were exploited or all hidden routes were found.",
      standards,
      rawMetadata: input.summary,
    },
  ];

  const vulnerabilities: VulnerabilitySeed[] = [];

  if (input.summary.apiEndpointCount > 0) {
    vulnerabilities.push({
      vulnerabilityKey: "api-surface-needs-security-review",
      title: "API surface needs security review",
      category: "API Security",
      severity: "Medium",
      confidence: "Medium",
      exploitabilityScore: 45,
      businessImpactScore: 75,
      priorityScore: 72,
      affectedAssets: input.items
        .filter((item) => item.itemType === "api-endpoint")
        .map((item) => item.url)
        .slice(0, 25),
      standards: {
        owaspWstg: ["WSTG-INFO-10"],
        owaspAsvs: ["V13.1", "V13.2"],
        owaspApiTop10: ["API1", "API2", "API5"],
        nistSsdf: ["RV.1"],
      },
      businessImpact:
        "Public API surfaces may expose business logic, customer data, or authorization risks if not reviewed.",
      developerFix:
        "Run API discovery/OpenAPI scanner and review authentication, authorization, rate limits, and sensitive response handling.",
      verificationGuidance:
        "Run Mega Part 38 API Security Scanner against discovered API endpoints.",
      safeClaim: "Can claim API surfaces were discovered and require review.",
      blockedClaim:
        "Cannot claim broken authorization or data exposure without endpoint-specific evidence.",
    });
  }

  if (input.summary.formCount > 0) {
    vulnerabilities.push({
      vulnerabilityKey: "form-input-surface-needs-validation-review",
      title: "Form and input surface needs validation review",
      category: "Input Surface",
      severity: "Medium",
      confidence: "Medium",
      exploitabilityScore: 40,
      businessImpactScore: 65,
      priorityScore: 64,
      affectedAssets: input.items
        .filter((item) => item.itemType === "form")
        .map((item) => item.url)
        .slice(0, 25),
      standards: {
        owaspWstg: ["WSTG-INPV-01", "WSTG-INPV-02"],
        owaspAsvs: ["V5.1", "V5.2"],
        owaspApiTop10: [],
        nistSsdf: ["PW.8", "RV.1"],
      },
      businessImpact:
        "Forms and inputs are common entry points for validation, injection, and business logic issues.",
      developerFix:
        "Review server-side validation, CSRF protection, file upload handling, and sensitive form behavior.",
      verificationGuidance:
        "Use future safe input mapper; do not submit forms without explicit authorized test scope.",
      safeClaim: "Can claim form/input surfaces were inventoried safely.",
      blockedClaim:
        "Cannot claim injection or CSRF vulnerability without safe validation evidence.",
    });
  }

  if (input.summary.riskSignalCount > 0) {
    vulnerabilities.push({
      vulnerabilityKey: "high-interest-routes-need-manual-review",
      title: "High-interest routes need manual review",
      category: "Attack Surface Risk",
      severity: "Low",
      confidence: "Medium",
      exploitabilityScore: 25,
      businessImpactScore: 55,
      priorityScore: 52,
      affectedAssets: input.items
        .filter((item) => item.riskSignal)
        .map((item) => item.url)
        .slice(0, 25),
      standards: {
        owaspWstg: ["WSTG-INFO-05"],
        owaspAsvs: ["V1.2"],
        owaspApiTop10: [],
        nistSsdf: ["RV.1"],
      },
      businessImpact:
        "Admin, login, debug, API documentation, backup-like, or parameterized routes may require focused review.",
      developerFix:
        "Confirm these routes are intentional and protected by authentication, authorization, and safe configuration.",
      verificationGuidance:
        "Review each high-interest route and run deeper modules only inside verified scope.",
      safeClaim: "Can claim high-interest routes were identified for review.",
      blockedClaim:
        "Cannot claim these routes are exploitable from route names alone.",
    });
  }

  return { evidence, vulnerabilities };
}

export async function runAdvancedCrawlerEngine(input: {
  targetUrl: string;
  intensity?: EngineIntensity;
  verifiedScope?: boolean;
}): Promise<AdvancedCrawlerReport> {
  const intensity = input.intensity || "standard";
  const verifiedScope = Boolean(input.verifiedScope);
  const target = normalizeTargetUrl(input.targetUrl);

  if (!verifiedScope) {
    return createBlockedReport(
      target,
      intensity,
      verifiedScope,
      "Verified website scope and permission are required for advanced crawling.",
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
  const startedAt = Date.now();
  const queue: URL[] = [target];
  const visited = new Set<string>();
  const queued = new Set<string>([target.toString()]);
  const pages: CrawledPage[] = [];
  const items: AttackSurfaceItem[] = [];
  let blockedCount = 0;

  while (queue.length && visited.size < policy.maxPages) {
    if ((Date.now() - startedAt) / 1000 > policy.maxRuntimeSeconds) break;

    const current = queue.shift()!;
    const currentKey = current.toString();
    if (visited.has(currentKey)) continue;

    if (!isSameOrigin(target, current) || isBlockedPath(current)) {
      blockedCount++;
      items.push({
        itemType: "blocked-route",
        method: "GET",
        url: current.toString(),
        path: current.pathname,
        sourceUrl: target.toString(),
        sensitivity: "medium",
        riskSignal: !isSameOrigin(target, current)
          ? "cross-origin blocked"
          : "mutation/sensitive path blocked",
        evidenceMetadata: { sameOrigin: isSameOrigin(target, current) },
      });
      continue;
    }

    visited.add(currentKey);
    const fetched = await fetchPage(current, policy.maxBodyReadBytes);
    const body = fetched.body || "";
    const title = extractTitle(body);
    const signals = riskSignalsForUrl(current, title);

    items.push({
      itemType: isApiPath(current.pathname) ? "api-endpoint" : "route",
      method: "GET",
      url: current.toString(),
      path: current.pathname,
      statusCode: fetched.statusCode,
      contentType: fetched.contentType,
      title: title || undefined,
      riskSignal: signals.join(", ") || undefined,
      sensitivity: sensitivityFromSignals(signals),
      evidenceMetadata: {
        queryParameters: queryParams(current),
        bodyStored: false,
        bodyParsedInMemoryOnly: true,
        redirectLocationObserved: fetched.location || null,
      },
    });

    for (const param of queryParams(current)) {
      items.push({
        itemType: "parameter",
        method: "GET",
        url: current.toString(),
        path: current.pathname,
        sourceUrl: current.toString(),
        sensitivity: "medium",
        riskSignal: "url parameter surface",
        evidenceMetadata: { parameterName: param },
      });
    }

    const links = extractLinks(current, body).slice(0, policy.maxLinksPerPage);
    const scripts = extractScriptSources(current, body);
    const jsRoutes = extractJsRoutes(current, body).slice(
      0,
      policy.maxLinksPerPage,
    );
    const forms = extractForms(current, body);

    for (const script of scripts) {
      items.push({
        itemType: "script",
        method: "GET",
        url: script.toString(),
        path: script.pathname,
        sourceUrl: current.toString(),
        sensitivity: isSameOrigin(target, script) ? "low" : "medium",
        riskSignal: isSameOrigin(target, script)
          ? undefined
          : "third-party script surface",
        evidenceMetadata: { sameOrigin: isSameOrigin(target, script) },
      });
    }

    for (const route of jsRoutes) {
      if (!isSameOrigin(target, route)) continue;

      items.push({
        itemType: isApiPath(route.pathname)
          ? "api-endpoint"
          : "javascript-route",
        method: "GET",
        url: route.toString(),
        path: route.pathname,
        sourceUrl: current.toString(),
        sensitivity: sensitivityFromSignals(riskSignalsForUrl(route)),
        riskSignal:
          riskSignalsForUrl(route).join(", ") || "javascript-discovered route",
        evidenceMetadata: {
          discoveredFrom: "html/javascript text",
          queuedForCrawl: false,
        },
      });

      if (
        !queued.has(route.toString()) &&
        !visited.has(route.toString()) &&
        !isBlockedPath(route)
      ) {
        queued.add(route.toString());
        queue.push(route);
      }
    }

    for (const form of forms) {
      const formSignals = riskSignalsForUrl(form.actionUrl);
      items.push({
        itemType: "form",
        method: form.method,
        url: form.actionUrl.toString(),
        path: form.actionUrl.pathname,
        sourceUrl: current.toString(),
        sensitivity: sensitivityFromSignals(formSignals, form),
        riskSignal:
          formSignals.join(", ") ||
          (form.method !== "GET"
            ? "non-GET form observed but not submitted"
            : undefined),
        evidenceMetadata: {
          inputNames: form.inputNames,
          inputTypes: form.inputTypes,
          hasPassword: form.hasPassword,
          hasFile: form.hasFile,
          submitted: false,
        },
      });

      for (const name of form.inputNames) {
        items.push({
          itemType: "input",
          method: form.method,
          url: form.actionUrl.toString(),
          path: form.actionUrl.pathname,
          sourceUrl: current.toString(),
          sensitivity: form.hasPassword || form.hasFile ? "high" : "medium",
          riskSignal: "form input surface",
          evidenceMetadata: { inputName: name, submitted: false },
        });
      }
    }

    pages.push({
      url: current.toString(),
      path: current.pathname,
      statusCode: fetched.statusCode,
      contentType: fetched.contentType,
      title,
      linksFound: links.length,
      scriptsFound: scripts.length,
      formsFound: forms.length,
      parametersFound: queryParams(current).length,
      jsRoutesFound: jsRoutes.length,
      riskSignals: signals,
    });

    for (const link of links) {
      if (!isSameOrigin(target, link)) {
        items.push({
          itemType: "link",
          method: "GET",
          url: link.toString(),
          path: link.pathname,
          sourceUrl: current.toString(),
          sensitivity: "low",
          riskSignal: "external link not crawled",
          evidenceMetadata: { sameOrigin: false },
        });
        continue;
      }

      if (isBlockedPath(link)) {
        blockedCount++;
        items.push({
          itemType: "blocked-route",
          method: "GET",
          url: link.toString(),
          path: link.pathname,
          sourceUrl: current.toString(),
          sensitivity: "medium",
          riskSignal: "mutation/sensitive path blocked",
          evidenceMetadata: { reason: "blocked path keyword" },
        });
        continue;
      }

      if (!queued.has(link.toString()) && !visited.has(link.toString())) {
        queued.add(link.toString());
        queue.push(link);
      }
    }
  }

  const dedupedItems = dedupeItems(items);
  const summary = {
    routeCount: dedupedItems.filter((item) => item.itemType === "route").length,
    apiEndpointCount: dedupedItems.filter(
      (item) => item.itemType === "api-endpoint",
    ).length,
    formCount: dedupedItems.filter((item) => item.itemType === "form").length,
    inputCount: dedupedItems.filter((item) => item.itemType === "input").length,
    scriptCount: dedupedItems.filter((item) => item.itemType === "script")
      .length,
    parameterCount: dedupedItems.filter((item) => item.itemType === "parameter")
      .length,
    jsRouteCount: dedupedItems.filter(
      (item) => item.itemType === "javascript-route",
    ).length,
    blockedCount,
    riskSignalCount: dedupedItems.filter((item) => item.riskSignal).length,
    customerSummary:
      "Advanced crawler discovered same-origin routes, API signals, forms, inputs, parameters, scripts, and JavaScript routes with safe metadata-only evidence.",
  };

  const seeds = buildEvidenceAndVulnerabilities({
    targetUrl: target.toString(),
    summary,
    pages,
    items: dedupedItems,
  });

  return {
    version: "37.0",
    generatedAt: new Date().toISOString(),
    targetUrl: target.toString(),
    hostname: target.hostname,
    intensity,
    verifiedScope,
    privateTargetBlocked: false,
    crawlerStatus: "completed",
    crawlerPolicy: policy,
    pages,
    items: dedupedItems,
    normalizedEvidenceSeeds: seeds.evidence,
    vulnerabilitySeeds: seeds.vulnerabilities,
    summary,
    safetyBoundary: SAFETY_BOUNDARY,
  };
}
