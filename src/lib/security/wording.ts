export function safeSecurityText(text: string): string {
  return text
    .replace(/\bFAIL\b/g, "Needs review")
    .replace(/\bFailed\b/g, "Needs review")
    .replace(/\bfailed\b/g, "needs review")
    .replace(/\bConfirmed evidence\b/g, "Observed evidence")
    .replace(/\bconfirmed evidence\b/g, "observed evidence")
    .replace(/\bVulnerability found\b/g, "Potential issue")
    .replace(/\bvulnerability found\b/g, "potential issue")
    .replace(/\bOWASP\/ASVS audit\b/g, "OWASP/ASVS-style readiness mapping")
    .replace(/\bSecurity maturity audit\b/g, "Security readiness review");
}

export const safeLabels = {
  fail: "Needs review",
  confirmedEvidence: "Observed evidence",
  vulnerability: "Potential issue",
  audit: "OWASP/ASVS-style readiness mapping",
  maturity: "Security readiness score",
  notMeasured: "Not measured yet",
};
