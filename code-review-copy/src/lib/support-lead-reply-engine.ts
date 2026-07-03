export type SupportTopic =
  | "general"
  | "demo"
  | "pricing"
  | "billing"
  | "technical-support"
  | "security-report"
  | "agency"
  | "legal"
  | "abuse-report";

export type SupportPriority = "low" | "normal" | "high" | "urgent-review";

export type SupportInput = {
  fullName: string;
  email: string;
  companyName: string;
  websiteUrl: string;
  topic: SupportTopic;
  priority: SupportPriority;
  message: string;
};

export type LeadReplyInput = {
  fullName: string;
  companyName: string;
  toEmail: string;
  topic: SupportTopic | "demo-follow-up" | "pricing-follow-up";
  requestedPlan?: string;
  primaryNeed?: string;
  websiteUrl?: string;
};

export const supportBlockedClaims = [
  "Do not ask for passwords, OTPs, API tokens, private keys, UPI PINs or card details.",
  "Do not guarantee response time unless manually approved.",
  "Do not claim 100% security.",
  "Do not claim all vulnerabilities are found.",
  "Do not claim legal compliance certification.",
  "Do not automatically send bulk/cold emails.",
];

export function isSupportEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());
}

export function normalizeSupportWebsiteUrl(value: string) {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

export function supportScore(input: SupportInput) {
  let score = 15;
  if (input.fullName.trim()) score += 10;
  if (isSupportEmail(input.email)) score += 15;
  if (input.companyName.trim()) score += 10;
  if (input.websiteUrl.trim()) score += 10;
  if (input.message.trim().length >= 30) score += 10;
  if (["billing", "pricing"].includes(input.topic)) score += 12;
  if (["demo", "agency"].includes(input.topic)) score += 18;
  if (["security-report", "technical-support"].includes(input.topic))
    score += 15;
  if (input.topic === "abuse-report" || input.priority === "urgent-review")
    score += 25;
  if (input.priority === "high") score += 12;
  return Math.min(100, score);
}

export function priorityFromTopic(
  topic: SupportTopic,
  userPriority: SupportPriority,
) {
  if (topic === "abuse-report" || userPriority === "urgent-review")
    return "urgent-review" as const;
  if (
    topic === "billing" ||
    topic === "security-report" ||
    userPriority === "high"
  )
    return "high" as const;
  return userPriority || "normal";
}

export function buildSupportSummary(input: SupportInput, score: number) {
  const website =
    normalizeSupportWebsiteUrl(input.websiteUrl) || "no website provided";
  return `Support ticket from ${input.fullName || input.email} about ${input.topic}. Website: ${website}. Priority: ${input.priority}. Support score: ${score}/100.`;
}

export function sanitizeSupportMessage(value: string) {
  const raw = (value || "").trim();
  return raw
    .replace(
      /(password|otp|upi pin|private key|api token|secret key)\s*[:=]\s*[^\s]+/gi,
      "$1: [removed]",
    )
    .slice(0, 3000);
}

export function buildSafeReplyDraft(input: LeadReplyInput) {
  const name = input.fullName?.trim() || "there";
  const company = input.companyName?.trim() || "your business";
  const website = normalizeSupportWebsiteUrl(input.websiteUrl || "");
  const plan = input.requestedPlan || "the suitable launch plan";
  const subject =
    input.topic === "demo-follow-up"
      ? `SecureMSME AI demo follow-up for ${company}`
      : input.topic === "pricing-follow-up"
        ? `SecureMSME AI pricing follow-up for ${company}`
        : "SecureMSME AI support update";

  const body = [
    `Hi ${name},`,
    "",
    `Thanks for contacting SecureMSME AI about ${company}.`,
    website ? `Website shared: ${website}` : "",
    input.primaryNeed ? `Main need: ${input.primaryNeed}` : "",
    `Suggested next step: start with ${plan} and complete onboarding plus website authorization before any scan.`,
    "",
    "Important safety note: please do not send passwords, OTPs, UPI PINs, card details, API tokens, private keys, or other secrets by email or chat.",
    "",
    "SecureMSME AI can help with authorized website checks, client-safe reports, developer fix workflows, repo review, cloud config review, scheduled monitoring and manual billing flow.",
    "",
    "This is not a legal compliance certificate and we do not claim that all vulnerabilities will be found.",
    "",
    "Regards,",
    "SecureMSME AI Support",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    body,
    safetyStatus: "safe-draft" as const,
    safetyNotes:
      "Draft avoids secrets, guarantees, compliance certificate claims and all-vulnerabilities-found claims.",
  };
}
