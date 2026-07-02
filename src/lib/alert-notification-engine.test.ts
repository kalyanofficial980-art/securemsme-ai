import { describe, expect, it } from "vitest";
import {
  buildAlertNotifications,
  normalizeAlertSeverity,
  shouldSendAlert,
} from "@/lib/alert-notification-engine";

describe("alert notification engine", () => {
  it("normalizes severities", () => {
    expect(normalizeAlertSeverity("high risk")).toBe("High");
    expect(normalizeAlertSeverity("critical")).toBe("Critical");
    expect(normalizeAlertSeverity("unknown")).toBe("Info");
  });

  it("filters alerts by severity and type", () => {
    expect(
      shouldSendAlert({
        event: {
          id: "1",
          event_type: "score-drop",
          severity: "High",
          title: "Drop",
          details: "Score dropped",
        },
        minSeverity: "Medium",
        alertTypes: ["score-drop"],
      }),
    ).toBe(true);

    expect(
      shouldSendAlert({
        event: {
          id: "1",
          event_type: "baseline-updated",
          severity: "Info",
          title: "Info",
          details: "Stable",
        },
        minSeverity: "Medium",
        alertTypes: ["score-drop"],
      }),
    ).toBe(false);
  });

  it("builds in-app and email notifications", () => {
    const alerts = buildAlertNotifications({
      websiteUrl: "https://example.com",
      scanId: "scan-1",
      events: [
        {
          id: "event-1",
          event_type: "risk-increase",
          severity: "High",
          title: "Risk increased",
          details: "Risk increased",
        },
      ],
      minSeverity: "Medium",
      alertTypes: ["risk-increase"],
      inAppEnabled: true,
      emailEnabled: true,
      recipientEmail: "owner@example.com",
    });

    expect(alerts).toHaveLength(2);
    expect(alerts.map((alert) => alert.channel)).toContain("email");
    expect(alerts.map((alert) => alert.channel)).toContain("in-app");
  });
});
