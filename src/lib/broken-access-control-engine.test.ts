import { describe, expect, it } from "vitest";
import { runBrokenAccessControlSignalEngine } from "@/lib/broken-access-control-engine";

describe("broken access control signal engine safety", () => {
  it("blocks without verified scope", async () => {
    const report = await runBrokenAccessControlSignalEngine({
      targetUrl: "https://example.com",
      intensity: "light",
      verifiedScope: false,
      approvedRequest: true,
    });

    expect(report.reviewStatus).toBe("blocked");
    expect(report.privateTargetBlocked).toBe(true);
  });

  it("blocks without approved request", async () => {
    const report = await runBrokenAccessControlSignalEngine({
      targetUrl: "https://example.com",
      intensity: "light",
      verifiedScope: true,
      approvedRequest: false,
    });

    expect(report.reviewStatus).toBe("blocked");
    expect(report.summary.blockedRouteCount).toBe(1);
  });

  it("keeps access-control review metadata-only", async () => {
    const report = await runBrokenAccessControlSignalEngine({
      targetUrl: "http://127.0.0.1",
      intensity: "standard",
      verifiedScope: true,
      approvedRequest: true,
    });

    expect(report.reviewPolicy.metadataOnly).toBe(true);
    expect(report.reviewPolicy.noMutationRequests).toBe(true);
    expect(report.reviewPolicy.noSessionStorage).toBe(true);
    expect(report.reviewPolicy.noPrivateBodyStorage).toBe(true);
    expect(report.reviewPolicy.allowedMethods).toEqual(["GET"]);
  });
});
