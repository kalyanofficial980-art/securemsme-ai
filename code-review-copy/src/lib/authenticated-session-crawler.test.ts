import { describe, expect, it } from "vitest";
import { runAuthenticatedSessionCrawler } from "@/lib/authenticated-session-crawler";

describe("authenticated session-safe crawler", () => {
  it("blocks without verified scope", async () => {
    const report = await runAuthenticatedSessionCrawler({
      targetUrl: "https://example.com",
      intensity: "light",
      verifiedScope: false,
      approvedRequest: true,
    });

    expect(report.runStatus).toBe("blocked");
    expect(report.privateTargetBlocked).toBe(true);
  });

  it("blocks without approved request", async () => {
    const report = await runAuthenticatedSessionCrawler({
      targetUrl: "https://example.com",
      intensity: "light",
      verifiedScope: true,
      approvedRequest: false,
    });

    expect(report.runStatus).toBe("blocked");
    expect(report.normalizedEvidenceSeeds[0].evidenceKey).toBe(
      "authenticated-crawler-safety-block",
    );
  });

  it("uses safe authenticated crawler policy", async () => {
    const report = await runAuthenticatedSessionCrawler({
      targetUrl: "http://127.0.0.1",
      intensity: "standard",
      verifiedScope: true,
      approvedRequest: true,
    });

    expect(report.crawlerPolicy.noFormSubmission).toBe(true);
    expect(report.crawlerPolicy.noMutationRequests).toBe(true);
    expect(report.crawlerPolicy.noPasswordStorage).toBe(true);
    expect(report.crawlerPolicy.noSessionStorage).toBe(true);
    expect(report.crawlerPolicy.noPrivateBodyStorage).toBe(true);
    expect(report.crawlerPolicy.allowedMethods).toEqual(["GET"]);
  });
});
