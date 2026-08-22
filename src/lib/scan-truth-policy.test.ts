import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import type { ScanReport } from "@/lib/scanner";
import { applyReportAccuracyPolicy } from "@/lib/report-accuracy-policy";
import { applyReportTruthPolicy } from "@/lib/scan-truth-policy";
import { safeFetchPublicUrl } from "@/lib/security/ssrf";

vi.mock("@/lib/report-accuracy-policy", () => ({
  applyReportAccuracyPolicy: vi.fn(),
}));

vi.mock("@/lib/security/ssrf", () => ({
  safeFetchPublicUrl: vi.fn(),
}));

const mockedAccuracy = vi.mocked(applyReportAccuracyPolicy);
const mockedFetch = vi.mocked(safeFetchPublicUrl);

const audit = {
  version: "test",
  generatedAt: new Date(0).toISOString(),
  auditType: "inbuilt-passive-advanced",
  scannedUrl: "https://example.com/",
  customerFriendlyName: "Test audit",
  overallScore: 100,
  maturityLevel: "Advanced",
  businessReadiness: "Trust ready",
  modules: [],
  evidence: [],
  customerSummary: "Test",
  priorityFixes: [],
  safeTestingNotice: [],
} as InbuiltAdvancedAudit;

function report(): ScanReport {
  return {
    url: "https://example.com/",
    normalizedUrl: "https://example.com/",
    checkedAt: new Date(0).toISOString(),
    findings: [
      {
        name: "Security headers",
        status: "pass",
        message: "4/4 important browser security headers found.",
        points: 20,
        maxPoints: 20,
      },
    ],
    raw: {
      finalStatus: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        server: "example",
      },
      hygiene: {
        robotsTxt: true,
        sitemapXml: true,
        securityTxt: true,
        sensitiveFiles: [],
        mixedContentCount: 0,
        cookieCount: 0,
        insecureCookieCount: 0,
      },
    },
  };
}

describe("scan truth policy representative homepage reuse", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedAccuracy.mockImplementation(async (inputReport, inputAudit) => ({
      report: inputReport,
      inbuiltAdvancedAudit: inputAudit,
      corrections: [],
    }));
  });

  it("uses the initial observed homepage instead of issuing a second truth probe", async () => {
    const result = await applyReportTruthPolicy(report(), audit);

    expect(result.report.truthSummary.representativeHomepage).toBe(true);
    expect(result.report.truthSummary.homepageEvidenceSource).toBe("initial-observation");
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
