import { describe, expect, it } from "vitest";
import type { ScanReport } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";

function report(findings: ScanReport["findings"]): ScanReport {
  return {
    url: "https://example.com",
    normalizedUrl: "https://example.com/",
    checkedAt: new Date(0).toISOString(),
    findings,
    raw: {},
  };
}

describe("Security Score v2", () => {
  it("keeps legal and email checks supplemental to the canonical security score", () => {
    const result = calculateScore(
      report([
        { name: "HTTPS / SSL", status: "pass", message: "HTTPS verified", points: 10, maxPoints: 10 },
        { name: "Security headers", status: "pass", message: "4/4 found", points: 20, maxPoints: 20 },
        { name: "HSTS", status: "pass", message: "present", points: 10, maxPoints: 10 },
        { name: "Privacy policy", status: "fail", message: "missing", points: 0, maxPoints: 10 },
        { name: "DMARC record", status: "fail", message: "missing", points: 0, maxPoints: 15 },
      ]),
    );
    expect(result.score).toBe(100);
    expect(result.riskLevel).toBe("Low");
    expect(result.severityCounts.high).toBe(0);
    expect(result.supplementalScores.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Trust and privacy", "Email security"]),
    );
  });

  it("excludes inconclusive checks from penalties and prevents a low-risk conclusion", () => {
    const result = calculateScore(
      report([
        { name: "HTTPS / SSL", status: "pass", message: "HTTPS verified", points: 10, maxPoints: 10 },
        { name: "Security headers", status: "pass", message: "4/4 found", points: 20, maxPoints: 20 },
        { name: "SSL certificate expiry", status: "fail", message: "SSL certificate details could not be read.", points: 0, maxPoints: 15 },
      ]),
    );
    expect(result.score).toBe(100);
    expect(result.riskLevel).toBe("Medium");
    expect(result.inconclusiveChecks).toContain("SSL certificate expiry");
    expect(result.severityCounts.high).toBe(0);
  });

  it("treats only evidence-confirmed sensitive-file exposure as critical", () => {
    const result = calculateScore(
      report([
        {
          name: "Sensitive public files",
          status: "fail",
          message: "Verified content signature",
          points: 0,
          maxPoints: 15,
          truth: "verified",
        } as ScanReport["findings"][number] & { truth: "verified" },
        { name: "HTTPS / SSL", status: "pass", message: "HTTPS verified", points: 10, maxPoints: 10 },
      ]),
    );
    expect(result.riskLevel).toBe("High");
    expect(result.severityCounts.critical).toBe(1);
  });
});
