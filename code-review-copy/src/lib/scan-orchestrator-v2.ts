export type OrchestratorScanMode =
  "safe-light" | "safe-standard" | "safe-deep" | "authenticated-safe";

export type EngineStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed-with-warnings"
  | "blocked"
  | "failed"
  | "skipped";

export type EngineDefinition = {
  engineKey: string;
  engineName: string;
  engineGroup: string;
  engineType:
    | "safe-observation"
    | "crawler"
    | "browser-security"
    | "api-security"
    | "cms-ecommerce"
    | "auth-safe-review"
    | "accuracy"
    | "reporting"
    | "monitoring";
  description: string;
  defaultEnabled: boolean;
  requiresVerifiedScope: boolean;
  requiresAuthenticatedContext: boolean;
  safeMethods: string[];
  timeoutSeconds: number;
  maxRetries: number;
  weight: number;
};

export type EnginePlanItem = EngineDefinition & {
  runOrder: number;
  plannedStatus: EngineStatus;
  skipReason?: string;
};

export type EngineRunInput = {
  engineKey: string;
  engineName: string;
  engineGroup: string;
  engineType: string;
  runStatus?: EngineStatus;
  coverageWeight: number;
  observationsCount?: number;
  findingsCreatedCount?: number;
  potentialFindingsCount?: number;
  confirmedFindingsCount?: number;
};

export const blockedPipelineActions = [
  "No unauthorized testing",
  "No exploit payload execution",
  "No brute force",
  "No password guessing",
  "No login bypass",
  "No destructive testing",
  "No form mutation",
  "No payment/order mutation",
  "No private data extraction",
  "No denial-of-service testing",
];

export const engineDefinitions: EngineDefinition[] = [
  {
    engineKey: "scope-authorization",
    engineName: "Scope Authorization Gate",
    engineGroup: "governance",
    engineType: "safe-observation",
    description:
      "Checks permission, target URL, scope and safe testing boundary.",
    defaultEnabled: true,
    requiresVerifiedScope: false,
    requiresAuthenticatedContext: false,
    safeMethods: ["READ"],
    timeoutSeconds: 10,
    maxRetries: 0,
    weight: 8,
  },
  {
    engineKey: "passive-recon",
    engineName: "Passive Recon Engine",
    engineGroup: "discovery",
    engineType: "safe-observation",
    description: "Collects safe public observations and basic target metadata.",
    defaultEnabled: true,
    requiresVerifiedScope: false,
    requiresAuthenticatedContext: false,
    safeMethods: ["GET", "HEAD"],
    timeoutSeconds: 20,
    maxRetries: 1,
    weight: 8,
  },
  {
    engineKey: "crawler-discovery",
    engineName: "Crawler Discovery Engine",
    engineGroup: "discovery",
    engineType: "crawler",
    description:
      "Discovers public pages, links, forms, login and checkout signals.",
    defaultEnabled: true,
    requiresVerifiedScope: false,
    requiresAuthenticatedContext: false,
    safeMethods: ["GET"],
    timeoutSeconds: 45,
    maxRetries: 1,
    weight: 12,
  },
  {
    engineKey: "browser-security",
    engineName: "Browser Security Engine",
    engineGroup: "browser",
    engineType: "browser-security",
    description:
      "Reviews CSP, HSTS, clickjacking, CORS, cookies and browser controls.",
    defaultEnabled: true,
    requiresVerifiedScope: false,
    requiresAuthenticatedContext: false,
    safeMethods: ["GET", "HEAD"],
    timeoutSeconds: 30,
    maxRetries: 1,
    weight: 12,
  },
  {
    engineKey: "vulnerability-bug-finder",
    engineName: "Vulnerability Scanner + Bug Finder",
    engineGroup: "vulnerability",
    engineType: "safe-observation",
    description:
      "Creates evidence-based bug/risk findings with fixes and retest steps.",
    defaultEnabled: true,
    requiresVerifiedScope: false,
    requiresAuthenticatedContext: false,
    safeMethods: ["GET", "HEAD"],
    timeoutSeconds: 60,
    maxRetries: 1,
    weight: 18,
  },
  {
    engineKey: "api-security-discovery",
    engineName: "API Security Discovery Engine",
    engineGroup: "api",
    engineType: "api-security",
    description:
      "Finds API docs, OpenAPI, Swagger, GraphQL and endpoint exposure signals.",
    defaultEnabled: true,
    requiresVerifiedScope: false,
    requiresAuthenticatedContext: false,
    safeMethods: ["GET", "HEAD"],
    timeoutSeconds: 45,
    maxRetries: 1,
    weight: 12,
  },
  {
    engineKey: "cms-ecommerce-risk",
    engineName: "CMS + Ecommerce Risk Engine",
    engineGroup: "cms-ecommerce",
    engineType: "cms-ecommerce",
    description:
      "Reviews CMS, WordPress, WooCommerce, checkout and customer account signals.",
    defaultEnabled: true,
    requiresVerifiedScope: false,
    requiresAuthenticatedContext: false,
    safeMethods: ["GET", "HEAD"],
    timeoutSeconds: 45,
    maxRetries: 1,
    weight: 10,
  },
  {
    engineKey: "customer-data-risk",
    engineName: "Customer Data Risk Engine",
    engineGroup: "data-protection",
    engineType: "safe-observation",
    description:
      "Reviews forms, privacy pages and customer-data collection signals.",
    defaultEnabled: true,
    requiresVerifiedScope: false,
    requiresAuthenticatedContext: false,
    safeMethods: ["GET"],
    timeoutSeconds: 30,
    maxRetries: 1,
    weight: 10,
  },
  {
    engineKey: "authenticated-safe-review",
    engineName: "Authenticated Safe Review Engine",
    engineGroup: "authenticated",
    engineType: "auth-safe-review",
    description:
      "Reviews login-protected pages only after authenticated scope approval.",
    defaultEnabled: false,
    requiresVerifiedScope: true,
    requiresAuthenticatedContext: true,
    safeMethods: ["GET"],
    timeoutSeconds: 60,
    maxRetries: 1,
    weight: 10,
  },
  {
    engineKey: "accuracy-foundation",
    engineName: "Accuracy Foundation Engine",
    engineGroup: "accuracy",
    engineType: "accuracy",
    description:
      "Scores confidence, false-positive risk and expert review requirement.",
    defaultEnabled: true,
    requiresVerifiedScope: false,
    requiresAuthenticatedContext: false,
    safeMethods: ["READ"],
    timeoutSeconds: 20,
    maxRetries: 1,
    weight: 12,
  },
  {
    engineKey: "report-builder",
    engineName: "Report Builder Engine",
    engineGroup: "reporting",
    engineType: "reporting",
    description:
      "Builds client-safe report, developer fixes and blocked claims.",
    defaultEnabled: true,
    requiresVerifiedScope: false,
    requiresAuthenticatedContext: false,
    safeMethods: ["READ"],
    timeoutSeconds: 20,
    maxRetries: 1,
    weight: 8,
  },
  {
    engineKey: "monitoring-setup",
    engineName: "Monitoring Setup Engine",
    engineGroup: "monitoring",
    engineType: "monitoring",
    description:
      "Prepares ongoing monitoring signals and future alert workflow.",
    defaultEnabled: true,
    requiresVerifiedScope: false,
    requiresAuthenticatedContext: false,
    safeMethods: ["READ"],
    timeoutSeconds: 20,
    maxRetries: 1,
    weight: 8,
  },
];

export function normalizeScanMode(value?: string | null): OrchestratorScanMode {
  if (
    value === "safe-light" ||
    value === "safe-standard" ||
    value === "safe-deep" ||
    value === "authenticated-safe"
  ) {
    return value;
  }

  return "safe-standard";
}

export function buildEnginePlan(input: {
  mode: OrchestratorScanMode;
  verifiedScope?: boolean;
  authenticatedContextApproved?: boolean;
}) {
  const plan: EnginePlanItem[] = [];
  let order = 1;

  for (const engine of engineDefinitions) {
    if (
      input.mode === "safe-light" &&
      ![
        "scope-authorization",
        "passive-recon",
        "browser-security",
        "report-builder",
      ].includes(engine.engineKey)
    ) {
      continue;
    }

    if (
      input.mode === "safe-standard" &&
      engine.engineKey === "authenticated-safe-review"
    ) {
      continue;
    }

    if (!engine.defaultEnabled && input.mode !== "authenticated-safe") {
      continue;
    }

    let plannedStatus: EngineStatus = "queued";
    let skipReason = "";

    if (engine.requiresVerifiedScope && !input.verifiedScope) {
      plannedStatus = "skipped";
      skipReason = "Verified scope required.";
    }

    if (
      engine.requiresAuthenticatedContext &&
      !input.authenticatedContextApproved
    ) {
      plannedStatus = "skipped";
      skipReason = "Authenticated context approval required.";
    }

    plan.push({
      ...engine,
      runOrder: order,
      plannedStatus,
      skipReason,
    });

    order += 1;
  }

  return plan;
}

export function calculatePipelineCoverage(runs: EngineRunInput[]) {
  const total = runs.length;
  const completed = runs.filter(
    (run) =>
      run.runStatus === "completed" ||
      run.runStatus === "completed-with-warnings",
  ).length;
  const failed = runs.filter((run) => run.runStatus === "failed").length;
  const blocked = runs.filter((run) => run.runStatus === "blocked").length;
  const skipped = runs.filter((run) => run.runStatus === "skipped").length;

  const totalWeight = runs.reduce((sum, run) => sum + run.coverageWeight, 0);
  const completedWeight = runs
    .filter(
      (run) =>
        run.runStatus === "completed" ||
        run.runStatus === "completed-with-warnings",
    )
    .reduce((sum, run) => sum + run.coverageWeight, 0);

  return {
    total,
    completed,
    failed,
    blocked,
    skipped,
    coveragePercent: total ? Math.round((completed / total) * 100) : 0,
    weightedCoveragePercent: totalWeight
      ? Math.round((completedWeight / totalWeight) * 100)
      : 0,
  };
}

export function deriveJobStatus(runs: EngineRunInput[]) {
  const coverage = calculatePipelineCoverage(runs);
  if (!coverage.total) return "queued";
  if (coverage.blocked === coverage.total) return "blocked";
  if (
    coverage.completed + coverage.failed + coverage.blocked + coverage.skipped <
    coverage.total
  )
    return "running";
  if (coverage.failed || coverage.blocked) return "completed-with-warnings";
  return "completed";
}

export function simulateSafeEngineResult(
  engine: EngineDefinition | EnginePlanItem,
  targetUrl: string,
) {
  const baseObservations: Record<string, number> = {
    "scope-authorization": 1,
    "passive-recon": 6,
    "crawler-discovery": 12,
    "browser-security": 8,
    "vulnerability-bug-finder": 10,
    "api-security-discovery": 7,
    "cms-ecommerce-risk": 6,
    "customer-data-risk": 5,
    "authenticated-safe-review": 8,
    "accuracy-foundation": 4,
    "report-builder": 3,
    "monitoring-setup": 3,
  };

  const observationsCount = baseObservations[engine.engineKey] || 3;
  const potentialFindingsCount = [
    "vulnerability-bug-finder",
    "browser-security",
    "api-security-discovery",
    "customer-data-risk",
  ].includes(engine.engineKey)
    ? Math.max(1, Math.floor(observationsCount / 4))
    : 0;

  return {
    status: "completed" as EngineStatus,
    observationsCount,
    findingsCreatedCount: potentialFindingsCount,
    potentialFindingsCount,
    confirmedFindingsCount: 0,
    safeSummary: `${engine.engineName} completed safe review for ${targetUrl}.`,
    evidenceSummary: `${observationsCount} safe observation(s) recorded. ${potentialFindingsCount} potential finding signal(s) prepared for accuracy review.`,
    engineResult: {
      targetUrl,
      engineKey: engine.engineKey,
      safeMethods: engine.safeMethods,
      blockedActions: blockedPipelineActions,
      observationsCount,
      potentialFindingsCount,
      note: "This pipeline record is orchestration metadata. Detailed findings are handled by dedicated scanner and accuracy engines.",
    },
  };
}

export function orchestratorSafeSummary(input: {
  mode: OrchestratorScanMode;
  totalEngines: number;
  targetUrl: string;
}) {
  return `Pipeline planned ${input.totalEngines} engine(s) in ${input.mode} mode for ${input.targetUrl}. Engines use safe authorized methods and blocked-action controls.`;
}
