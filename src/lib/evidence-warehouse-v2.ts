import { createHash } from "node:crypto";

export type EvidenceSourceType =
  | "scan"
  | "orchestrator-engine"
  | "vulnerability-finding"
  | "accuracy-assessment"
  | "workspace-item"
  | "manual"
  | "retest"
  | "monitoring";

export type EvidenceType =
  | "http-observation"
  | "header-observation"
  | "cookie-observation"
  | "crawler-observation"
  | "browser-observation"
  | "api-observation"
  | "cms-observation"
  | "form-observation"
  | "finding-evidence"
  | "accuracy-evidence"
  | "workspace-evidence"
  | "retest-evidence"
  | "monitoring-evidence"
  | "manual-observation"
  | "observation";

export type EvidenceQuality =
  "strong" | "good" | "partial" | "weak" | "missing";

export type EvidenceDraft = {
  evidenceKey: string;
  sourceType: EvidenceSourceType;
  sourceId?: string | null;
  sourceEngine?: string | null;
  evidenceType: EvidenceType;
  evidenceCategory: string;
  title: string;
  summary: string;
  affectedUrl?: string | null;
  observedValue?: string | null;
  expectedValue?: string | null;
  proofValue?: string | null;
  safeClaim?: string | null;
  blockedClaim?: string | null;
  sensitivityLevel?:
    "public" | "client-safe" | "technical" | "internal" | "sensitive";
  confidenceLevel?:
    "Confirmed" | "High" | "Medium" | "Low" | "Needs manual review";
  evidenceQuality?: EvidenceQuality;
  validationStatus?:
    "unvalidated" | "validated" | "needs-review" | "rejected" | "expired";
  rawEvidence?: Record<string, unknown>;
  redactedEvidence?: Record<string, unknown>;
};

export type ProofChainStats = {
  totalEvidenceItems: number;
  validatedItems: number;
  needsReviewItems: number;
  rejectedItems: number;
  strongItems: number;
  clientSafeItems: number;
  technicalItems: number;
  completenessScore: number;
};

export function canonicalizeEvidence(input: unknown): string {
  const seen = new WeakSet();

  function normalize(value: unknown): unknown {
    if (value === null || typeof value !== "object") return value;
    if (seen.has(value as object)) return "[Circular]";
    seen.add(value as object);

    if (Array.isArray(value)) return value.map(normalize);

    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce(
        (acc, key) => {
          const next = (value as Record<string, unknown>)[key];
          if (next !== undefined) acc[key] = normalize(next);
          return acc;
        },
        {} as Record<string, unknown>,
      );
  }

  return JSON.stringify(normalize(input));
}

export function hashEvidence(input: unknown) {
  return createHash("sha256").update(canonicalizeEvidence(input)).digest("hex");
}

export function buildEvidenceHash(
  input: EvidenceDraft,
  previousHash?: string | null,
) {
  return hashEvidence({
    evidenceKey: input.evidenceKey,
    sourceType: input.sourceType,
    sourceId: input.sourceId || null,
    sourceEngine: input.sourceEngine || null,
    evidenceType: input.evidenceType,
    evidenceCategory: input.evidenceCategory,
    title: input.title,
    summary: input.summary,
    affectedUrl: input.affectedUrl || null,
    observedValue: input.observedValue || null,
    expectedValue: input.expectedValue || null,
    proofValue: input.proofValue || null,
    safeClaim: input.safeClaim || null,
    blockedClaim: input.blockedClaim || null,
    rawEvidence: input.rawEvidence || {},
    previousHash: previousHash || null,
  });
}

export function inferEvidenceQuality(input: EvidenceDraft): EvidenceQuality {
  let score = 0;

  if (input.summary && input.summary.length > 20) score += 20;
  if (input.affectedUrl) score += 15;
  if (input.observedValue) score += 15;
  if (input.expectedValue) score += 10;
  if (input.proofValue) score += 15;
  if (input.safeClaim) score += 10;
  if (input.blockedClaim) score += 10;
  if (input.rawEvidence && Object.keys(input.rawEvidence).length) score += 10;

  if (score >= 80) return "strong";
  if (score >= 60) return "good";
  if (score >= 35) return "partial";
  if (score >= 15) return "weak";
  return "missing";
}

export function redactEvidence(input: EvidenceDraft) {
  return {
    evidenceKey: input.evidenceKey,
    sourceType: input.sourceType,
    sourceEngine: input.sourceEngine || null,
    evidenceType: input.evidenceType,
    evidenceCategory: input.evidenceCategory,
    title: input.title,
    summary: input.summary,
    affectedUrl: input.affectedUrl || null,
    observedValue: input.observedValue
      ? String(input.observedValue).slice(0, 500)
      : null,
    expectedValue: input.expectedValue
      ? String(input.expectedValue).slice(0, 500)
      : null,
    proofValue: input.proofValue
      ? String(input.proofValue).slice(0, 500)
      : null,
    safeClaim: input.safeClaim || null,
    blockedClaim: input.blockedClaim || null,
  };
}

export function calculateProofChainCompleteness(
  stats: Omit<ProofChainStats, "completenessScore">,
) {
  if (!stats.totalEvidenceItems) return 0;

  const validatedScore = (stats.validatedItems / stats.totalEvidenceItems) * 45;
  const qualityScore = (stats.strongItems / stats.totalEvidenceItems) * 35;
  const clientSafeBonus = stats.clientSafeItems > 0 ? 10 : 0;
  const technicalBonus = stats.technicalItems > 0 ? 10 : 0;

  return Math.min(
    100,
    Math.round(
      validatedScore + qualityScore + clientSafeBonus + technicalBonus,
    ),
  );
}

export function buildProofSummary(stats: ProofChainStats) {
  return `${stats.totalEvidenceItems} evidence item(s), ${stats.validatedItems} validated, ${stats.needsReviewItems} need review, completeness ${stats.completenessScore}%.`;
}

export function evidenceCompletenessLabel(score: number) {
  if (score >= 90) return "Strong proof chain";
  if (score >= 70) return "Good proof chain";
  if (score >= 45) return "Partial proof chain";
  if (score >= 20) return "Weak proof chain";
  return "Proof chain not ready";
}

export function createEvidenceDraftFromEngineRun(input: {
  id: string;
  engineKey: string;
  engineName: string;
  engineGroup: string;
  engineType: string;
  runStatus: string;
  evidenceSummary?: string | null;
  safeSummary?: string | null;
  observationsCount?: number | null;
  findingsCreatedCount?: number | null;
  engineResult?: Record<string, unknown> | null;
  targetUrl: string;
}): EvidenceDraft {
  return {
    evidenceKey: `engine:${input.id}`,
    sourceType: "orchestrator-engine",
    sourceId: input.id,
    sourceEngine: input.engineKey,
    evidenceType:
      input.engineType === "browser-security"
        ? "browser-observation"
        : input.engineType === "api-security"
          ? "api-observation"
          : input.engineType === "cms-ecommerce"
            ? "cms-observation"
            : "observation",
    evidenceCategory: input.engineGroup || "engine",
    title: `${input.engineName} evidence`,
    summary:
      input.evidenceSummary ||
      input.safeSummary ||
      `${input.engineName} produced safe execution metadata.`,
    affectedUrl: input.targetUrl,
    observedValue: `status=${input.runStatus}; observations=${input.observationsCount || 0}; findings=${input.findingsCreatedCount || 0}`,
    expectedValue:
      "Engine should complete within safe authorization boundary and produce traceable evidence.",
    proofValue: input.runStatus,
    safeClaim: `${input.engineName} execution metadata was captured in the proof chain.`,
    blockedClaim:
      "Do not claim vulnerability confirmation from engine execution metadata alone.",
    sensitivityLevel: "technical",
    confidenceLevel: input.runStatus === "completed" ? "High" : "Medium",
    evidenceQuality: input.evidenceSummary ? "good" : "partial",
    validationStatus:
      input.runStatus === "completed" ? "validated" : "unvalidated",
    rawEvidence: input.engineResult || {},
    redactedEvidence: {
      engineKey: input.engineKey,
      engineName: input.engineName,
      runStatus: input.runStatus,
      observationsCount: input.observationsCount || 0,
      findingsCreatedCount: input.findingsCreatedCount || 0,
    },
  };
}

export function createEvidenceDraftFromFinding(input: {
  id: string;
  bugKey?: string | null;
  title: string;
  severity: string;
  confidence?: string | null;
  falsePositiveRisk?: string | null;
  affectedUrl?: string | null;
  evidenceType?: string | null;
  evidenceSummary?: string | null;
  observedValue?: string | null;
  expectedValue?: string | null;
  safeClaim?: string | null;
  blockedClaim?: string | null;
  rawEvidence?: Record<string, unknown> | null;
}): EvidenceDraft {
  const draft: EvidenceDraft = {
    evidenceKey: `finding:${input.id}`,
    sourceType: "vulnerability-finding",
    sourceId: input.id,
    sourceEngine: "vulnerability-bug-finder",
    evidenceType: "finding-evidence",
    evidenceCategory: input.bugKey || "vulnerability-finding",
    title: input.title,
    summary: input.evidenceSummary || "Finding evidence summary needs review.",
    affectedUrl: input.affectedUrl || null,
    observedValue: input.observedValue || null,
    expectedValue: input.expectedValue || null,
    proofValue: `${input.severity}; ${input.confidence || "Medium"} confidence; FP risk ${input.falsePositiveRisk || "Medium"}`,
    safeClaim: input.safeClaim || "Finding evidence was captured for review.",
    blockedClaim:
      input.blockedClaim ||
      "Do not claim exploitation without validated evidence.",
    sensitivityLevel: "client-safe",
    confidenceLevel:
      input.confidence === "Confirmed" || input.confidence === "High"
        ? input.confidence
        : "Medium",
    validationStatus:
      input.confidence === "Confirmed" ? "validated" : "needs-review",
    rawEvidence: input.rawEvidence || {},
  };

  return {
    ...draft,
    evidenceQuality: inferEvidenceQuality(draft),
    redactedEvidence: redactEvidence(draft),
  };
}

export function createEvidenceDraftFromAccuracy(input: {
  id: string;
  taxonomyKey?: string | null;
  category: string;
  severity: string;
  accuracyStatus: string;
  confidenceScore: number;
  falsePositiveRisk: string;
  evidenceQuality: string;
  accuracyReason: string;
  clientSafeClaim: string;
  blockedClaim: string;
}): EvidenceDraft {
  return {
    evidenceKey: `accuracy:${input.id}`,
    sourceType: "accuracy-assessment",
    sourceId: input.id,
    sourceEngine: "accuracy-foundation",
    evidenceType: "accuracy-evidence",
    evidenceCategory: input.category,
    title: `${input.taxonomyKey || "finding"} accuracy assessment`,
    summary: input.accuracyReason,
    observedValue: `${input.accuracyStatus}; confidence ${input.confidenceScore}/100; FP risk ${input.falsePositiveRisk}`,
    expectedValue:
      "Only confirmed/high-confidence findings should use strong client report wording.",
    proofValue: `${input.confidenceScore}/100`,
    safeClaim: input.clientSafeClaim,
    blockedClaim: input.blockedClaim,
    sensitivityLevel: "client-safe",
    confidenceLevel:
      input.accuracyStatus === "confirmed"
        ? "Confirmed"
        : input.accuracyStatus === "high-confidence"
          ? "High"
          : "Medium",
    evidenceQuality:
      input.evidenceQuality === "strong" || input.evidenceQuality === "good"
        ? input.evidenceQuality
        : "partial",
    validationStatus:
      input.accuracyStatus === "confirmed" ? "validated" : "needs-review",
    rawEvidence: {
      taxonomyKey: input.taxonomyKey,
      category: input.category,
      severity: input.severity,
      accuracyStatus: input.accuracyStatus,
      confidenceScore: input.confidenceScore,
      falsePositiveRisk: input.falsePositiveRisk,
      evidenceQuality: input.evidenceQuality,
    },
  };
}
