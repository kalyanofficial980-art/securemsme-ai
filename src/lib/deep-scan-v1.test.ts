import { describe, expect, it } from "vitest";
import {
  buildDeepScanV1OwaspCoverage,
  runDeepScanV1,
} from "@/lib/deep-scan-v1";

describe("Deep Scan V1 truth and coverage", () => {
  it("blocks before network modules when verified scope is missing", async () => {
    const report = await runDeepScanV1({
      targetUrl: "https://example.com",
      verifiedScope: false,
      permissionAccepted: true,
      baseReport: {},
    });

    expect(report.status).toBe("blocked");
    expect(report.authorized).toBe(false);
    expect(report.findings).toHaveLength(0);
    expect(report.owaspTop10Coverage).toHaveLength(10);
    expect(report.owaspTop10Coverage.every((item) => item.status === "inconclusive")).toBe(true);
  });

  it("never presents injection or SSRF as pass from safe public coverage", () => {
    const coverage = buildDeepScanV1OwaspCoverage({
      truthVerified: true,
      crawlerCompleted: true,
      apiCompleted: true,
      browserCompleted: true,
      authorizedCompleted: true,
      cveTechnologyCount: 2,
      apiEndpointCount: 4,
      browserFindingCount: 3,
      attackSurfaceRiskSignals: 2,
    });

    expect(coverage.find((item) => item.id === "A03")?.status).toBe("not-assessed");
    expect(coverage.find((item) => item.id === "A10")?.status).toBe("not-assessed");
    expect(coverage.find((item) => item.id === "A05")?.status).toBe("assessed");
    expect(coverage.some((item) => (item.status as string) === "pass")).toBe(false);
  });

  it("marks all OWASP controls inconclusive when representative evidence is unavailable", () => {
    const coverage = buildDeepScanV1OwaspCoverage({
      truthVerified: false,
      crawlerCompleted: false,
      apiCompleted: false,
      browserCompleted: false,
      authorizedCompleted: false,
      cveTechnologyCount: 0,
      apiEndpointCount: 0,
      browserFindingCount: 0,
      attackSurfaceRiskSignals: 0,
    });

    expect(coverage).toHaveLength(10);
    expect(coverage.every((item) => item.status === "inconclusive")).toBe(true);
  });
});
