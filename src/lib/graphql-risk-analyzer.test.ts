import { describe, expect, it } from "vitest";
import { runGraphqlRiskAnalyzer } from "@/lib/graphql-risk-analyzer";

describe("GraphQL risk analyzer safety", () => {
  it("blocks when verified scope is missing", async () => {
    const report = await runGraphqlRiskAnalyzer({
      targetUrl: "https://example.com",
      intensity: "light",
      verifiedScope: false,
    });

    expect(report.analyzerStatus).toBe("blocked");
    expect(report.privateTargetBlocked).toBe(true);
  });

  it("blocks localhost targets", async () => {
    const report = await runGraphqlRiskAnalyzer({
      targetUrl: "http://localhost:3000",
      intensity: "light",
      verifiedScope: true,
    });

    expect(report.analyzerStatus).toBe("blocked");
    expect(report.findings[0].category).toBe("Safety");
  });

  it("keeps GraphQL operations blocked by policy", async () => {
    const report = await runGraphqlRiskAnalyzer({
      targetUrl: "http://127.0.0.1",
      intensity: "standard",
      verifiedScope: true,
    });

    expect(report.analyzerPolicy.noGraphqlOperationExecution).toBe(true);
    expect(report.analyzerPolicy.noIntrospectionExecution).toBe(true);
    expect(report.analyzerPolicy.noMutationExecution).toBe(true);
    expect(report.analyzerPolicy.allowedMethods).toEqual(["GET", "HEAD"]);
  });
});
