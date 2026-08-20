import { describe, expect, it } from "vitest";
import type { ScanFinding, ScanReport } from "@/lib/scanner";
import { normalizeScanReport } from "@/lib/report-normalization";

function makeReport(findings: ScanFinding[]): ScanReport {
  return {
    url: "https://example.com",
    normalizedUrl: "https://example.com/",
    checkedAt: "2026-08-20T00:00:00.000Z",
    findings,
    raw: {},
  };
}

describe("normalizeScanReport DMARC accuracy", () => {
  it("does not double-penalize a missing DMARC record as missing policy strength", () => {
    const report = makeReport([
      {
        name: "DMARC record",
        status: "fail",
        message: "DMARC record was not found.",
        points: 0,
        maxPoints: 15,
      },
      {
        name: "DMARC policy strength",
        status: "fail",
        message: "DMARC policy was not found or could not be read.",
        points: 0,
        maxPoints: 15,
      },
    ]);

    const normalized = normalizeScanReport(report);

    expect(normalized.findings).toHaveLength(1);
    expect(normalized.findings[0]).toMatchObject({
      name: "DMARC record",
      status: "fail",
      points: 0,
      maxPoints: 15,
    });
  });

  it("keeps policy-strength guidance when a DMARC record exists but policy is weak", () => {
    const report = makeReport([
      {
        name: "DMARC record",
        status: "pass",
        message: "DMARC record found.",
        points: 15,
        maxPoints: 15,
      },
      {
        name: "DMARC policy strength",
        status: "warning",
        message: "DMARC policy is monitoring only.",
        points: 5,
        maxPoints: 15,
      },
    ]);

    const normalized = normalizeScanReport(report);

    expect(normalized.findings.map((finding) => finding.name)).toEqual([
      "DMARC record",
      "DMARC policy strength",
    ]);
    expect(normalized.findings[1]).toMatchObject({
      status: "warning",
      points: 5,
      maxPoints: 15,
    });
  });
});
