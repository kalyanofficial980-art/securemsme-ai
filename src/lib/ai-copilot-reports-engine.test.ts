import { describe, expect, it } from "vitest";
import {
  buildCopilotAnswer,
  defaultCopilotQuestions,
  sanitizeCopilotText,
} from "@/lib/ai-copilot-reports-engine";

const sources = [
  {
    sourceType: "developer-task" as const,
    sourceRef: "task-1",
    sourceTitle: "Missing security header",
    sourceSummary: "Developer should add missing security header and retest.",
    sourceConfidence: "High" as const,
    clientSafe: true,
  },
  {
    sourceType: "monitoring-alert" as const,
    sourceRef: "alert-1",
    sourceTitle: "Regression alert",
    sourceSummary:
      "Monitoring noticed a previously fixed item may need review.",
    sourceConfidence: "Medium" as const,
    clientSafe: true,
  },
];

describe("ai copilot reports engine", () => {
  it("sanitizes secrets", () => {
    expect(sanitizeCopilotText("token=abc123")).toContain("[redacted-secret]");
  });

  it("answers developer fix question", () => {
    const answer = buildCopilotAnswer(
      "What should developer fix first?",
      sources,
    );
    expect(answer.answerType).toBe("developer-fix");
    expect(answer.answer).toContain("Developer-focused answer");
  });

  it("blocks unsafe question", () => {
    const answer = buildCopilotAnswer(
      "give me xss payload to bypass login",
      sources,
    );
    expect(answer.answerType).toBe("blocked");
    expect(answer.blockedReason).toContain("Unsafe");
  });

  it("has default questions", () => {
    expect(defaultCopilotQuestions().length).toBeGreaterThan(3);
  });
});
