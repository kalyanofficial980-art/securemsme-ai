import { describe, expect, it } from "vitest";
import {
  buildEnginePlan,
  calculatePipelineCoverage,
  deriveJobStatus,
  normalizeScanMode,
  simulateSafeEngineResult,
} from "@/lib/scan-orchestrator-v2";

describe("scan orchestrator v2", () => {
  it("normalizes scan mode", () => {
    expect(normalizeScanMode("safe-deep")).toBe("safe-deep");
    expect(normalizeScanMode("bad")).toBe("safe-standard");
  });

  it("builds safe light plan with fewer engines", () => {
    const plan = buildEnginePlan({ mode: "safe-light" });
    expect(plan.length).toBeGreaterThan(0);
    expect(
      plan.some((engine) => engine.engineKey === "authenticated-safe-review"),
    ).toBe(false);
  });

  it("skips authenticated engine without approval", () => {
    const plan = buildEnginePlan({
      mode: "authenticated-safe",
      verifiedScope: false,
      authenticatedContextApproved: false,
    });

    const authEngine = plan.find(
      (engine) => engine.engineKey === "authenticated-safe-review",
    );
    expect(authEngine?.plannedStatus).toBe("skipped");
  });

  it("calculates coverage and status", () => {
    const coverage = calculatePipelineCoverage([
      {
        engineKey: "a",
        engineName: "A",
        engineGroup: "x",
        engineType: "safe",
        runStatus: "completed",
        coverageWeight: 10,
      },
      {
        engineKey: "b",
        engineName: "B",
        engineGroup: "x",
        engineType: "safe",
        runStatus: "queued",
        coverageWeight: 10,
      },
    ]);

    expect(coverage.coveragePercent).toBe(50);
    expect(
      deriveJobStatus([
        {
          engineKey: "a",
          engineName: "A",
          engineGroup: "x",
          engineType: "safe",
          runStatus: "completed",
          coverageWeight: 10,
        },
        {
          engineKey: "b",
          engineName: "B",
          engineGroup: "x",
          engineType: "safe",
          runStatus: "queued",
          coverageWeight: 10,
        },
      ]),
    ).toBe("running");
  });

  it("simulates safe engine metadata", () => {
    const result = simulateSafeEngineResult(
      {
        engineKey: "browser-security",
        engineName: "Browser Security Engine",
        engineGroup: "browser",
        engineType: "browser-security",
        description: "",
        defaultEnabled: true,
        requiresVerifiedScope: false,
        requiresAuthenticatedContext: false,
        safeMethods: ["GET"],
        timeoutSeconds: 30,
        maxRetries: 1,
        weight: 12,
      },
      "https://example.com",
    );

    expect(result.status).toBe("completed");
    expect(result.observationsCount).toBeGreaterThan(0);
  });
});
