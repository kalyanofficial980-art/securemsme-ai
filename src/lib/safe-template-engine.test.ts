import { describe, expect, it } from "vitest";
import {
  getSafeTemplateCatalog,
  runSafeTemplateEngine,
} from "@/lib/safe-template-engine";

describe("safe template engine", () => {
  it("has safe templates and unsafe blocker", () => {
    const catalog = getSafeTemplateCatalog();

    expect(catalog.length).toBeGreaterThan(5);
    expect(catalog.some((template) => template.unsafeBlocked)).toBe(true);
  });

  it("matches public evidence from report", () => {
    const report = runSafeTemplateEngine({
      websiteUrl: "https://example.com",
      verifiedScope: false,
      report: {
        findings: [
          {
            name: "Content Security Policy missing",
            category: "Headers",
            severity: "Medium",
            description: "Content-Security-Policy header not found",
          },
        ],
      },
    });

    expect(report.matchedTemplates).toBeGreaterThan(0);
    expect(report.normalizedEvidence.length).toBeGreaterThan(0);
  });

  it("blocks verified templates when scope is not verified", () => {
    const report = runSafeTemplateEngine({
      websiteUrl: "https://example.com",
      verifiedScope: false,
      report: {
        vulnerabilityIntelligence: {
          findings: [
            {
              title: "Swagger UI exposed",
              category: "API surface",
              severity: "Medium",
              evidence: ["/swagger-ui returned public signal"],
            },
          ],
        },
      },
    });

    expect(report.blockedTemplates).toBeGreaterThan(0);
  });
});
