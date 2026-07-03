import { describe, expect, it } from "vitest";
import {
  buildSafeReplyDraft,
  buildSupportSummary,
  isSupportEmail,
  normalizeSupportWebsiteUrl,
  sanitizeSupportMessage,
  supportScore,
} from "@/lib/support-lead-reply-engine";

describe("support lead reply engine", () => {
  it("validates email", () => {
    expect(isSupportEmail("founder@example.com")).toBe(true);
    expect(isSupportEmail("wrong")).toBe(false);
  });

  it("normalizes website url", () => {
    expect(normalizeSupportWebsiteUrl("example.com")).toBe(
      "https://example.com",
    );
  });

  it("scores support ticket", () => {
    const score = supportScore({
      fullName: "Kalyan",
      email: "kalyan@example.com",
      companyName: "SecureMSME",
      websiteUrl: "securemsme.ai",
      topic: "agency",
      priority: "high",
      message:
        "Need agency demo and pricing support for multiple client reports.",
    });

    expect(score).toBeGreaterThan(50);
  });

  it("sanitizes sensitive message", () => {
    expect(sanitizeSupportMessage("password: abc123")).toContain("[removed]");
  });

  it("builds safe reply draft", () => {
    const draft = buildSafeReplyDraft({
      fullName: "Founder",
      companyName: "MSME",
      toEmail: "founder@example.com",
      topic: "demo-follow-up",
      requestedPlan: "Growth",
      primaryNeed: "developer fixes",
      websiteUrl: "example.com",
    });

    expect(draft.body).toContain("do not send passwords");
    expect(draft.safetyStatus).toBe("safe-draft");
  });

  it("builds support summary", () => {
    const summary = buildSupportSummary(
      {
        fullName: "Founder",
        email: "founder@example.com",
        companyName: "MSME",
        websiteUrl: "example.com",
        topic: "pricing",
        priority: "normal",
        message: "Need pricing",
      },
      70,
    );

    expect(summary).toContain("Support ticket");
  });
});
