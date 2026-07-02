import { describe, expect, it } from "vitest";
import {
  buildSecurityAlertEmail,
  shouldSendSeverity,
} from "@/lib/email-provider";

describe("email provider", () => {
  it("builds safe security alert email", () => {
    const email = buildSecurityAlertEmail({
      websiteUrl: "https://example.com",
      title: "Risk increased",
      severity: "High",
      details: "Monitoring detected a score drop.",
      alertType: "risk-increase",
      scoreDelta: -20,
      riskBefore: "Low risk",
      riskCurrent: "High risk",
      reportUrl: "https://app.example.com/report/1",
    });

    expect(email.subject).toContain("High");
    expect(email.html).toContain("SecureMSME AI Security Alert");
    expect(email.text).toContain("does not claim exploitation");
  });

  it("filters by minimum severity", () => {
    expect(shouldSendSeverity("High", "Medium")).toBe(true);
    expect(shouldSendSeverity("Low", "Medium")).toBe(false);
    expect(shouldSendSeverity("Info", "Info")).toBe(true);
  });
});
