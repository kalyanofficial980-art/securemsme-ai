export type RetestStatus =
  "pending" | "running" | "passed" | "failed" | "needs-review" | "blocked";
export type RetestPriority = "Critical" | "High" | "Medium" | "Low" | "Info";
export type RetestConfidence =
  "Confirmed" | "High" | "Medium" | "Low" | "Needs manual review";

export type RetestItemInput = {
  title: string;
  status?: RetestStatus;
  priority?: RetestPriority;
  confidence?: RetestConfidence;
  affectedArea?: string;
  beforeEvidence?: string;
  fixSummary?: string;
  safeRetestSteps?: string;
  afterEvidence?: string;
  verificationNote?: string;
};

export type RetestItemDraft = {
  title: string;
  status: RetestStatus;
  priority: RetestPriority;
  confidence: RetestConfidence;
  affectedArea: string;
  beforeEvidence: string;
  fixSummary: string;
  safeRetestSteps: string;
  afterEvidence: string;
  verificationNote: string;
  clientResult: string;
  blockedClaim: string;
  proofFingerprint: string;
};

export const retestClientPortalBlockedClaims = [
  "Do not claim a fix is verified without retest proof.",
  "Do not say the website is 100% secure.",
  "Do not claim all vulnerabilities were found or fixed.",
  "Do not expose private customer data in proof notes.",
  "Do not share passwords, tokens or session cookies.",
  "Do not include exploit payloads or destructive test steps.",
  "Do not claim legal compliance certification.",
];

export function sanitizeProofText(value: string) {
  let text = value || "";
  for (const pattern of [
    /password\s*[:=]\s*\S+/gi,
    /token\s*[:=]\s*\S+/gi,
    /session\s*[:=]\s*\S+/gi,
    /cookie\s*[:=]\s*\S+/gi,
    /authorization\s*:\s*bearer\s+\S+/gi,
  ]) {
    text = text.replace(pattern, "[redacted-secret]");
  }
  return text.slice(0, 5000);
}

export function hasUnsafeRetestContent(value: string) {
  const text = value.toLowerCase();
  return [
    "<script>alert",
    "drop table",
    "delete all",
    "brute force",
    "ddos",
    "bypass login",
    "steal cookie",
  ].some((word) => text.includes(word));
}

export function createProofFingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `proof-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function clientResultForStatus(status: RetestStatus) {
  if (status === "passed")
    return "Fix appears verified by available safe retest proof.";
  if (status === "failed")
    return "Fix did not pass safe retest and needs developer review.";
  if (status === "needs-review")
    return "Manual review is needed before verified-fixed wording.";
  if (status === "blocked")
    return "Retest is blocked because proof or scope is incomplete or unsafe.";
  if (status === "running") return "Safe retest is running.";
  return "Retest has not been completed yet.";
}

export function buildRetestItem(input: RetestItemInput): RetestItemDraft {
  const safeRetestSteps = sanitizeProofText(
    input.safeRetestSteps ||
      "Use approved safe checks only. Do not run exploit payloads or destructive tests.",
  );
  const unsafe = hasUnsafeRetestContent(safeRetestSteps);
  const status = unsafe ? "blocked" : input.status || "pending";
  const title = sanitizeProofText(input.title || "Retest item");
  const affectedArea = sanitizeProofText(
    input.affectedArea || "Website application",
  );
  const beforeEvidence = sanitizeProofText(
    input.beforeEvidence ||
      "Before-fix evidence should be linked before client delivery.",
  );
  const fixSummary = sanitizeProofText(
    input.fixSummary ||
      "Developer fix summary should be added before verification.",
  );
  const afterEvidence = sanitizeProofText(input.afterEvidence || "");
  const verificationNote = sanitizeProofText(input.verificationNote || "");
  const proofFingerprint = createProofFingerprint(
    `${title}|${affectedArea}|${beforeEvidence}|${fixSummary}|${afterEvidence}|${status}`,
  );

  return {
    title,
    status,
    priority: input.priority || "Medium",
    confidence: input.confidence || "Medium",
    affectedArea,
    beforeEvidence,
    fixSummary,
    safeRetestSteps,
    afterEvidence,
    verificationNote,
    clientResult: clientResultForStatus(status),
    blockedClaim:
      status === "passed"
        ? "Do not claim the whole website is secure; only this item has proof."
        : "Do not claim verified-fixed until retest passes.",
    proofFingerprint,
  };
}

export function calculateRetestSummary(
  items: Array<
    Pick<RetestItemDraft, "status" | "proofFingerprint" | "confidence">
  >,
) {
  const total = items.length;
  const passed = items.filter((item) => item.status === "passed").length;
  const failed = items.filter((item) => item.status === "failed").length;
  const needsReview = items.filter(
    (item) => item.status === "needs-review",
  ).length;
  const blocked = items.filter((item) => item.status === "blocked").length;
  const pending = items.filter(
    (item) => item.status === "pending" || item.status === "running",
  ).length;
  const decided = passed + failed + needsReview + blocked;
  const proof = items.filter((item) => Boolean(item.proofFingerprint)).length;
  const highConfidence = items.filter(
    (item) => item.confidence === "Confirmed" || item.confidence === "High",
  ).length;
  const progressScore = total ? Math.round((decided / total) * 100) : 0;
  const passRate = total ? Math.round((passed / total) * 100) : 0;
  const proofStrengthScore = total
    ? Math.min(100, Math.round(((proof + highConfidence) / (total * 2)) * 100))
    : 0;
  const clientReadinessScore = Math.min(
    100,
    Math.round(
      progressScore * 0.35 + passRate * 0.35 + proofStrengthScore * 0.3,
    ),
  );
  return {
    total,
    passed,
    failed,
    needsReview,
    blocked,
    pending,
    progressScore,
    passRate,
    proofStrengthScore,
    clientReadinessScore,
    executiveSummary: `${passed} of ${total} item(s) passed safe retest verification. Client readiness is ${clientReadinessScore}/100.`,
    clientSafeSummary:
      "Verified-fixed claims are limited to passed items with available proof. No complete-security guarantee is made.",
    limitationsSummary:
      "This portal is not a legal compliance certificate and does not guarantee that every vulnerability was found or fixed.",
  };
}

export function buildClientPortalProSections(input: {
  targetUrl: string;
  executiveScore: number;
  reportReadinessScore: number;
  fixProgressScore: number;
  retestPassRate: number;
  clientReadinessScore: number;
  portalSummary: string;
  limitationsSummary: string;
  passed: number;
  total: number;
}) {
  return [
    {
      sectionKey: "executive-overview",
      title: "Executive overview",
      sectionType: "executive",
      displayOrder: 10,
      statusLabel: input.clientReadinessScore >= 70 ? "Ready" : "Needs review",
      body: input.portalSummary,
      evidenceSummary: `Executive score ${input.executiveScore}/100 and report readiness ${input.reportReadinessScore}/100 are included from available report sources.`,
      actionSummary:
        "Review remediation and retest proof before sharing externally.",
      blockedClaim: "Do not claim complete security coverage.",
    },
    {
      sectionKey: "fix-progress",
      title: "Fix progress",
      sectionType: "developer-status",
      displayOrder: 20,
      statusLabel: `${input.fixProgressScore}/100`,
      body: `Developer fix progress is ${input.fixProgressScore}/100 for ${input.targetUrl}.`,
      evidenceSummary:
        "Fix progress comes from the developer remediation workflow.",
      actionSummary: "Complete remaining fixes and request safe retest.",
      blockedClaim: "Do not claim fixed until implemented and retested.",
    },
    {
      sectionKey: "verified-fix-proof",
      title: "Verified fix proof",
      sectionType: "retest-proof",
      displayOrder: 30,
      statusLabel: `${input.retestPassRate}% passed`,
      body: `${input.passed} of ${input.total} retest item(s) have passed available safe proof checks.`,
      evidenceSummary: "Passed items have item-level proof fingerprints.",
      actionSummary: "Rework failed or needs-review items.",
      blockedClaim: "Do not generalize item proof to the entire website.",
    },
    {
      sectionKey: "limitations",
      title: "Limitations",
      sectionType: "limitation",
      displayOrder: 90,
      statusLabel: "Important",
      body: input.limitationsSummary,
      evidenceSummary: "Client-safe limitation control.",
      actionSummary:
        "Use monitoring and future retesting for ongoing assurance.",
      blockedClaim: "No 100% secure or legal certification claims.",
    },
  ];
}
