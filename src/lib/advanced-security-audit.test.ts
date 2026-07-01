import { describe, expect, it } from "vitest";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";

describe("advanced security audit engine", () => {
  it("creates OWASP, ASVS, and evidence mapping", () => {
    const audit = buildAdvancedSecurityAudit({
      score: 80,
      findings: [
        {
          name: "HTTPS is enabled",
          category: "Transport Security",
          status: "pass",
          severity: "Info",
        },
        {
          name: "Content Security Policy header missing",
          category: "Security Headers",
          status: "warning",
          severity: "Medium",
        },
      ],
    });

    expect(audit.owaspTop10).toHaveLength(10);
    expect(audit.asvsControls.length).toBeGreaterThan(0);
    expect(audit.evidenceRecords).toHaveLength(2);
    expect(audit.maturityScore).toBeGreaterThan(0);
  });

  it("does not claim unsafe active testing coverage", () => {
    const audit = buildAdvancedSecurityAudit({
      score: 60,
      findings: [],
    });

    const injection = audit.owaspTop10.find((control) => control.id === "A03");
    expect(injection?.testingDepth).toBe("Authenticated audit needed");
    expect(audit.limitations.join(" ")).toContain(
      "not a full penetration test",
    );
  });
});
