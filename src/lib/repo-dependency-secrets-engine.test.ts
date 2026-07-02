import { describe, expect, it } from "vitest";
import {
  analyzeDependencies,
  analyzeSecrets,
  combineRepoRisk,
  maskSecret,
  parsePackageJson,
} from "@/lib/repo-dependency-secrets-engine";

describe("repo dependency secrets engine", () => {
  it("parses package json", () => {
    const result = parsePackageJson(
      JSON.stringify({
        dependencies: { lodash: "^4.17.0", jsonwebtoken: "latest" },
        devDependencies: { vitest: "^1.0.0" },
      }),
    );

    expect(result.items.length).toBe(3);
  });

  it("analyzes risky dependencies", () => {
    const result = analyzeDependencies(
      JSON.stringify({
        dependencies: { jsonwebtoken: "latest" },
      }),
    );

    expect(result.riskyDependencyCount).toBeGreaterThan(0);
    expect(result.dependencyRiskScore).toBeGreaterThan(0);
  });

  it("masks secrets", () => {
    expect(maskSecret("abcdefghijklmnopqrstuvwxyz")).toBe("abcd...wxyz");
  });

  it("detects secrets without exposing raw value", () => {
    const result = analyzeSecrets("API_KEY=abcdefghijklmnopqrstuvwxyz123456");
    expect(result.secretSignalCount).toBe(1);
    expect(result.findings[0].maskedValue).not.toContain(
      "abcdefghijklmnopqrstuvwxyz123456",
    );
  });

  it("combines repo risk", () => {
    const dependency = analyzeDependencies(
      JSON.stringify({ dependencies: { jsonwebtoken: "latest" } }),
    );
    const secret = analyzeSecrets("ghp_abcdefghijklmnopqrstuvwxyz1234567890");
    const combined = combineRepoRisk(dependency, secret);

    expect(combined.latestRiskScore).toBeGreaterThan(0);
  });
});
