import { describe, expect, it } from "vitest";
import { runAdvancedCrawlerEngine } from "@/lib/advanced-crawler-engine";

describe("advanced crawler safety", () => {
  it("blocks when verified scope is missing", async () => {
    const report = await runAdvancedCrawlerEngine({
      targetUrl: "https://example.com",
      intensity: "light",
      verifiedScope: false,
    });

    expect(report.crawlerStatus).toBe("blocked");
    expect(report.privateTargetBlocked).toBe(true);
  });

  it("blocks localhost targets", async () => {
    const report = await runAdvancedCrawlerEngine({
      targetUrl: "http://localhost:3000",
      intensity: "light",
      verifiedScope: true,
    });

    expect(report.crawlerStatus).toBe("blocked");
    expect(report.normalizedEvidenceSeeds[0].evidenceKey).toBe(
      "advanced-crawler-safety-block",
    );
  });

  it("has safe crawler policy", async () => {
    const report = await runAdvancedCrawlerEngine({
      targetUrl: "http://127.0.0.1",
      intensity: "standard",
      verifiedScope: true,
    });

    expect(report.crawlerPolicy.noFormSubmission).toBe(true);
    expect(report.crawlerPolicy.noMutationRequests).toBe(true);
    expect(report.crawlerPolicy.allowedMethods).toEqual(["GET", "HEAD"]);
  });
});
