import { describe, expect, it } from "vitest";
import { buildRetestProofReport } from "@/lib/retest-proof-engine";

describe("retest proof engine", () => {
  it("detects fixed items", () => {
    const proof = buildRetestProofReport({
      websiteUrl: "https://example.com",
      beforeScan: {
        id: "before",
        websiteUrl: "https://example.com",
        score: 60,
        report: {
          topFixes: [
            {
              name: "Content Security Policy not observed",
              category: "HTTP Security Headers",
              severity: "Medium",
            },
          ],
        },
      },
      afterScan: {
        id: "after",
        websiteUrl: "https://example.com",
        score: 80,
        report: {
          topFixes: [],
        },
      },
    });

    expect(proof.fixedCount).toBe(1);
    expect(proof.scoreChange).toBe(20);
    expect(proof.proofStatus).toBe("verified-improvement");
  });

  it("detects still-open items", () => {
    const proof = buildRetestProofReport({
      websiteUrl: "https://example.com",
      beforeScan: {
        id: "before",
        websiteUrl: "https://example.com",
        score: 60,
        report: {
          topFixes: [{ name: "DMARC record not observed", severity: "Medium" }],
        },
      },
      afterScan: {
        id: "after",
        websiteUrl: "https://example.com",
        score: 60,
        report: {
          topFixes: [{ name: "DMARC record not observed", severity: "Medium" }],
        },
      },
    });

    expect(proof.stillOpenCount).toBe(1);
    expect(proof.proofStatus).toBe("no-change");
  });

  it("detects new high-priority risk as regression", () => {
    const proof = buildRetestProofReport({
      websiteUrl: "https://example.com",
      beforeScan: {
        id: "before",
        websiteUrl: "https://example.com",
        score: 80,
        report: { topFixes: [] },
      },
      afterScan: {
        id: "after",
        websiteUrl: "https://example.com",
        score: 55,
        report: {
          topFixes: [
            { name: "TLS certificate trust needs review", severity: "High" },
          ],
        },
      },
    });

    expect(proof.newIssueCount).toBe(1);
    expect(proof.proofStatus).toBe("regression-risk");
  });
});
