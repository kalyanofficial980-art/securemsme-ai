import { describe, expect, it } from "vitest";
import { runApiSecurityScanner } from "@/lib/api-security-scanner";

describe("API security scanner safety", () => {
  it("blocks when verified scope is missing", async () => {
    const report = await runApiSecurityScanner({
      targetUrl: "https://example.com",
      intensity: "light",
      verifiedScope: false,
    });

    expect(report.scannerStatus).toBe("blocked");
    expect(report.privateTargetBlocked).toBe(true);
  });

  it("blocks localhost targets", async () => {
    const report = await runApiSecurityScanner({
      targetUrl: "http://localhost:3000",
      intensity: "light",
      verifiedScope: true,
    });

    expect(report.scannerStatus).toBe("blocked");
    expect(report.normalizedEvidenceSeeds[0].evidenceKey).toBe(
      "api-scanner-safety-block",
    );
  });

  it("keeps mutation execution blocked", async () => {
    const report = await runApiSecurityScanner({
      targetUrl: "http://127.0.0.1",
      intensity: "standard",
      verifiedScope: true,
    });

    expect(report.scannerPolicy.noMutationRequests).toBe(true);
    expect(report.scannerPolicy.blockedExecutionMethods).toEqual([
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ]);
  });
});
