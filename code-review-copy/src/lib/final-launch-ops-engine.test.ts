import { describe, expect, it } from "vitest";
import {
  buildLaunchNotificationDraft,
  buildLeadCsv,
  detectSensitiveText,
  launchReadinessScore,
  scorePublicFormRisk,
} from "@/lib/final-launch-ops-engine";

describe("final launch ops engine", () => {
  it("detects sensitive text", () => {
    expect(detectSensitiveText("password: test")).toBe(true);
  });

  it("scores honeypot as manual review", () => {
    expect(
      scorePublicFormRisk({
        email: "bot@example.com",
        message: "hello",
        honeypot: "filled",
      }).decision,
    ).toBe("manual-review");
  });

  it("builds notification draft", () => {
    const draft = buildLaunchNotificationDraft({
      toEmail: "Founder@Example.com",
      subject: "Hi",
      body: "Safe body",
    });
    expect(draft.toEmail).toBe("founder@example.com");
  });

  it("calculates readiness score", () => {
    const result = launchReadinessScore([
      { check_status: "done", priority: "critical" },
      { check_status: "pending", priority: "high" },
      { check_status: "later", priority: "medium" },
    ]);
    expect(result.score).toBeGreaterThan(0);
  });

  it("builds csv", () => {
    expect(buildLeadCsv([{ type: "demo", email: "a@example.com" }])).toContain(
      "a@example.com",
    );
  });
});
