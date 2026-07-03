import { describe, expect, it } from "vitest";
import {
  buildEvidenceHash,
  calculateProofChainCompleteness,
  createEvidenceDraftFromFinding,
  evidenceCompletenessLabel,
  hashEvidence,
  inferEvidenceQuality,
} from "@/lib/evidence-warehouse-v2";

describe("evidence warehouse v2", () => {
  it("hashes evidence deterministically", () => {
    const a = hashEvidence({ b: 2, a: 1 });
    const b = hashEvidence({ a: 1, b: 2 });
    expect(a).toBe(b);
  });

  it("builds evidence hash with previous hash", () => {
    const draft = createEvidenceDraftFromFinding({
      id: "finding-1",
      bugKey: "missing-csp",
      title: "CSP missing",
      severity: "High",
      confidence: "High",
      affectedUrl: "https://example.com",
      evidenceSummary: "CSP header was missing.",
      observedValue: "Missing",
      expectedValue: "CSP should be present.",
    });

    const hash = buildEvidenceHash(draft, "previous");
    expect(hash).toHaveLength(64);
  });

  it("infers evidence quality", () => {
    const quality = inferEvidenceQuality({
      evidenceKey: "x",
      sourceType: "manual",
      evidenceType: "manual-observation",
      evidenceCategory: "test",
      title: "Evidence",
      summary: "This is a strong evidence summary with enough detail.",
      affectedUrl: "https://example.com",
      observedValue: "Missing",
      expectedValue: "Present",
      proofValue: "header",
      safeClaim: "Observed safely",
      blockedClaim: "Do not overclaim",
      rawEvidence: { ok: true },
    });

    expect(["strong", "good"]).toContain(quality);
  });

  it("calculates proof chain completeness", () => {
    const score = calculateProofChainCompleteness({
      totalEvidenceItems: 10,
      validatedItems: 8,
      needsReviewItems: 1,
      rejectedItems: 1,
      strongItems: 7,
      clientSafeItems: 6,
      technicalItems: 4,
    });

    expect(score).toBeGreaterThan(70);
    expect(evidenceCompletenessLabel(score)).toContain("proof chain");
  });
});
