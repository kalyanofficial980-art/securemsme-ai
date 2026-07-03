import { describe, expect, it } from "vitest";
import {
  buildClientPortalProSections,
  buildRetestItem,
  calculateRetestSummary,
  createProofFingerprint,
  hasUnsafeRetestContent,
  sanitizeProofText,
} from "@/lib/retest-client-portal-pro-engine";

describe("retest client portal pro engine", () => {
  it("sanitizes secrets", () => {
    expect(sanitizeProofText("token=abc123")).toContain("[redacted-secret]");
  });

  it("detects unsafe content", () => {
    expect(hasUnsafeRetestContent("try to bypass login")).toBe(true);
  });

  it("creates stable proof fingerprint", () => {
    expect(createProofFingerprint("same")).toBe(createProofFingerprint("same"));
  });

  it("blocks unsafe retest items", () => {
    const item = buildRetestItem({
      title: "Unsafe",
      safeRetestSteps: "bypass login",
    });
    expect(item.status).toBe("blocked");
  });

  it("calculates summary", () => {
    const summary = calculateRetestSummary([
      buildRetestItem({ title: "A", status: "passed", confidence: "High" }),
      buildRetestItem({ title: "B", status: "failed" }),
      buildRetestItem({ title: "C" }),
    ]);
    expect(summary.total).toBe(3);
    expect(summary.passRate).toBe(33);
  });

  it("builds portal sections", () => {
    const sections = buildClientPortalProSections({
      targetUrl: "https://example.com",
      executiveScore: 80,
      reportReadinessScore: 70,
      fixProgressScore: 60,
      retestPassRate: 50,
      clientReadinessScore: 65,
      portalSummary: "Summary",
      limitationsSummary: "Limitations",
      passed: 2,
      total: 4,
    });
    expect(sections.map((section) => section.sectionKey)).toContain(
      "verified-fix-proof",
    );
  });
});
