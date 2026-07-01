import { describe, expect, it } from "vitest";
import { analyzeInbuiltSignals } from "@/lib/inbuilt-advanced-audit";

const baseFetch = {
  ok: true,
  status: 200,
  headers: {},
  body: "",
};

describe("inbuilt advanced audit", () => {
  it("creates customer-ready evidence and module scores", () => {
    const audit = analyzeInbuiltSignals({
      scannedUrl: "https://example.com",
      home: {
        ...baseFetch,
        url: "https://example.com",
        headers: {
          "content-security-policy": "default-src 'self'",
          "x-frame-options": "DENY",
          "x-content-type-options": "nosniff",
          "strict-transport-security": "max-age=31536000",
          "referrer-policy": "strict-origin-when-cross-origin",
          "permissions-policy": "camera=(), microphone=()",
        },
        body: "<html><body>privacy terms contact</body></html>",
      },
      robots: { ...baseFetch, url: "https://example.com/robots.txt" },
      sitemap: { ...baseFetch, url: "https://example.com/sitemap.xml" },
      securityTxt: {
        ...baseFetch,
        url: "https://example.com/.well-known/security.txt",
      },
      privacy: { ...baseFetch, url: "https://example.com/privacy" },
      terms: { ...baseFetch, url: "https://example.com/terms" },
      contact: { ...baseFetch, url: "https://example.com/contact" },
    });

    expect(audit.auditType).toBe("inbuilt-passive-advanced");
    expect(audit.evidence.length).toBeGreaterThan(8);
    expect(audit.modules.length).toBeGreaterThan(3);
    expect(audit.safeTestingNotice.join(" ")).toContain("No external");
  });

  it("detects missing browser protection controls", () => {
    const audit = analyzeInbuiltSignals({
      scannedUrl: "https://example.com",
      home: {
        ...baseFetch,
        url: "https://example.com",
        headers: {},
        body: "<html><script>console.log('inline')</script></html>",
      },
      robots: {
        ...baseFetch,
        ok: false,
        status: 404,
        url: "https://example.com/robots.txt",
      },
      sitemap: {
        ...baseFetch,
        ok: false,
        status: 404,
        url: "https://example.com/sitemap.xml",
      },
      securityTxt: {
        ...baseFetch,
        ok: false,
        status: 404,
        url: "https://example.com/.well-known/security.txt",
      },
      privacy: {
        ...baseFetch,
        ok: false,
        status: 404,
        url: "https://example.com/privacy",
      },
      terms: {
        ...baseFetch,
        ok: false,
        status: 404,
        url: "https://example.com/terms",
      },
      contact: {
        ...baseFetch,
        ok: false,
        status: 404,
        url: "https://example.com/contact",
      },
    });

    expect(audit.priorityFixes.length).toBeGreaterThan(0);
    expect(
      audit.evidence.some((item) =>
        item.title.includes("Content Security Policy"),
      ),
    ).toBe(true);
  });
});
