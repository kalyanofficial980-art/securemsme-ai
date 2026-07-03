import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  evaluateSeoPage,
  normalizeAnalyticsInput,
  sanitizeReferrer,
  summarizeSeoReadiness,
} from "@/lib/seo-launch-analytics-engine";

describe("seo launch analytics engine", () => {
  it("creates absolute url", () => {
    expect(absoluteUrl("/pricing")).toContain("/pricing");
  });

  it("sanitizes referrer", () => {
    expect(sanitizeReferrer("https://example.com/path?token=secret")).toBe(
      "https://example.com/path",
    );
  });

  it("normalizes analytics input", () => {
    const result = normalizeAnalyticsInput({
      eventType: "page-view",
      sourcePath: "pricing",
      referrerSafe: "https://example.com/a?x=1",
    });

    expect(result.sourcePath).toBe("/pricing");
    expect(result.privacyMode).toBe("no-cookie");
  });

  it("evaluates SEO page", () => {
    const checks = evaluateSeoPage({
      path: "/demo",
      title: "Request SecureMSME AI Demo",
      description:
        "Request a demo for authorized website security review workflow with client-safe reports and developer remediation guidance.",
      priority: 0.8,
      changeFrequency: "weekly",
      indexable: true,
    });

    expect(checks.length).toBeGreaterThan(0);
  });

  it("summarizes readiness", () => {
    const summary = summarizeSeoReadiness();
    expect(summary.score).toBeGreaterThan(0);
  });
});
