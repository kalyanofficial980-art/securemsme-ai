import { describe, expect, it } from "vitest";
import { runAdvancedBrowserSecurityAnalyzer } from "@/lib/browser-security-analyzer";

describe("advanced browser security analyzer safety", () => {
  it("blocks when verified scope is missing", async () => {
    const report = await runAdvancedBrowserSecurityAnalyzer({
      targetUrl: "https://example.com",
      intensity: "light",
      verifiedScope: false,
    });

    expect(report.analyzerStatus).toBe("blocked");
    expect(report.privateTargetBlocked).toBe(true);
  });

  it("blocks localhost targets", async () => {
    const report = await runAdvancedBrowserSecurityAnalyzer({
      targetUrl: "http://localhost:3000",
      intensity: "light",
      verifiedScope: true,
    });

    expect(report.analyzerStatus).toBe("blocked");
    expect(report.findings[0].category).toBe("Safety");
  });

  it("uses safe policy only", async () => {
    const report = await runAdvancedBrowserSecurityAnalyzer({
      targetUrl: "http://127.0.0.1",
      intensity: "standard",
      verifiedScope: true,
    });

    expect(report.analyzerPolicy.noFormSubmission).toBe(true);
    expect(report.analyzerPolicy.noMutationRequests).toBe(true);
    expect(report.analyzerPolicy.noExploitPayloads).toBe(true);
    expect(report.analyzerPolicy.allowedMethods).toEqual(["GET"]);
  });
});
