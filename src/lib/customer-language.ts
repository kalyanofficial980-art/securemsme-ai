export type CustomerFriendlyLink = {
  label: string;
  description: string;
  href: (scanId: string) => string;
  primary?: boolean;
  customerVisible?: boolean;
};

export const customerReportLinks: CustomerFriendlyLink[] = [
  {
    label: "Security Overview",
    description: "Simple website trust score, risk level, and key findings",
    href: (id) => `/report/${id}`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Fix Plan & Progress",
    description:
      "Track open fixes, completed fixes, and before/after improvement",
    href: (id) => `/report/${id}/customer-value`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Advanced Website Checks",
    description: "Extra safe checks that support the main security report",
    href: (id) => `/report/${id}/safe-templates`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Website Review Evidence",
    description: "Public page observations and passive security signals",
    href: (id) => `/report/${id}/passive-worker`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Evidence Confidence",
    description:
      "What is confirmed, what is likely, and what needs expert review",
    href: (id) => `/report/${id}/evidence-calibration`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Developer Instructions",
    description:
      "Clear technical tasks to send to your developer or website vendor",
    href: (id) => `/report/${id}/fix-roadmap`,
    primary: false,
    customerVisible: true,
  },
  {
    label: "Detailed Audit Mapping",
    description: "Detailed security control mapping for technical teams",
    href: (id) => `/report/${id}/advanced`,
    primary: false,
    customerVisible: true,
  },
  {
    label: "Printable Report",
    description: "Clean version for sharing or printing",
    href: (id) => `/report/${id}/print`,
    primary: false,
    customerVisible: true,
  },
  {
    label: "PDF Download",
    description: "Download a professional report",
    href: (id) => `/api/report/${id}/pdf`,
    primary: false,
    customerVisible: true,
  },
];

export const internalEngineWords = [
  "tool runner",
  "nuclei",
  "zap",
  "worker",
  "template engine",
  "job logs",
  "normalized evidence",
  "architecture-ready",
  "unsafe exploit template",
];

export function customerTerm(term: string) {
  const replacements: Record<string, string> = {
    "Tool Runner": "Advanced Security Engine",
    "Safe Nuclei-style Template Engine": "Advanced Website Checks",
    "Safe Templates": "Advanced Website Checks",
    "Passive ZAP-style Worker": "Website Review Evidence",
    "Passive Worker": "Website Review Evidence",
    "False-positive Guard": "Evidence Confidence",
    "Normalized Evidence": "Verified Report Evidence",
    "Blocked Actions": "Safety Controls",
    "Manual Review": "Needs Expert Review",
    "Architecture-ready": "Coming Soon",
    "Security Tool Jobs": "Internal Security Runs",
    "Worker Jobs": "Internal Review Runs",
  };

  return replacements[term] || term;
}

export function customerSafeClaim() {
  return "This report is based on safe public website checks and clearly shows what was observed, what should be fixed, and what needs expert review.";
}

export function customerNotClaim() {
  return "This is not a full penetration test, not a guarantee that no vulnerabilities exist, and not a compliance certificate.";
}

export function developerHandoffMessage() {
  return "Send the fix plan and developer instructions to your web developer or website vendor. After they apply fixes, run a retest to create before/after proof.";
}
