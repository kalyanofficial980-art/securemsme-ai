import { describe, expect, it } from "vitest";
import {
  INTERNATIONAL_MODULE_REGISTRY,
  buildInternationalSecurityEnginePlan,
  classifyWebsite,
} from "@/lib/international-security-engine";

describe("international security engine core", () => {
  it("has international module registry", () => {
    expect(INTERNATIONAL_MODULE_REGISTRY.length).toBeGreaterThan(5);
    expect(
      INTERNATIONAL_MODULE_REGISTRY.map((module) => module.moduleId),
    ).toContain("api-discovery-foundation");
  });

  it("classifies WordPress/WooCommerce as ecommerce", () => {
    const classification = classifyWebsite({
      targetUrl: "https://example.com",
      report: { findings: ["WordPress wp-content WooCommerce checkout cart"] },
    });

    expect(classification.siteType).toBe("ecommerce");
    expect(classification.technologyHints).toContain("WordPress");
  });

  it("blocks verified and authenticated modules without scope", () => {
    const plan = buildInternationalSecurityEnginePlan({
      targetUrl: "https://example.com",
      verifiedScope: false,
      authenticatedScope: false,
    });

    expect(plan.selectedModules.length).toBeGreaterThan(0);
    expect(plan.blockedModules.length).toBeGreaterThan(0);
    expect(plan.normalizedEvidenceSeeds.length).toBeGreaterThan(0);
  });

  it("selects more modules with verified scope", () => {
    const publicPlan = buildInternationalSecurityEnginePlan({
      targetUrl: "https://example.com",
      verifiedScope: false,
    });
    const verifiedPlan = buildInternationalSecurityEnginePlan({
      targetUrl: "https://example.com",
      verifiedScope: true,
    });

    expect(verifiedPlan.selectedModules.length).toBeGreaterThan(
      publicPlan.selectedModules.length,
    );
    expect(verifiedPlan.coverageMatrix.coverageScore).toBeGreaterThanOrEqual(
      publicPlan.coverageMatrix.coverageScore,
    );
  });
});
