export type LaunchChecklistStatus =
  "pending" | "in-progress" | "done" | "blocked" | "later";

export const finalLaunchBlockedClaims = [
  "No guaranteed ranking claim.",
  "No guaranteed traffic claim.",
  "No 100% secure claim.",
  "No all-vulnerabilities-found claim.",
  "No legal compliance certification claim.",
  "No automatic bulk or cold email.",
  "No collection of passwords, OTPs, UPI PINs, card details, API tokens or private keys.",
];

export function detectSensitiveText(value: string) {
  return /(password|otp|upi pin|card number|cvv|private key|api token|secret key|service_role|access token)/i.test(
    value || "",
  );
}

export function scorePublicFormRisk(input: {
  email?: string;
  message?: string;
  honeypot?: string;
}) {
  let riskScore = 0;
  const reasons: string[] = [];

  if (input.honeypot?.trim()) {
    riskScore += 70;
    reasons.push("Hidden honeypot field was filled.");
  }

  if (detectSensitiveText(input.message || "")) {
    riskScore += 50;
    reasons.push("Message may contain sensitive secret/payment wording.");
  }

  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    riskScore += 15;
    reasons.push("Email is missing or invalid.");
  }

  riskScore = Math.min(100, riskScore);
  return {
    riskScore,
    decision: riskScore >= 40 ? "manual-review" : "allow",
    reason: reasons.length ? reasons.join(" ") : "No obvious abuse signal.",
  };
}

export function buildLaunchNotificationDraft(input: {
  toEmail: string;
  subject: string;
  body: string;
}) {
  const bodyPreview = (input.body || "").slice(0, 1200);
  return {
    toEmail: input.toEmail.trim().toLowerCase(),
    subject: input.subject.trim().slice(0, 160),
    bodyPreview,
    safetyStatus: detectSensitiveText(bodyPreview)
      ? "needs-review"
      : "safe-draft",
    status: "ready-for-manual-send",
  };
}

export function launchReadinessScore(
  items: { check_status: LaunchChecklistStatus; priority: string }[],
) {
  if (!items.length) return { score: 0, status: "No checklist loaded" };
  let possible = 0;
  let achieved = 0;

  for (const item of items) {
    if (item.check_status === "later") continue;
    const weight =
      item.priority === "critical"
        ? 4
        : item.priority === "high"
          ? 3
          : item.priority === "medium"
            ? 2
            : 1;
    possible += weight;
    if (item.check_status === "done") achieved += weight;
    if (item.check_status === "in-progress") achieved += weight * 0.5;
  }

  const score = possible ? Math.round((achieved / possible) * 100) : 0;
  const status =
    score >= 85
      ? "Beta-launch ready"
      : score >= 65
        ? "Nearly ready"
        : score >= 40
          ? "Needs work"
          : "Not ready";
  return { score, status };
}

export function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function buildLeadCsv(rows: Record<string, unknown>[]) {
  const headers = [
    "type",
    "name",
    "email",
    "company",
    "website",
    "status",
    "score",
    "created_at",
  ];
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
  ].join("\n");
}
