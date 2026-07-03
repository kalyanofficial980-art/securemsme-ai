export type BenchmarkStatus = "pass" | "fail" | "warning" | "manual-review";
export type LaunchCheckStatus =
  "pending" | "pass" | "warning" | "fail" | "blocked" | "not-applicable";
export type LaunchSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";

export type BenchmarkSourceCounts = {
  scans: number;
  reports: number;
  evidenceItems: number;
  proofChains: number;
  accuracyAssessments: number;
  developerTasks: number;
  retestRuns: number;
  monitoringAlerts: number;
  aiTriageRuns: number;
};

export type BenchmarkCaseDraft = {
  caseKey: string;
  caseTitle: string;
  caseCategory:
    | "quality-control"
    | "evidence"
    | "false-positive-control"
    | "claim-safety"
    | "client-report"
    | "developer-workflow"
    | "monitoring"
    | "billing";
  caseStatus: BenchmarkStatus;
  severity: LaunchSeverity;
  expectedResult: string;
  actualResult: string;
  evidenceSummary: string;
  remediationAction: string;
  clientSafeNote: string;
  blockedClaim: string;
  caseScore: number;
  casePayload: Record<string, unknown>;
};

export type BenchmarkRunDraft = {
  totalCaseCount: number;
  passedCaseCount: number;
  failedCaseCount: number;
  warningCaseCount: number;
  manualReviewCount: number;
  accuracyScore: number;
  evidenceScore: number;
  falsePositiveControlScore: number;
  claimSafetyScore: number;
  benchmarkConfidenceScore: number;
  executiveSummary: string;
  developerSummary: string;
  clientSafeSummary: string;
  limitationsSummary: string;
  blockedClaims: string[];
  sourceCounts: BenchmarkSourceCounts;
  cases: BenchmarkCaseDraft[];
};

export type LaunchCheckDraft = {
  checkKey: string;
  checkTitle: string;
  checkGroup:
    | "security"
    | "auth"
    | "database"
    | "legal"
    | "billing"
    | "monitoring"
    | "quality"
    | "deployment"
    | "support"
    | "production";
  checkStatus: LaunchCheckStatus;
  severity: LaunchSeverity;
  ownerNote: string;
  evidenceSummary: string;
  requiredAction: string;
  clientSafeNote: string;
  blockerReason: string;
  displayOrder: number;
  checkPayload: Record<string, unknown>;
};

export type LaunchSnapshotDraft = {
  snapshotStatus: "ready" | "needs-review" | "blocked";
  totalCheckCount: number;
  passedCheckCount: number;
  warningCheckCount: number;
  failedCheckCount: number;
  blockedCheckCount: number;
  launchReadinessScore: number;
  securityHardeningScore: number;
  operationalReadinessScore: number;
  qualityConfidenceScore: number;
  customerTrustScore: number;
  executiveSummary: string;
  launchBlockerSummary: string;
  hardeningSummary: string;
  finalRecommendation: string;
  blockedClaims: string[];
  releaseNotes: Array<{
    noteType:
      | "launch-note"
      | "known-limitation"
      | "release-blocker"
      | "post-launch-task"
      | "customer-safe-note";
    noteTitle: string;
    noteBody: string;
    severity: LaunchSeverity;
    displayOrder: number;
  }>;
};

export const launchHardeningBlockedClaims = [
  "Do not claim the SaaS is 100% secure.",
  "Do not claim all vulnerabilities were found.",
  "Do not claim all client websites are safe.",
  "Do not claim legal compliance certification.",
  "Do not hide known launch blockers.",
  "Do not expose private customer data in release notes.",
  "Do not ship payment collection without verified provider security.",
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFromStatus(status: BenchmarkStatus | LaunchCheckStatus) {
  if (status === "pass" || status === "not-applicable") return 100;
  if (status === "warning") return 70;
  if (status === "manual-review" || status === "pending") return 45;
  if (status === "fail") return 20;
  if (status === "blocked") return 0;
  return 0;
}

export function buildBenchmarkCases(
  sourceCounts: BenchmarkSourceCounts,
): BenchmarkCaseDraft[] {
  const cases: BenchmarkCaseDraft[] = [
    {
      caseKey: "evidence-coverage",
      caseTitle: "Evidence coverage exists",
      caseCategory: "evidence",
      caseStatus:
        sourceCounts.evidenceItems > 0 || sourceCounts.proofChains > 0
          ? "pass"
          : "warning",
      severity: "High",
      expectedResult:
        "Evidence Warehouse or proof chain data should exist before serious client delivery.",
      actualResult: `${sourceCounts.evidenceItems} evidence item(s), ${sourceCounts.proofChains} proof chain(s).`,
      evidenceSummary:
        "Evidence coverage is used to reduce unsupported report claims.",
      remediationAction:
        "Run Evidence Warehouse and proof-chain workflows before launch/demo delivery.",
      clientSafeNote:
        "Evidence-backed summaries are safer than generic scanner claims.",
      blockedClaim: "Do not claim every finding is confirmed without evidence.",
      caseScore:
        sourceCounts.evidenceItems > 0 || sourceCounts.proofChains > 0
          ? 100
          : 70,
      casePayload: { sourceCounts },
    },
    {
      caseKey: "false-positive-control",
      caseTitle: "False positive control exists",
      caseCategory: "false-positive-control",
      caseStatus: sourceCounts.accuracyAssessments > 0 ? "pass" : "warning",
      severity: "High",
      expectedResult: "Accuracy assessments should exist for quality control.",
      actualResult: `${sourceCounts.accuracyAssessments} accuracy assessment(s).`,
      evidenceSummary:
        "Accuracy foundation helps avoid fake confirmed vulnerabilities.",
      remediationAction:
        "Run Accuracy Foundation and manual review for low-confidence items.",
      clientSafeNote: "Confidence wording should match available evidence.",
      blockedClaim: "Do not state low-confidence findings as confirmed.",
      caseScore: sourceCounts.accuracyAssessments > 0 ? 100 : 70,
      casePayload: { sourceCounts },
    },
    {
      caseKey: "client-report-safety",
      caseTitle: "Client-safe report workflow exists",
      caseCategory: "client-report",
      caseStatus: sourceCounts.reports > 0 ? "pass" : "warning",
      severity: "Medium",
      expectedResult:
        "Client Report v4 should be generated before client sharing.",
      actualResult: `${sourceCounts.reports} client report snapshot(s).`,
      evidenceSummary:
        "Report v4 controls executive wording, limitations and blocked claims.",
      remediationAction: "Generate Client Report v4 before external sharing.",
      clientSafeNote:
        "Client reports should show limitations and confidence clearly.",
      blockedClaim: "Do not claim legal certification from report generation.",
      caseScore: sourceCounts.reports > 0 ? 100 : 70,
      casePayload: { sourceCounts },
    },
    {
      caseKey: "developer-remediation-loop",
      caseTitle: "Developer remediation loop exists",
      caseCategory: "developer-workflow",
      caseStatus: sourceCounts.developerTasks > 0 ? "pass" : "manual-review",
      severity: "Medium",
      expectedResult: "Developer tasks should exist for remediation workflow.",
      actualResult: `${sourceCounts.developerTasks} developer task(s).`,
      evidenceSummary:
        "Developer Portal links findings to fixes and retest requests.",
      remediationAction: "Use Developer Portal to create and track fixes.",
      clientSafeNote: "Fix claims should map to remediation status.",
      blockedClaim:
        "Do not claim fixed until developer and retest evidence exist.",
      caseScore: sourceCounts.developerTasks > 0 ? 100 : 45,
      casePayload: { sourceCounts },
    },
    {
      caseKey: "retest-proof-loop",
      caseTitle: "Retest proof workflow exists",
      caseCategory: "quality-control",
      caseStatus: sourceCounts.retestRuns > 0 ? "pass" : "warning",
      severity: "High",
      expectedResult: "Retest runs should exist for verified-fix proof.",
      actualResult: `${sourceCounts.retestRuns} retest run(s).`,
      evidenceSummary:
        "Retest + Client Portal Pro prevents fake verified-fixed claims.",
      remediationAction:
        "Run Retest + Client Portal Pro and store proof snapshots.",
      clientSafeNote: "Verified-fixed should be item-level and proof-backed.",
      blockedClaim: "Do not claim complete site security from retest proof.",
      caseScore: sourceCounts.retestRuns > 0 ? 100 : 70,
      casePayload: { sourceCounts },
    },
    {
      caseKey: "monitoring-regression-awareness",
      caseTitle: "Monitoring regression awareness exists",
      caseCategory: "monitoring",
      caseStatus:
        sourceCounts.monitoringAlerts === 0 ? "pass" : "manual-review",
      severity: sourceCounts.monitoringAlerts > 0 ? "High" : "Info",
      expectedResult:
        "Open monitoring alerts should be reviewed before launch.",
      actualResult: `${sourceCounts.monitoringAlerts} monitoring alert(s).`,
      evidenceSummary: "Monitoring Pro flags regressions and readiness drops.",
      remediationAction:
        sourceCounts.monitoringAlerts > 0
          ? "Review and resolve or accept monitoring alerts."
          : "Continue monitoring after launch.",
      clientSafeNote: "Regression monitoring is not a breach claim.",
      blockedClaim:
        "Do not claim breach or exploitation from monitoring signal alone.",
      caseScore: sourceCounts.monitoringAlerts === 0 ? 100 : 45,
      casePayload: { sourceCounts },
    },
    {
      caseKey: "ai-triage-usage",
      caseTitle: "AI triage prioritization exists",
      caseCategory: "billing",
      caseStatus: sourceCounts.aiTriageRuns > 0 ? "pass" : "warning",
      severity: "Low",
      expectedResult:
        "AI triage should be available to prioritize remaining work.",
      actualResult: `${sourceCounts.aiTriageRuns} AI triage run(s).`,
      evidenceSummary:
        "AI triage ranks remediation order without exploit payloads.",
      remediationAction: "Run AI triage before final sprint planning.",
      clientSafeNote:
        "Triage is prioritization only, not proof of exploitation.",
      blockedClaim: "Do not claim AI triage confirms vulnerabilities.",
      caseScore: sourceCounts.aiTriageRuns > 0 ? 100 : 70,
      casePayload: { sourceCounts },
    },
    {
      caseKey: "claim-safety",
      caseTitle: "Blocked claims are enforced",
      caseCategory: "claim-safety",
      caseStatus: "pass",
      severity: "Critical",
      expectedResult:
        "Reports and launch notes must include blocked claim boundaries.",
      actualResult:
        "Blocked claim guardrails are included in final launch workflow.",
      evidenceSummary:
        "Blocked claims prevent 100% secure, all vulnerabilities found and legal certification wording.",
      remediationAction:
        "Keep blocked claim language visible in all client-facing reports.",
      clientSafeNote: "Transparent limitations improve trust.",
      blockedClaim: "Do not remove limitations from client-facing output.",
      caseScore: 100,
      casePayload: { blockedClaims: launchHardeningBlockedClaims },
    },
  ];

  return cases;
}

export function buildBenchmarkRun(
  sourceCounts: BenchmarkSourceCounts,
): BenchmarkRunDraft {
  const cases = buildBenchmarkCases(sourceCounts);
  const totalCaseCount = cases.length;
  const passedCaseCount = cases.filter(
    (item) => item.caseStatus === "pass",
  ).length;
  const failedCaseCount = cases.filter(
    (item) => item.caseStatus === "fail",
  ).length;
  const warningCaseCount = cases.filter(
    (item) => item.caseStatus === "warning",
  ).length;
  const manualReviewCount = cases.filter(
    (item) => item.caseStatus === "manual-review",
  ).length;

  const average = (filter: (item: BenchmarkCaseDraft) => boolean) => {
    const selected = cases.filter(filter);
    return selected.length
      ? clamp(
          selected.reduce((sum, item) => sum + item.caseScore, 0) /
            selected.length,
        )
      : 0;
  };

  const accuracyScore = average(() => true);
  const evidenceScore = average(
    (item) =>
      item.caseCategory === "evidence" || item.caseCategory === "client-report",
  );
  const falsePositiveControlScore = average(
    (item) =>
      item.caseCategory === "false-positive-control" ||
      item.caseCategory === "quality-control",
  );
  const claimSafetyScore = average(
    (item) =>
      item.caseCategory === "claim-safety" ||
      item.caseCategory === "client-report",
  );
  const benchmarkConfidenceScore = clamp(
    accuracyScore * 0.4 +
      evidenceScore * 0.2 +
      falsePositiveControlScore * 0.2 +
      claimSafetyScore * 0.2,
  );

  return {
    totalCaseCount,
    passedCaseCount,
    failedCaseCount,
    warningCaseCount,
    manualReviewCount,
    accuracyScore,
    evidenceScore,
    falsePositiveControlScore,
    claimSafetyScore,
    benchmarkConfidenceScore,
    executiveSummary: `${passedCaseCount}/${totalCaseCount} benchmark cases passed. Accuracy score ${accuracyScore}/100 and benchmark confidence ${benchmarkConfidenceScore}/100.`,
    developerSummary: `${warningCaseCount} warning(s), ${manualReviewCount} manual-review item(s), ${failedCaseCount} failed case(s). Resolve blockers before final launch.`,
    clientSafeSummary:
      "Benchmark results show evidence and quality-control readiness. They do not guarantee complete security coverage.",
    limitationsSummary:
      "Accuracy benchmark is a quality-control framework, not a legal certification or a guarantee that every vulnerability was found.",
    blockedClaims: launchHardeningBlockedClaims,
    sourceCounts,
    cases,
  };
}

export function defaultLaunchChecks(): LaunchCheckDraft[] {
  return [
    {
      checkKey: "supabase-rls-enabled",
      checkTitle: "Supabase RLS enabled for product tables",
      checkGroup: "database",
      checkStatus: "pending",
      severity: "Critical",
      ownerNote: "",
      evidenceSummary:
        "All user-facing tables should have RLS and owner/admin policies.",
      requiredAction:
        "Review Supabase RLS policies for every new part before production.",
      clientSafeNote:
        "Database access should be isolated per user/organization.",
      blockerReason: "Missing RLS can expose customer data.",
      displayOrder: 10,
      checkPayload: { launchBlocker: true },
    },
    {
      checkKey: "auth-redirect-production",
      checkTitle: "Production auth redirect configured",
      checkGroup: "auth",
      checkStatus: "pending",
      severity: "High",
      ownerNote: "",
      evidenceSummary:
        "Supabase Site URL and Redirect URL should point to production Vercel domain.",
      requiredAction:
        "Set Supabase URL Configuration for production domain and redeploy.",
      clientSafeNote:
        "Users should not be redirected to localhost in production.",
      blockerReason: "Wrong auth redirects break login/signup.",
      displayOrder: 20,
      checkPayload: { launchBlocker: true },
    },
    {
      checkKey: "env-vars-production",
      checkTitle: "Production environment variables verified",
      checkGroup: "deployment",
      checkStatus: "pending",
      severity: "High",
      ownerNote: "",
      evidenceSummary:
        "Vercel environment variables should be production-safe.",
      requiredAction:
        "Verify NEXT_PUBLIC_SITE_URL and Supabase publishable key in Vercel.",
      clientSafeNote: "Production should use the correct public site URL.",
      blockerReason: "Wrong env values can break auth and links.",
      displayOrder: 30,
      checkPayload: { launchBlocker: true },
    },
    {
      checkKey: "legal-pages-ready",
      checkTitle: "Legal and trust pages reviewed",
      checkGroup: "legal",
      checkStatus: "pending",
      severity: "Medium",
      ownerNote: "",
      evidenceSummary:
        "Terms, privacy, refund, responsible disclosure and trust pages should be reviewed.",
      requiredAction:
        "Review legal pages with appropriate professional help before paid launch.",
      clientSafeNote:
        "Legal pages improve transparency but are not legal advice.",
      blockerReason: "Paid SaaS needs clear legal/trust pages.",
      displayOrder: 40,
      checkPayload: { launchBlocker: false },
    },
    {
      checkKey: "billing-provider-not-live",
      checkTitle: "Billing provider integration status clear",
      checkGroup: "billing",
      checkStatus: "warning",
      severity: "High",
      ownerNote: "",
      evidenceSummary:
        "Part 65 is billing foundation only; no real payment provider is connected.",
      requiredAction:
        "Do not collect payments until Razorpay/Stripe integration, webhook validation and receipts are implemented.",
      clientSafeNote: "Current billing is manual/foundation status.",
      blockerReason: "Payment collection is not live yet.",
      displayOrder: 50,
      checkPayload: { launchBlocker: true },
    },
    {
      checkKey: "no-unsafe-security-claims",
      checkTitle: "No unsafe security claims",
      checkGroup: "quality",
      checkStatus: "pass",
      severity: "Critical",
      ownerNote: "",
      evidenceSummary:
        "Blocked claims are included across reports and launch workflows.",
      requiredAction: "Keep limitation language visible in client reports.",
      clientSafeNote: "No 100% secure or all vulnerabilities found claims.",
      blockerReason: "",
      displayOrder: 60,
      checkPayload: { launchBlocker: true },
    },
    {
      checkKey: "monitoring-alerts-reviewed",
      checkTitle: "Monitoring alerts reviewed",
      checkGroup: "monitoring",
      checkStatus: "pending",
      severity: "Medium",
      ownerNote: "",
      evidenceSummary:
        "Open Monitoring Pro alerts should be reviewed before launch.",
      requiredAction: "Resolve, acknowledge or accept risk for open alerts.",
      clientSafeNote:
        "Known regression signals should be transparent internally.",
      blockerReason: "Open high-risk alerts can affect launch readiness.",
      displayOrder: 70,
      checkPayload: { launchBlocker: false },
    },
    {
      checkKey: "support-process-ready",
      checkTitle: "Support and incident response process ready",
      checkGroup: "support",
      checkStatus: "pending",
      severity: "Medium",
      ownerNote: "",
      evidenceSummary:
        "Support email/process and responsible disclosure workflow should be ready.",
      requiredAction:
        "Define support response process, disclosure intake and escalation steps.",
      clientSafeNote: "Customers need clear support and disclosure channels.",
      blockerReason: "",
      displayOrder: 80,
      checkPayload: { launchBlocker: false },
    },
    {
      checkKey: "production-build-e2e-passed",
      checkTitle: "Production build and E2E tests passed",
      checkGroup: "deployment",
      checkStatus: "pending",
      severity: "Critical",
      ownerNote: "",
      evidenceSummary:
        "npm test, npm build and npm e2e should pass before final push.",
      requiredAction:
        "Run full test/build/e2e locally and confirm Vercel deployment.",
      clientSafeNote:
        "Release should pass automated checks before production launch.",
      blockerReason: "Broken build or E2E failures block launch.",
      displayOrder: 90,
      checkPayload: { launchBlocker: true },
    },
  ];
}

export function buildLaunchSnapshot(
  checks: Array<
    Pick<
      LaunchCheckDraft,
      "checkStatus" | "checkGroup" | "severity" | "checkTitle" | "blockerReason"
    >
  >,
  benchmark?: Pick<
    BenchmarkRunDraft,
    "benchmarkConfidenceScore" | "accuracyScore"
  >,
): LaunchSnapshotDraft {
  const totalCheckCount = checks.length;
  const passedCheckCount = checks.filter(
    (item) =>
      item.checkStatus === "pass" || item.checkStatus === "not-applicable",
  ).length;
  const warningCheckCount = checks.filter(
    (item) => item.checkStatus === "warning" || item.checkStatus === "pending",
  ).length;
  const failedCheckCount = checks.filter(
    (item) => item.checkStatus === "fail",
  ).length;
  const blockedCheckCount = checks.filter(
    (item) =>
      item.checkStatus === "blocked" ||
      (item.severity === "Critical" &&
        item.checkStatus !== "pass" &&
        item.checkStatus !== "not-applicable"),
  ).length;

  const average = (filter: (item: (typeof checks)[number]) => boolean) => {
    const selected = checks.filter(filter);
    return selected.length
      ? clamp(
          selected.reduce(
            (sum, item) => sum + scoreFromStatus(item.checkStatus),
            0,
          ) / selected.length,
        )
      : 0;
  };

  const securityHardeningScore = average((item) =>
    ["security", "auth", "database"].includes(item.checkGroup),
  );
  const operationalReadinessScore = average((item) =>
    ["deployment", "monitoring", "support", "production"].includes(
      item.checkGroup,
    ),
  );
  const qualityConfidenceScore = clamp(
    ((benchmark?.benchmarkConfidenceScore || 0) +
      average((item) => ["quality", "billing"].includes(item.checkGroup))) /
      2,
  );
  const customerTrustScore = average((item) =>
    ["legal", "support", "billing"].includes(item.checkGroup),
  );
  const launchReadinessScore = clamp(
    securityHardeningScore * 0.3 +
      operationalReadinessScore * 0.25 +
      qualityConfidenceScore * 0.25 +
      customerTrustScore * 0.2,
  );
  const snapshotStatus =
    blockedCheckCount > 0
      ? "blocked"
      : launchReadinessScore >= 80
        ? "ready"
        : "needs-review";

  const blockers = checks.filter(
    (item) =>
      item.checkStatus === "blocked" ||
      item.checkStatus === "fail" ||
      (item.severity === "Critical" &&
        item.checkStatus !== "pass" &&
        item.checkStatus !== "not-applicable"),
  );
  const releaseNotes = [
    {
      noteType:
        snapshotStatus === "ready"
          ? ("launch-note" as const)
          : ("release-blocker" as const),
      noteTitle:
        snapshotStatus === "ready"
          ? "Launch readiness acceptable"
          : "Launch blockers need review",
      noteBody:
        snapshotStatus === "ready"
          ? "Core readiness indicators are acceptable. Continue monitoring after launch."
          : `${blockers.length} blocker(s) or critical pending item(s) require action before final launch.`,
      severity:
        snapshotStatus === "ready" ? ("Info" as const) : ("High" as const),
      displayOrder: 10,
    },
    {
      noteType: "known-limitation" as const,
      noteTitle: "Known limitation: no complete security guarantee",
      noteBody:
        "The platform supports authorized security review workflows but does not guarantee every vulnerability was found.",
      severity: "Medium" as const,
      displayOrder: 20,
    },
    {
      noteType: "post-launch-task" as const,
      noteTitle: "Post-launch task: monitor regression alerts",
      noteBody:
        "Keep Monitoring Pro and Agency SOC checks active after launch.",
      severity: "Medium" as const,
      displayOrder: 30,
    },
  ];

  return {
    snapshotStatus,
    totalCheckCount,
    passedCheckCount,
    warningCheckCount,
    failedCheckCount,
    blockedCheckCount,
    launchReadinessScore,
    securityHardeningScore,
    operationalReadinessScore,
    qualityConfidenceScore,
    customerTrustScore,
    executiveSummary: `Launch readiness ${launchReadinessScore}/100. ${passedCheckCount}/${totalCheckCount} checks passed and ${blockedCheckCount} blocker(s) need action.`,
    launchBlockerSummary: blockers.length
      ? blockers.map((item) => item.checkTitle).join(", ")
      : "No critical launch blockers found in current checklist state.",
    hardeningSummary: `Security hardening ${securityHardeningScore}/100, operations ${operationalReadinessScore}/100, quality confidence ${qualityConfidenceScore}/100 and customer trust ${customerTrustScore}/100.`,
    finalRecommendation:
      snapshotStatus === "ready"
        ? "Ready for controlled production launch with monitoring enabled."
        : "Do not perform full public launch until blockers and warnings are reviewed.",
    blockedClaims: launchHardeningBlockedClaims,
    releaseNotes,
  };
}
