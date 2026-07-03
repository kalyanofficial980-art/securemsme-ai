export type EngineEvidenceSeed = {
  evidenceKey: string;
  sourceModule: string;
  affectedAsset: string;
  assetType: string;
  proofType: string;
  severity: string;
  confidence: string;
  falsePositiveRisk: string;
  title: string;
  observedValue: string;
  expectedValue: string;
  evidenceSummary: string;
  businessImpact: string;
  developerFix: string;
  safeClaim: string;
  blockedClaim: string;
  standards: Record<string, string[]>;
  rawMetadata: Record<string, unknown>;
};

export type VulnerabilitySeed = {
  vulnerabilityKey: string;
  title: string;
  category: string;
  severity: string;
  confidence: string;
  exploitabilityScore: number;
  businessImpactScore: number;
  priorityScore: number;
  affectedAssets: string[];
  standards: Record<string, string[]>;
  businessImpact: string;
  developerFix: string;
  verificationGuidance: string;
  safeClaim: string;
  blockedClaim: string;
};
export type EngineIntensity = "light" | "standard" | "deep";

export type SiteType =
  "static" | "cms" | "spa" | "api" | "ecommerce" | "unknown";

export type WebsiteClassification = {
  siteType: SiteType;
  confidence: "High" | "Medium" | "Low";
  detectedSignals: string[];
  technologyHints: string[];
  coverageNeeds: string[];
};

export type InternationalModule = {
  moduleId: string;
  moduleName: string;
  category: string;
  stage: "discovery" | "analysis" | "validation" | "lifecycle" | "monitoring";
  requiredScope: "public-safe" | "verified-scope" | "authenticated-scope";
  supportedSiteTypes: SiteType[];
  safeMethods: string[];
  rateLimit: { requestsPerMinute: number; maxRuntimeSeconds: number };
  timeoutSeconds: number;
  dependencies: string[];
  outputSchema: Record<string, unknown>;
  standards: {
    owaspWstg: string[];
    owaspAsvs: string[];
    owaspApiTop10: string[];
    nistSsdf: string[];
  };
  canClaim: string;
  cannotClaim: string;
};

export const INTERNATIONAL_ENGINE_BLOCKED_ACTIONS = [
  "No unauthorized scanning",
  "No brute force",
  "No password guessing",
  "No login bypass",
  "No MFA bypass",
  "No data extraction",
  "No payment/order mutation",
  "No destructive exploit execution",
  "No denial-of-service testing",
  "No malware payloads",
  "No testing outside verified scope",
  "No private data storage",
];

export const INTERNATIONAL_MODULE_REGISTRY: InternationalModule[] = [
  {
    moduleId: "universal-scope-classifier",
    moduleName: "Universal Scope & Application Classifier",
    category: "Orchestration",
    stage: "discovery",
    requiredScope: "public-safe",
    supportedSiteTypes: ["static", "cms", "spa", "api", "ecommerce", "unknown"],
    safeMethods: ["GET", "HEAD"],
    rateLimit: { requestsPerMinute: 30, maxRuntimeSeconds: 60 },
    timeoutSeconds: 20,
    dependencies: [],
    outputSchema: { classification: "WebsiteClassification" },
    standards: {
      owaspWstg: ["WSTG-INFO-01", "WSTG-INFO-02"],
      owaspAsvs: ["V1.1", "V14.2"],
      owaspApiTop10: [],
      nistSsdf: ["PW.8", "RV.1"],
    },
    canClaim: "Can classify public application signals and recommend coverage.",
    cannotClaim:
      "Cannot guarantee complete technology inventory without authenticated access and manual verification.",
  },
  {
    moduleId: "advanced-crawler-foundation",
    moduleName: "Advanced Crawler Foundation",
    category: "Attack Surface Discovery",
    stage: "discovery",
    requiredScope: "verified-scope",
    supportedSiteTypes: ["static", "cms", "spa", "api", "ecommerce", "unknown"],
    safeMethods: ["GET", "HEAD"],
    rateLimit: { requestsPerMinute: 60, maxRuntimeSeconds: 180 },
    timeoutSeconds: 30,
    dependencies: ["universal-scope-classifier"],
    outputSchema: { routes: "RouteInventory", assets: "AssetInventory" },
    standards: {
      owaspWstg: ["WSTG-INFO-05", "WSTG-CONF-04"],
      owaspAsvs: ["V1.2", "V14.4"],
      owaspApiTop10: [],
      nistSsdf: ["PW.8", "RV.1"],
    },
    canClaim:
      "Can map safe public routes and attack surface metadata within verified scope.",
    cannotClaim:
      "Cannot submit forms, mutate data, or guarantee discovery of every hidden route.",
  },
  {
    moduleId: "browser-security-analyzer-v2",
    moduleName: "Advanced Browser Security Analyzer",
    category: "Browser Security",
    stage: "analysis",
    requiredScope: "public-safe",
    supportedSiteTypes: ["static", "cms", "spa", "api", "ecommerce", "unknown"],
    safeMethods: ["GET", "HEAD"],
    rateLimit: { requestsPerMinute: 40, maxRuntimeSeconds: 90 },
    timeoutSeconds: 20,
    dependencies: [],
    outputSchema: {
      headers: "HeaderEvidence",
      csp: "CspEvidence",
      cors: "CorsEvidence",
    },
    standards: {
      owaspWstg: ["WSTG-CONF-07", "WSTG-CLNT-12"],
      owaspAsvs: ["V14.4", "V14.5"],
      owaspApiTop10: [],
      nistSsdf: ["PW.8", "RV.1"],
    },
    canClaim:
      "Can review browser-facing controls such as CSP, clickjacking, HSTS and CORS signals.",
    cannotClaim:
      "Cannot prove browser exploitability without safe validation and context review.",
  },
  {
    moduleId: "tls-dns-deep-analyzer",
    moduleName: "TLS, DNS & Email Security Analyzer",
    category: "Infrastructure Security",
    stage: "analysis",
    requiredScope: "public-safe",
    supportedSiteTypes: ["static", "cms", "spa", "api", "ecommerce", "unknown"],
    safeMethods: ["DNS", "TLS"],
    rateLimit: { requestsPerMinute: 20, maxRuntimeSeconds: 120 },
    timeoutSeconds: 30,
    dependencies: [],
    outputSchema: {
      tls: "TlsEvidence",
      dns: "DnsEvidence",
      email: "EmailSecurityEvidence",
    },
    standards: {
      owaspWstg: ["WSTG-CRYP-01", "WSTG-CONF-02"],
      owaspAsvs: ["V9.1", "V14.4"],
      owaspApiTop10: [],
      nistSsdf: ["PW.8", "RV.1"],
    },
    canClaim: "Can review public TLS, DNS and email-security posture signals.",
    cannotClaim:
      "Cannot certify full infrastructure security or internal DNS configuration.",
  },
  {
    moduleId: "api-discovery-foundation",
    moduleName: "API Discovery & OpenAPI Foundation",
    category: "API Security",
    stage: "discovery",
    requiredScope: "verified-scope",
    supportedSiteTypes: ["api", "spa", "ecommerce", "cms", "unknown"],
    safeMethods: ["GET", "HEAD"],
    rateLimit: { requestsPerMinute: 40, maxRuntimeSeconds: 120 },
    timeoutSeconds: 25,
    dependencies: ["advanced-crawler-foundation"],
    outputSchema: {
      openapi: "OpenApiSignals",
      endpoints: "ApiEndpointInventory",
    },
    standards: {
      owaspWstg: ["WSTG-INFO-10", "WSTG-CONF-06"],
      owaspAsvs: ["V13.1", "V13.2"],
      owaspApiTop10: ["API1", "API2", "API3", "API5", "API8"],
      nistSsdf: ["PW.8", "RV.1", "RV.2"],
    },
    canClaim:
      "Can discover public API documentation and endpoint exposure signals.",
    cannotClaim:
      "Cannot test authorization bypass, sensitive data exposure, or API mutations without approved authenticated scope.",
  },
  {
    moduleId: "cms-ecommerce-intelligence",
    moduleName: "CMS & Ecommerce Security Intelligence",
    category: "CMS/Ecommerce",
    stage: "analysis",
    requiredScope: "verified-scope",
    supportedSiteTypes: ["cms", "ecommerce", "unknown"],
    safeMethods: ["GET", "HEAD"],
    rateLimit: { requestsPerMinute: 35, maxRuntimeSeconds: 120 },
    timeoutSeconds: 25,
    dependencies: ["universal-scope-classifier"],
    outputSchema: { cms: "CmsSignals", ecommerce: "EcommerceSignals" },
    standards: {
      owaspWstg: ["WSTG-INFO-02", "WSTG-CONF-05"],
      owaspAsvs: ["V14.2", "V14.4"],
      owaspApiTop10: [],
      nistSsdf: ["PW.8", "RV.1"],
    },
    canClaim:
      "Can review CMS/ecommerce public risk signals and hardening gaps.",
    cannotClaim:
      "Cannot claim plugin exploitation, checkout bypass, or payment compromise.",
  },
  {
    moduleId: "authenticated-surface-foundation",
    moduleName: "Authenticated Surface Foundation",
    category: "Authenticated Security",
    stage: "validation",
    requiredScope: "authenticated-scope",
    supportedSiteTypes: ["cms", "spa", "api", "ecommerce", "unknown"],
    safeMethods: ["GET", "HEAD"],
    rateLimit: { requestsPerMinute: 30, maxRuntimeSeconds: 180 },
    timeoutSeconds: 30,
    dependencies: ["advanced-crawler-foundation"],
    outputSchema: {
      authenticatedRoutes: "AuthenticatedRoutePlan",
      privacyPolicy: "EvidenceProtectionPolicy",
    },
    standards: {
      owaspWstg: ["WSTG-ATHZ-01", "WSTG-ATHN-01", "WSTG-SESS-01"],
      owaspAsvs: ["V2.1", "V3.1", "V4.1"],
      owaspApiTop10: ["API1", "API2", "API5"],
      nistSsdf: ["PW.8", "RV.1", "RV.2"],
    },
    canClaim:
      "Can prepare authenticated-scope route and evidence policies after customer authorization.",
    cannotClaim:
      "Cannot attempt login, bypass controls, mutate data, or store private data in this foundation stage.",
  },
  {
    moduleId: "vulnerability-lifecycle-engine",
    moduleName: "Vulnerability Lifecycle Engine",
    category: "Risk Management",
    stage: "lifecycle",
    requiredScope: "public-safe",
    supportedSiteTypes: ["static", "cms", "spa", "api", "ecommerce", "unknown"],
    safeMethods: ["INTERNAL"],
    rateLimit: { requestsPerMinute: 0, maxRuntimeSeconds: 60 },
    timeoutSeconds: 15,
    dependencies: [],
    outputSchema: { vulnerabilityInstances: "VulnerabilityLifecycleItems" },
    standards: {
      owaspWstg: [],
      owaspAsvs: ["V1.1"],
      owaspApiTop10: [],
      nistSsdf: ["RV.1", "RV.2", "RV.3"],
    },
    canClaim:
      "Can track findings through detected, triaged, fixing, retest and fixed states.",
    cannotClaim: "Cannot prove remediation without retest evidence.",
  },
];

function normalizeUrl(input: string) {
  const withProtocol = /^https?:\/\//i.test(input.trim())
    ? input.trim()
    : `https://${input.trim()}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Only HTTP and HTTPS targets are allowed.");
  return url.toString();
}

function reportText(report?: Record<string, unknown> | null) {
  return JSON.stringify(report || {}).toLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function classifyWebsite(input: {
  targetUrl: string;
  report?: Record<string, unknown> | null;
  hints?: string[];
}): WebsiteClassification {
  const text =
    `${input.targetUrl} ${reportText(input.report)} ${(input.hints || []).join(" ")}`.toLowerCase();
  const detectedSignals: string[] = [];
  const technologyHints: string[] = [];
  const coverageNeeds: string[] = [];

  if (
    text.includes("wordpress") ||
    text.includes("wp-content") ||
    text.includes("wp-json")
  ) {
    detectedSignals.push("WordPress/CMS signal");
    technologyHints.push("WordPress");
  }
  if (
    text.includes("woocommerce") ||
    text.includes("checkout") ||
    text.includes("cart")
  ) {
    detectedSignals.push("Ecommerce/WooCommerce signal");
    technologyHints.push("WooCommerce");
  }
  if (text.includes("shopify")) {
    detectedSignals.push("Shopify ecommerce signal");
    technologyHints.push("Shopify");
  }
  if (
    text.includes("next.js") ||
    text.includes("__next") ||
    text.includes("react") ||
    text.includes("vue") ||
    text.includes("angular")
  ) {
    detectedSignals.push("SPA/JavaScript framework signal");
    technologyHints.push("JavaScript SPA");
  }
  if (
    text.includes("swagger") ||
    text.includes("openapi") ||
    text.includes("graphql") ||
    text.includes("/api")
  ) {
    detectedSignals.push("API surface signal");
    technologyHints.push("API");
  }

  let siteType: SiteType = "unknown";
  if (
    technologyHints.some((hint) => ["WooCommerce", "Shopify"].includes(hint))
  ) {
    siteType = "ecommerce";
    coverageNeeds.push(
      "CMS/ecommerce module",
      "API discovery",
      "authenticated safety planning",
    );
  } else if (technologyHints.includes("WordPress")) {
    siteType = "cms";
    coverageNeeds.push(
      "CMS module",
      "plugin/theme intelligence",
      "login/admin surface review",
    );
  } else if (technologyHints.includes("API")) {
    siteType = "api";
    coverageNeeds.push(
      "API discovery",
      "OpenAPI/GraphQL review",
      "auth boundary review",
    );
  } else if (technologyHints.includes("JavaScript SPA")) {
    siteType = "spa";
    coverageNeeds.push(
      "SPA crawler",
      "JavaScript route discovery",
      "API discovery",
    );
  } else {
    coverageNeeds.push(
      "universal crawler",
      "browser security",
      "TLS/DNS analysis",
    );
  }

  return {
    siteType,
    confidence:
      detectedSignals.length >= 2
        ? "High"
        : detectedSignals.length === 1
          ? "Medium"
          : "Low",
    detectedSignals: detectedSignals.length
      ? detectedSignals
      : ["No strong application-type signal found yet"],
    technologyHints: technologyHints.length
      ? technologyHints
      : ["Unknown / needs discovery"],
    coverageNeeds,
  };
}

function standardsSummary(modules: InternationalModule[]) {
  return {
    owaspWstg: unique(modules.flatMap((module) => module.standards.owaspWstg)),
    owaspAsvs: unique(modules.flatMap((module) => module.standards.owaspAsvs)),
    owaspApiTop10: unique(
      modules.flatMap((module) => module.standards.owaspApiTop10),
    ),
    nistSsdf: unique(modules.flatMap((module) => module.standards.nistSsdf)),
  };
}

function canSelectModule(
  module: InternationalModule,
  verifiedScope: boolean,
  authenticatedScope: boolean,
) {
  if (module.requiredScope === "authenticated-scope" && !authenticatedScope)
    return {
      allowed: false,
      reason: "Authenticated scope is not approved yet.",
    };
  if (module.requiredScope === "verified-scope" && !verifiedScope)
    return {
      allowed: false,
      reason: "Website verification and permission are required.",
    };
  return { allowed: true, reason: "Allowed" };
}

function calculateCoverage(
  selectedModules: InternationalModule[],
  blockedModules: InternationalModule[],
  classification: WebsiteClassification,
) {
  const selectedIds = selectedModules.map((module) => module.moduleId);
  const selectedStandards = standardsSummary(selectedModules);
  const publicCoverage = selectedIds.includes("universal-scope-classifier")
    ? 100
    : 0;
  const verifiedCoverage = selectedIds.includes("advanced-crawler-foundation")
    ? 70
    : 20;
  const authenticatedCoverage = selectedIds.includes(
    "authenticated-surface-foundation",
  )
    ? 60
    : 0;
  const apiCoverage = selectedIds.includes("api-discovery-foundation")
    ? 70
    : classification.siteType === "api"
      ? 25
      : 10;
  const cmsCoverage = selectedIds.includes("cms-ecommerce-intelligence")
    ? 70
    : classification.siteType === "cms" ||
        classification.siteType === "ecommerce"
      ? 25
      : 10;
  const lifecycleCoverage = selectedIds.includes(
    "vulnerability-lifecycle-engine",
  )
    ? 80
    : 0;
  const standardsCoverage = Math.min(
    100,
    selectedStandards.owaspWstg.length * 7 +
      selectedStandards.owaspAsvs.length * 6 +
      selectedStandards.owaspApiTop10.length * 8 +
      selectedStandards.nistSsdf.length * 8,
  );
  const coverageScore = Math.round(
    (selectedModules.length / INTERNATIONAL_MODULE_REGISTRY.length) * 30 +
      publicCoverage * 0.1 +
      verifiedCoverage * 0.15 +
      apiCoverage * 0.1 +
      cmsCoverage * 0.1 +
      lifecycleCoverage * 0.1 +
      standardsCoverage * 0.25,
  );
  return {
    totalModules: INTERNATIONAL_MODULE_REGISTRY.length,
    selectedModules: selectedModules.length,
    blockedModules: blockedModules.length,
    publicCoverage,
    verifiedCoverage,
    authenticatedCoverage,
    apiCoverage,
    cmsCoverage,
    lifecycleCoverage,
    standardsCoverage,
    coverageScore: Math.max(0, Math.min(100, coverageScore)),
  };
}

export function buildInternationalSecurityEnginePlan(input: {
  targetUrl: string;
  intensity?: EngineIntensity;
  verifiedScope?: boolean;
  authenticatedScope?: boolean;
  report?: Record<string, unknown> | null;
  hints?: string[];
}) {
  const targetUrl = normalizeUrl(input.targetUrl);
  const intensity = input.intensity || "standard";
  const verifiedScope = Boolean(input.verifiedScope);
  const authenticatedScope = Boolean(input.authenticatedScope);
  const classification = classifyWebsite({
    targetUrl,
    report: input.report,
    hints: input.hints,
  });

  const selectedModules: InternationalModule[] = [];
  const blockedModules: Array<InternationalModule & { blockedReason: string }> =
    [];

  for (const module of INTERNATIONAL_MODULE_REGISTRY) {
    const supportsSiteType =
      module.supportedSiteTypes.includes(classification.siteType) ||
      module.supportedSiteTypes.includes("unknown");
    if (!supportsSiteType) continue;
    const scope = canSelectModule(module, verifiedScope, authenticatedScope);
    if (!scope.allowed)
      blockedModules.push({ ...module, blockedReason: scope.reason });
    else selectedModules.push(module);
  }

  const coverageMatrix = calculateCoverage(
    selectedModules,
    blockedModules,
    classification,
  );
  const standards = standardsSummary(selectedModules);
  const evidenceSeeds = [
    {
      evidenceKey: "international-engine-coverage-plan",
      sourceModule: "international-security-engine-core",
      affectedAsset: targetUrl,
      assetType: "web-url",
      proofType: "policy",
      severity: "Info",
      confidence: "High",
      falsePositiveRisk: "Low",
      title: "International security engine coverage plan generated",
      observedValue: `${selectedModules.length} modules selected, ${blockedModules.length} modules blocked`,
      expectedValue:
        "Verified-scope module pipeline with clear coverage and safety boundaries",
      evidenceSummary:
        "The engine classified the target, selected eligible modules, blocked unsafe/ineligible modules, and generated a standards-aware coverage plan.",
      businessImpact:
        "Customer can understand what security areas are covered, what is blocked, and what needs future verification.",
      developerFix:
        "Complete verification/authentication prerequisites and run deeper modules as scope becomes available.",
      safeClaim:
        "Can claim an international-style engine plan and coverage matrix were generated.",
      blockedClaim:
        "Cannot claim full vulnerability coverage or completed DAST execution from planning alone.",
      standards,
      rawMetadata: {
        classification,
        selectedModuleIds: selectedModules.map((module) => module.moduleId),
        blockedModuleIds: blockedModules.map((module) => module.moduleId),
      },
    },
  ];

  const vulnerabilitySeeds =
    coverageMatrix.coverageScore < 60
      ? [
          {
            vulnerabilityKey: "coverage-gap-needs-deeper-scope",
            title: "Security coverage gap needs deeper scope",
            category: "Coverage Gap",
            severity: "Medium",
            confidence: "High",
            exploitabilityScore: 25,
            businessImpactScore: 65,
            priorityScore: 60,
            affectedAssets: [targetUrl],
            standards: {
              owaspWstg: ["WSTG-INFO-01"],
              owaspAsvs: ["V1.1"],
              owaspApiTop10: [],
              nistSsdf: ["RV.1"],
            },
            businessImpact:
              "Important areas may remain untested until verified/authenticated scope and deeper engines are enabled.",
            developerFix:
              "Enable verified scan scope, add API/authenticated scan permissions, and run deeper engine modules.",
            verificationGuidance:
              "Generate a new engine job after verification/authentication prerequisites are completed.",
            safeClaim: "Can claim a coverage gap was identified.",
            blockedClaim:
              "Cannot claim the uncovered areas are vulnerable without evidence.",
          },
        ]
      : [];

  return {
    version: "36.0",
    generatedAt: new Date().toISOString(),
    targetUrl,
    intensity,
    verifiedScope,
    classification,
    selectedModules,
    blockedModules,
    coverageMatrix,
    standardsSummary: standards,
    safetyPolicy: {
      allowedMethods: ["GET", "HEAD", "DNS", "TLS", "INTERNAL"],
      blockedActions: INTERNATIONAL_ENGINE_BLOCKED_ACTIONS,
      privateDataPolicy:
        "Do not store private page bodies, credentials, session cookies, or customer data.",
      destructiveTestingPolicy:
        "No destructive exploit execution, DoS, payment/order mutation, or data-changing requests.",
      authorizationPolicy:
        "Advanced modules require verified scope and authenticated modules require explicit test-account approval.",
    },
    executionContext: {
      workerReady: true,
      queueReady: true,
      retryReady: true,
      currentMode: "planned-orchestration",
      nextRequiredLayer:
        "Background worker execution and advanced crawler modules",
    },
    normalizedEvidenceSeeds: evidenceSeeds,
    vulnerabilitySeeds,
    riskSummary: {
      evidenceCount: evidenceSeeds.length,
      vulnerabilityCount: vulnerabilitySeeds.length,
      highPriorityCount: 0,
      engineMaturity: "advanced-foundation",
      customerSummary:
        "International security engine core generated a standards-aware scan job, module plan, coverage matrix, normalized evidence, and vulnerability lifecycle seeds.",
    },
  };
}

export function buildJobModuleRows(input: {
  jobId: string;
  userId: string;
  websiteId?: string | null;
  modules: InternationalModule[];
}) {
  return input.modules.map((module) => ({
    job_id: input.jobId,
    user_id: input.userId,
    website_id: input.websiteId || null,
    module_id: module.moduleId,
    module_name: module.moduleName,
    category: module.category,
    stage: module.stage,
    status: "planned",
    required_scope: module.requiredScope,
    safe_methods: module.safeMethods,
    rate_limit: module.rateLimit,
    timeout_seconds: module.timeoutSeconds,
    dependencies: module.dependencies,
    output_schema: module.outputSchema,
    owasp_wstg: module.standards.owaspWstg,
    owasp_asvs: module.standards.owaspAsvs,
    owasp_api_top10: module.standards.owaspApiTop10,
    nist_ssdf: module.standards.nistSsdf,
    can_claim: module.canClaim,
    cannot_claim: module.cannotClaim,
    module_summary: {
      stage: module.stage,
      category: module.category,
      workerReady: true,
    },
  }));
}
