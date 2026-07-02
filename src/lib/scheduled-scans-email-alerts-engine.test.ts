import { describe, expect, it } from "vitest";
import {
  buildEmailTemplate,
  calculateNextRunAt,
  evaluateScheduledRun,
  validateScheduleInput,
} from "@/lib/scheduled-scans-email-alerts-engine";

describe("scheduled scans email alerts engine", () => {
  it("validates schedule input", () => {
    const result = validateScheduleInput({
      targetUrl: "example.com",
      targetName: "Example",
      frequency: "weekly",
      preferredHour: 9,
      alertEmail: "owner@example.com",
      authorizationConfirmed: true,
      emailAlertsEnabled: true,
      riskThreshold: "High",
    });

    expect(result.valid).toBe(true);
    expect(result.normalizedUrl).toBe("https://example.com");
  });

  it("requires authorization", () => {
    const result = validateScheduleInput({
      targetUrl: "example.com",
      targetName: "Example",
      frequency: "weekly",
      preferredHour: 9,
      alertEmail: "owner@example.com",
      authorizationConfirmed: false,
      emailAlertsEnabled: true,
      riskThreshold: "High",
    });

    expect(result.valid).toBe(false);
  });

  it("evaluates high risk scheduled run", () => {
    const result = evaluateScheduledRun(
      {
        latestScans: 1,
        monitoringAlerts: 2,
        highRiskAlerts: 2,
        openDeveloperTasks: 5,
        aiTriageRuns: 1,
      },
      "High",
    );

    expect(result.emailShouldSend).toBe(true);
    expect(["High", "Critical"]).toContain(result.riskLevel);
  });

  it("builds safe email template", () => {
    const template = buildEmailTemplate({
      targetUrl: "https://example.com",
      riskLevel: "High",
      riskScore: 72,
      summary: "High-risk item needs review.",
      safeNextAction: "Assign developer fix and retest.",
      alertType: "high-risk",
    });

    expect(template.subject).toContain("SecureMSME AI");
    expect(template.body).toContain("does not guarantee 100% security");
  });

  it("calculates next run", () => {
    expect(calculateNextRunAt("daily", 9)).toContain("T");
  });
});
