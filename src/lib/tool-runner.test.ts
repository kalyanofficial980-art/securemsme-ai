import { describe, expect, it } from "vitest";
import {
  buildToolJobRows,
  buildToolRunnerReport,
  getToolRegistry,
} from "@/lib/tool-runner";

describe("tool runner architecture", () => {
  it("has implemented and architecture-ready tool modules", () => {
    const tools = getToolRegistry();

    expect(tools.some((tool) => tool.availability === "implemented")).toBe(
      true,
    );
    expect(
      tools.some((tool) => tool.availability === "architecture-ready"),
    ).toBe(true);
  });

  it("blocks verified modules when scope is not verified", () => {
    const report = buildToolRunnerReport({
      websiteUrl: "https://example.com",
      verifiedScope: false,
      report: {
        findings: [
          {
            name: "CSP missing",
            category: "Headers",
            severity: "Medium",
            status: "warning",
            description: "Content-Security-Policy header not found",
          },
        ],
      },
    });

    expect(report.blockedTools).toBeGreaterThan(0);
    expect(report.normalizedEvidence.length).toBeGreaterThan(0);
  });

  it("creates job rows from a report", () => {
    const report = buildToolRunnerReport({
      websiteUrl: "https://example.com",
      scanId: "scan-1",
      verifiedScope: true,
      report: {
        evidenceCalibration: {
          items: [
            {
              title: "Security header missing",
              category: "Headers",
              severity: "Medium",
              status: "confirmed",
              confidence: "High",
              evidence: ["Header not found"],
            },
          ],
        },
      },
    });

    const rows = buildToolJobRows({
      userId: "user-1",
      websiteId: "website-1",
      scanId: "scan-1",
      report,
    });

    expect(rows.runRows.length).toBe(report.tools.length);
    expect(rows.evidenceRows.length).toBeGreaterThan(0);
  });
});
