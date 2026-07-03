import { describe, expect, it } from "vitest";
import {
  getPassiveWorkerPolicy,
  runPassiveZapStyleWorker,
} from "@/lib/passive-zap-worker";

describe("passive zap style worker", () => {
  it("uses stricter limits before verification", () => {
    const publicPolicy = getPassiveWorkerPolicy(false);
    const verifiedPolicy = getPassiveWorkerPolicy(true);

    expect(publicPolicy.maxPages).toBeLessThan(verifiedPolicy.maxPages);
    expect(publicPolicy.allowedMethods).toContain("GET");
    expect(publicPolicy.blockedActions.join(" ")).toContain("Exploit");
  });

  it("creates passive alerts from report evidence", () => {
    const report = runPassiveZapStyleWorker({
      websiteUrl: "https://example.com",
      verifiedScope: false,
      report: {
        findings: [
          {
            name: "Content Security Policy missing",
            category: "Headers",
            severity: "Medium",
            description: "Content-Security-Policy header not found",
          },
        ],
      },
    });

    expect(report.pagesObserved).toBeGreaterThan(0);
    expect(report.alertsObserved).toBeGreaterThan(0);
    expect(report.normalizedEvidence.length).toBeGreaterThan(0);
  });

  it("blocks sensitive validation before verified scope", () => {
    const report = runPassiveZapStyleWorker({
      websiteUrl: "https://example.com",
      verifiedScope: false,
      report: {
        vulnerabilityIntelligence: {
          findings: [
            {
              title: "Debug file signal",
              category: "Attack surface",
              severity: "High",
              evidence: ["/.env public path signal"],
            },
          ],
        },
      },
    });

    expect(report.alerts.some((alert) => alert.status === "blocked")).toBe(
      true,
    );
  });
});
