import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import type { ScanReport } from "@/lib/scanner";
import { safeFetchPublicUrl } from "@/lib/security/ssrf";
import { applyReportAccuracyPolicy } from "@/lib/report-accuracy-policy";

vi.mock("@/lib/security/ssrf", () => ({
  safeFetchPublicUrl: vi.fn(),
}));

const mockedFetch = vi.mocked(safeFetchPublicUrl);

function responseFor(url: string) {
  const pathname = new URL(url).pathname;

  if (["/legal/privacy", "/legal/terms", "/contact", "/robots.txt", "/sitemap.xml"].includes(pathname)) {
    return new Response("ok", { status: 200 });
  }

  if (pathname === "/admin") {
    return new Response(null, {
      status: 307,
      headers: { location: "/login" },
    });
  }

  if (pathname.startsWith("/wp-admin")) {
    return new Response("blocked", { status: 403 });
  }

  return new Response("missing", { status: 404 });
}

function baseReport(url = "https://demo.vercel.app/"): ScanReport {
  return {
    url,
    normalizedUrl: url,
    checkedAt: new Date(0).toISOString(),
    findings: [
      { name: "DMARC record", status: "fail", message: "missing", points: 0, maxPoints: 15 },
      { name: "DMARC policy strength", status: "fail", message: "missing", points: 0, maxPoints: 15 },
      { name: "SPF record", status: "warning", message: "missing", points: 4, maxPoints: 15 },
      { name: "MX records", status: "warning", message: "missing", points: 3, maxPoints: 10 },
      { name: "Privacy policy", status: "fail", message: "missing", points: 0, maxPoints: 10 },
      { name: "Terms page", status: "warning", message: "missing", points: 0, maxPoints: 5 },
      { name: "Contact page", status: "pass", message: "found", points: 5, maxPoints: 5 },
      { name: "robots.txt", status: "warning", message: "missing", points: 2, maxPoints: 5 },
      { name: "sitemap.xml", status: "warning", message: "missing", points: 2, maxPoints: 5 },
      { name: "Common admin/login paths", status: "fail", message: "2 exposed", points: 0, maxPoints: 15 },
    ],
    raw: {
      hygiene: {
        robotsTxt: false,
        sitemapXml: false,
        securityTxt: true,
        sensitiveFiles: [],
        mixedContentCount: 0,
        cookieCount: 0,
        insecureCookieCount: 0,
      },
    },
  };
}

function baseAudit(): InbuiltAdvancedAudit {
  return {
    version: "test",
    generatedAt: new Date(0).toISOString(),
    auditType: "inbuilt-passive-advanced",
    scannedUrl: "https://demo.vercel.app/",
    customerFriendlyName: "Inbuilt advanced audit",
    overallScore: 97,
    maturityLevel: "Advanced",
    businessReadiness: "Premium ready",
    modules: [],
    evidence: [
      {
        id: "IB-001",
        module: "Browser Protection",
        title: "CSP present but weak",
        url: "https://demo.vercel.app/",
        status: "warning",
        severity: "Medium",
        evidence: "unsafe-inline",
        customerImpact: "Partial protection.",
        fix: "Tighten CSP.",
      },
      {
        id: "IB-002",
        module: "Public Asset Governance",
        title: "robots.txt missing",
        url: "https://demo.vercel.app/robots.txt",
        status: "warning",
        severity: "Low",
        evidence: "403",
        customerImpact: "Not verified.",
        fix: "Add robots.txt.",
      },
      {
        id: "IB-003",
        module: "Public Asset Governance",
        title: "sitemap.xml missing",
        url: "https://demo.vercel.app/sitemap.xml",
        status: "warning",
        severity: "Low",
        evidence: "403",
        customerImpact: "Not verified.",
        fix: "Add sitemap.xml.",
      },
      {
        id: "IB-004",
        module: "Customer Trust",
        title: "Privacy signal present",
        url: "https://demo.vercel.app/",
        status: "pass",
        severity: "Info",
        evidence: "Homepage mentions privacy.",
        customerImpact: "Signal only.",
        fix: "Keep current.",
      },
      {
        id: "IB-005",
        module: "Customer Trust",
        title: "Terms signal present",
        url: "https://demo.vercel.app/",
        status: "pass",
        severity: "Info",
        evidence: "Homepage mentions terms.",
        customerImpact: "Signal only.",
        fix: "Keep current.",
      },
      {
        id: "IB-006",
        module: "Customer Trust",
        title: "Contact signal present",
        url: "https://demo.vercel.app/",
        status: "pass",
        severity: "Info",
        evidence: "Homepage mentions contact.",
        customerImpact: "Signal only.",
        fix: "Keep current.",
      },
    ],
    customerSummary: "Strong public security and trust posture.",
    priorityFixes: [],
    safeTestingNotice: ["Only safe public evidence collection."],
  };
}

describe("report accuracy policy", () => {
  beforeEach(() => {
    mockedFetch.mockImplementation(async (url) => responseFor(String(url)));
  });

  it("removes managed-host email false positives and verifies real legal routes", async () => {
    const result = await applyReportAccuracyPolicy(baseReport(), baseAudit());
    const names = result.report.findings.map((finding) => finding.name);

    expect(names).not.toContain("DMARC record");
    expect(names).not.toContain("SPF record");
    expect(names).not.toContain("MX records");
    expect(
      result.report.findings.find((finding) => finding.name === "Privacy policy")?.status,
    ).toBe("pass");
    expect(
      result.report.findings.find((finding) => finding.name === "Terms page")?.status,
    ).toBe("pass");
    expect(
      result.report.findings.find((finding) => finding.name === "Common admin/login paths")?.status,
    ).toBe("pass");
  });

  it("keeps module warnings visible instead of calling every high score PASS", async () => {
    const result = await applyReportAccuracyPolicy(baseReport(), baseAudit());
    const browserModule = result.inbuiltAdvancedAudit.modules.find(
      (module) => module.name === "Browser Protection",
    );
    const trustModule = result.inbuiltAdvancedAudit.modules.find(
      (module) => module.name === "Customer Trust",
    );

    expect(browserModule?.status).toBe("warning");
    expect(trustModule?.status).toBe("pass");
    expect(result.inbuiltAdvancedAudit.businessReadiness).toBe("Trust ready");
    expect(result.inbuiltAdvancedAudit.customerSummary).toContain("not a security certification");
  });

  it("keeps email checks for customer-controlled custom domains", async () => {
    const report = baseReport("https://example.com/");
    const result = await applyReportAccuracyPolicy(report, {
      ...baseAudit(),
      scannedUrl: "https://example.com/",
    });

    expect(result.report.findings.some((finding) => finding.name === "DMARC record")).toBe(true);
  });
});
