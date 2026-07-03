export type CopilotSourceType =
  | "scan"
  | "report"
  | "finding"
  | "developer-task"
  | "monitoring-alert"
  | "ai-triage"
  | "manual-context"
  | "legal-safety";

export type CopilotSourceDraft = {
  sourceType: CopilotSourceType;
  sourceRef: string;
  sourceTitle: string;
  sourceSummary: string;
  sourceConfidence:
    "Confirmed" | "High" | "Medium" | "Low" | "Needs manual review";
  clientSafe: boolean;
};

export type CopilotAnswer = {
  answer: string;
  answerType:
    | "general"
    | "executive"
    | "developer-fix"
    | "client-explanation"
    | "priority"
    | "blocked";
  confidenceLevel: "High" | "Medium" | "Low" | "Needs manual review";
  sourceIndexes: number[];
  blockedReason: string;
  safetyNotes: string[];
};

export const aiCopilotBlockedClaims = [
  "Do not claim the website is 100% secure.",
  "Do not claim all vulnerabilities were found.",
  "Do not provide exploit payloads or destructive instructions.",
  "Do not expose secrets, private tokens, OTPs, cookies or customer data.",
  "Do not claim legal compliance certification.",
  "Do not call low-confidence evidence a confirmed vulnerability.",
];

const unsafePatterns = [
  /exploit/i,
  /payload/i,
  /bypass/i,
  /brute\s*force/i,
  /steal/i,
  /dump/i,
  /reverse\s*shell/i,
  /sqlmap/i,
  /xss\s*payload/i,
  /admin\s*password/i,
  /cookie\s*theft/i,
];

export function sanitizeCopilotText(value: string) {
  const patterns = [
    /password\s*[:=]\s*\S+/gi,
    /token\s*[:=]\s*\S+/gi,
    /session\s*[:=]\s*\S+/gi,
    /cookie\s*[:=]\s*\S+/gi,
    /authorization\s*:\s*bearer\s+\S+/gi,
    /api[_-]?key\s*[:=]\s*\S+/gi,
    /otp\s*[:=]\s*\S+/gi,
  ];

  let text = value || "";
  for (const pattern of patterns)
    text = text.replace(pattern, "[redacted-secret]");
  return text.slice(0, 4000);
}

export function isUnsafeCopilotQuestion(question: string) {
  return unsafePatterns.some((pattern) => pattern.test(question));
}

function sourceText(source: CopilotSourceDraft) {
  return `${source.sourceTitle}. ${source.sourceSummary}`.toLowerCase();
}

function rankSources(question: string, sources: CopilotSourceDraft[]) {
  const q = question.toLowerCase();
  const keywords = q
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length > 3);

  return sources
    .map((source, index) => {
      const text = sourceText(source);
      const keywordScore = keywords.reduce(
        (score, word) => score + (text.includes(word) ? 1 : 0),
        0,
      );
      const typeBoost =
        q.includes("developer") && source.sourceType === "developer-task"
          ? 4
          : q.includes("fix") && source.sourceType === "developer-task"
            ? 4
            : q.includes("monitor") && source.sourceType === "monitoring-alert"
              ? 4
              : q.includes("priority") && source.sourceType === "ai-triage"
                ? 4
                : q.includes("report") && source.sourceType === "report"
                  ? 3
                  : 0;

      return { index, score: keywordScore + typeBoost };
    })
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, 5)
    .map((item) => item.index);
}

function inferAnswerType(question: string): CopilotAnswer["answerType"] {
  const q = question.toLowerCase();
  if (q.includes("executive") || q.includes("owner") || q.includes("business"))
    return "executive";
  if (q.includes("developer") || q.includes("fix") || q.includes("code"))
    return "developer-fix";
  if (q.includes("client") || q.includes("explain") || q.includes("share"))
    return "client-explanation";
  if (q.includes("first") || q.includes("priority") || q.includes("urgent"))
    return "priority";
  return "general";
}

function buildAnswerFromSources(
  question: string,
  selected: CopilotSourceDraft[],
  answerType: CopilotAnswer["answerType"],
) {
  const safeQuestion = sanitizeCopilotText(question);
  const sourceBullets = selected
    .map(
      (source, index) =>
        `${index + 1}. ${source.sourceTitle}: ${source.sourceSummary}`,
    )
    .join("\n");

  if (!selected.length) {
    return `I do not have enough report evidence to answer strongly yet.\n\nSafe next step: run or refresh the report, developer fixes, retest proof, monitoring and AI triage, then ask again.\n\nQuestion: ${safeQuestion}`;
  }

  if (answerType === "developer-fix") {
    return `Developer-focused answer:\n\nBased on the available sources, start with the highest-impact fix item and keep evidence for retest.\n\n${sourceBullets}\n\nSafe fix workflow:\n1. Review evidence.\n2. Apply the configuration/code fix safely.\n3. Test in staging when possible.\n4. Request retest proof.\n5. Do not claim verified-fixed until retest evidence exists.`;
  }

  if (answerType === "executive") {
    return `Executive summary:\n\nThe current report data indicates security work should be prioritized by business impact, confidence and fix readiness.\n\n${sourceBullets}\n\nImportant limitation: this is not a 100% security guarantee and not legal compliance certification.`;
  }

  if (answerType === "client-explanation") {
    return `Client-safe explanation:\n\nThis item should be treated as a remediation priority, not as a claim that attackers exploited the system.\n\n${sourceBullets}\n\nSafe wording: "We identified evidence that this area should be reviewed and improved. After fixes, retest proof should be generated."`;
  }

  if (answerType === "priority") {
    return `Priority answer:\n\nFix order should follow confirmed/high-confidence business impact first, then quick wins, then manual-review items.\n\n${sourceBullets}\n\nDo not treat low-confidence items as confirmed until manually reviewed.`;
  }

  return `Report copilot answer:\n\n${sourceBullets}\n\nSafe conclusion: use this answer as guidance based on available report sources, not as a guarantee of complete security coverage.`;
}

export function buildCopilotAnswer(
  question: string,
  sources: CopilotSourceDraft[],
): CopilotAnswer {
  const cleanQuestion = sanitizeCopilotText(question);

  if (!cleanQuestion || cleanQuestion.length < 2) {
    return {
      answer:
        "Please ask a clear question about the report, developer fixes, client explanation or remediation priority.",
      answerType: "blocked",
      confidenceLevel: "Low",
      sourceIndexes: [],
      blockedReason: "Empty question",
      safetyNotes: aiCopilotBlockedClaims,
    };
  }

  if (isUnsafeCopilotQuestion(cleanQuestion)) {
    return {
      answer:
        "I cannot help with exploit payloads, bypass instructions, brute force, credential theft or unauthorized testing. I can help explain the report safely, prioritize fixes, prepare client-safe wording or guide authorized remediation.",
      answerType: "blocked",
      confidenceLevel: "Needs manual review",
      sourceIndexes: [],
      blockedReason: "Unsafe cybersecurity request blocked",
      safetyNotes: aiCopilotBlockedClaims,
    };
  }

  const answerType = inferAnswerType(cleanQuestion);
  const sourceIndexes = rankSources(cleanQuestion, sources);
  const selected = sourceIndexes.length
    ? sourceIndexes.map((index) => sources[index])
    : sources.slice(0, 4);

  const confidenceLevel = selected.some(
    (source) =>
      source.sourceConfidence === "Needs manual review" ||
      source.sourceConfidence === "Low",
  )
    ? "Needs manual review"
    : selected.some(
          (source) =>
            source.sourceConfidence === "Confirmed" ||
            source.sourceConfidence === "High",
        )
      ? "High"
      : "Medium";

  return {
    answer: sanitizeCopilotText(
      buildAnswerFromSources(cleanQuestion, selected, answerType),
    ),
    answerType,
    confidenceLevel,
    sourceIndexes: sourceIndexes.length
      ? sourceIndexes
      : selected.map((_, index) => index),
    blockedReason: "",
    safetyNotes: aiCopilotBlockedClaims,
  };
}

export function defaultCopilotQuestions() {
  return [
    "Explain this report in simple business language.",
    "What should my developer fix first?",
    "Can I share this report with a client?",
    "Which findings need manual review?",
    "What is the safest next action?",
    "Write a client-safe summary without scary claims.",
  ];
}
