export type Severity = "Critical" | "High" | "Medium" | "Low" | "Info";
export type CheckStatus =
  "pass" | "warning" | "fail" | "manual-review" | "not-applicable";

export type CloudConfigInput = {
  productionDomain: string;
  supabaseSiteUrlSet: boolean;
  supabaseRedirectUrlsRestricted: boolean;
  supabaseRlsEnabled: boolean;
  supabaseStoragePrivateByDefault: boolean;
  supabaseServiceRoleNotClientExposed: boolean;
  vercelEnvProductionSet: boolean;
  vercelPreviewSecretsSeparated: boolean;
  vercelBuildLogsNoSecrets: boolean;
  dnsText: string;
  supportEmailReady: boolean;
  incidentProcessReady: boolean;
};

export type CloudCheckItem = {
  category:
    | "supabase-auth"
    | "supabase-rls"
    | "supabase-storage"
    | "vercel-env"
    | "vercel-deploy"
    | "dns-email"
    | "dns-domain"
    | "support-process";
  checkKey: string;
  checkTitle: string;
  checkStatus: CheckStatus;
  severity: Severity;
  evidenceSummary: string;
  remediationAction: string;
  clientSafeNote: string;
  confidenceLevel: "High" | "Medium" | "Low" | "Needs manual review";
};

export type DnsRecordFinding = {
  recordType: "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS" | "CAA" | "OTHER";
  recordName: string;
  recordValueSafe: string;
  recordStatus:
    "present" | "missing" | "weak" | "manual-review" | "not-applicable";
  securityPurpose: string;
  findingSummary: string;
  remediationAction: string;
};

export type CloudAuditResult = {
  riskScore: number;
  riskLevel: Severity;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  manualReviewCount: number;
  summary: string;
  developerAction: string;
  clientSafeSummary: string;
  checks: CloudCheckItem[];
  dnsRecords: DnsRecordFinding[];
};

export const cloudConfigBlockedClaims = [
  "Do not collect cloud API tokens or private keys.",
  "Do not claim this is legal compliance certification.",
  "Do not claim 100% secure cloud configuration.",
  "Do not expose service role keys or production secrets.",
  "Do not mark manual checklist items as verified without evidence.",
];

function scoreSeverity(severity: Severity) {
  return { Info: 0, Low: 8, Medium: 18, High: 35, Critical: 60 }[severity];
}

function scoreToLevel(score: number): Severity {
  if (score >= 85) return "Critical";
  if (score >= 65) return "High";
  if (score >= 40) return "Medium";
  if (score >= 15) return "Low";
  return "Info";
}

function boolCheck(
  value: boolean,
  category: CloudCheckItem["category"],
  checkKey: string,
  checkTitle: string,
  severity: Severity,
  evidencePass: string,
  remediationAction: string,
): CloudCheckItem {
  return {
    category,
    checkKey,
    checkTitle,
    checkStatus: value ? "pass" : "fail",
    severity: value ? "Info" : severity,
    evidenceSummary: value
      ? evidencePass
      : "Manual input indicates this control is not confirmed.",
    remediationAction: value
      ? "Keep this control documented and periodically re-check it."
      : remediationAction,
    clientSafeNote: value
      ? "Control appears configured from the submitted checklist."
      : "This cloud configuration control needs review before stronger security claims are made.",
    confidenceLevel: "Medium",
  };
}

function hasPattern(text: string, pattern: RegExp) {
  return pattern.test(text || "");
}

function safeDnsSnippet(value: string) {
  return (value || "")
    .replace(
      /([A-Za-z0-9_-]{18,})/g,
      (match) => `${match.slice(0, 4)}...${match.slice(-4)}`,
    )
    .slice(0, 260);
}

export function analyzeDnsRecords(dnsText: string): DnsRecordFinding[] {
  const text = dnsText || "";
  const lower = text.toLowerCase();
  const records: DnsRecordFinding[] = [];

  const hasSpf = hasPattern(lower, /v=spf1/);
  const spfWeak =
    hasPattern(lower, /\+all| all\b/) && !hasPattern(lower, /-all|~all/);
  records.push({
    recordType: "TXT",
    recordName: "@",
    recordValueSafe: hasSpf
      ? safeDnsSnippet(
          text.match(/v=spf1[^\n\r"]*/i)?.[0] || "SPF record present",
        )
      : "",
    recordStatus: hasSpf ? (spfWeak ? "weak" : "present") : "missing",
    securityPurpose:
      "SPF helps define which mail servers can send email for the domain.",
    findingSummary: hasSpf
      ? spfWeak
        ? "SPF record appears weak and should be reviewed."
        : "SPF record signal found."
      : "SPF record signal missing from submitted DNS text.",
    remediationAction: hasSpf
      ? "Review SPF syntax and avoid overly permissive all mechanisms."
      : "Add a valid SPF TXT record for your email provider.",
  });

  const hasDmarc = hasPattern(lower, /_dmarc|v=dmarc1/);
  const dmarcWeak = hasPattern(lower, /p=none/);
  records.push({
    recordType: "TXT",
    recordName: "_dmarc",
    recordValueSafe: hasDmarc
      ? safeDnsSnippet(
          text.match(/v=dmarc1[^\n\r"]*/i)?.[0] || "DMARC record present",
        )
      : "",
    recordStatus: hasDmarc ? (dmarcWeak ? "weak" : "present") : "missing",
    securityPurpose: "DMARC helps protect domain email from spoofing.",
    findingSummary: hasDmarc
      ? dmarcWeak
        ? "DMARC exists but policy is monitoring-only."
        : "DMARC record signal found."
      : "DMARC record signal missing from submitted DNS text.",
    remediationAction: hasDmarc
      ? "Move toward quarantine/reject after monitoring and alignment are confirmed."
      : "Add a DMARC TXT record and monitor reports before enforcing.",
  });

  const hasDkim = hasPattern(lower, /dkim|domainkey|v=dkim1/);
  records.push({
    recordType: "TXT",
    recordName: "selector._domainkey",
    recordValueSafe: hasDkim
      ? "DKIM signal present; value masked/not stored in full."
      : "",
    recordStatus: hasDkim ? "present" : "missing",
    securityPurpose: "DKIM signs outgoing email to support authenticity.",
    findingSummary: hasDkim
      ? "DKIM record signal found."
      : "DKIM record signal missing from submitted DNS text.",
    remediationAction: hasDkim
      ? "Keep DKIM keys rotated according to provider guidance."
      : "Enable DKIM in your email provider and publish the provided DNS record.",
  });

  const hasMx = hasPattern(lower, /\bmx\b|mail exchanger/);
  records.push({
    recordType: "MX",
    recordName: "@",
    recordValueSafe: hasMx ? "MX signal present" : "",
    recordStatus: hasMx ? "present" : "manual-review",
    securityPurpose:
      "MX records identify mail routing and should match intended provider.",
    findingSummary: hasMx
      ? "MX signal found in submitted text."
      : "MX record not visible in submitted text.",
    remediationAction: hasMx
      ? "Verify MX points only to intended email provider."
      : "Manually confirm MX records in DNS provider.",
  });

  const hasCaa = hasPattern(lower, /\bcaa\b|issue\s+/);
  records.push({
    recordType: "CAA",
    recordName: "@",
    recordValueSafe: hasCaa ? "CAA signal present" : "",
    recordStatus: hasCaa ? "present" : "manual-review",
    securityPurpose:
      "CAA can restrict which certificate authorities issue certificates for the domain.",
    findingSummary: hasCaa
      ? "CAA signal found."
      : "CAA record not visible in submitted text.",
    remediationAction: hasCaa
      ? "Verify CAA allows only intended certificate authorities."
      : "Consider adding CAA records for stronger certificate issuance control.",
  });

  return records;
}

export function analyzeCloudConfig(input: CloudConfigInput): CloudAuditResult {
  const checks: CloudCheckItem[] = [
    boolCheck(
      input.supabaseSiteUrlSet,
      "supabase-auth",
      "supabase-site-url",
      "Supabase Site URL is set to production domain",
      "High",
      "Supabase Site URL is marked as configured.",
      "Set Supabase Auth Site URL to the exact production domain.",
    ),
    boolCheck(
      input.supabaseRedirectUrlsRestricted,
      "supabase-auth",
      "supabase-redirect-urls",
      "Supabase redirect URLs are restricted",
      "High",
      "Redirect URLs are marked as production-safe.",
      "Remove broad/unsafe redirect URLs and keep only approved production and local development URLs.",
    ),
    boolCheck(
      input.supabaseRlsEnabled,
      "supabase-rls",
      "supabase-rls-enabled",
      "RLS is enabled for customer data tables",
      "Critical",
      "RLS is marked as enabled for customer data.",
      "Enable and test Row Level Security for all customer-owned tables.",
    ),
    boolCheck(
      input.supabaseStoragePrivateByDefault,
      "supabase-storage",
      "supabase-storage-private",
      "Supabase storage buckets are private by default",
      "High",
      "Storage buckets are marked private/default protected.",
      "Make sensitive buckets private and use signed URLs or authorized access.",
    ),
    boolCheck(
      input.supabaseServiceRoleNotClientExposed,
      "supabase-auth",
      "service-role-not-client",
      "Service role key is not exposed to client/browser",
      "Critical",
      "Service role key is marked server-only.",
      "Rotate key if exposed. Keep service role only in secure server environments.",
    ),
    boolCheck(
      input.vercelEnvProductionSet,
      "vercel-env",
      "vercel-prod-env",
      "Vercel production environment variables are configured",
      "High",
      "Production environment variables are marked configured.",
      "Set required production env vars and remove placeholder/local values.",
    ),
    boolCheck(
      input.vercelPreviewSecretsSeparated,
      "vercel-env",
      "vercel-preview-secrets",
      "Preview and production secrets are separated",
      "Medium",
      "Preview/production separation is marked configured.",
      "Use separate preview/prod secrets and avoid sharing production credentials in preview.",
    ),
    boolCheck(
      input.vercelBuildLogsNoSecrets,
      "vercel-deploy",
      "vercel-build-logs",
      "Build logs do not expose secrets",
      "High",
      "Build logs are marked as not exposing secrets.",
      "Remove secret printing from build scripts and rotate any exposed credential.",
    ),
    boolCheck(
      input.supportEmailReady,
      "support-process",
      "support-email-ready",
      "Support/security contact email is ready",
      "Medium",
      "Support/security contact is marked ready.",
      "Set up support/security contact and document response process.",
    ),
    boolCheck(
      input.incidentProcessReady,
      "support-process",
      "incident-process-ready",
      "Incident response process is documented",
      "Medium",
      "Incident process is marked ready.",
      "Document incident triage, customer notification and evidence handling process.",
    ),
  ];

  const dnsRecords = analyzeDnsRecords(input.dnsText);
  for (const record of dnsRecords) {
    const severity: Severity =
      record.recordStatus === "missing" &&
      (record.recordName === "_dmarc" || record.securityPurpose.includes("SPF"))
        ? "High"
        : record.recordStatus === "weak"
          ? "Medium"
          : record.recordStatus === "manual-review"
            ? "Low"
            : "Info";

    checks.push({
      category: record.recordType === "CAA" ? "dns-domain" : "dns-email",
      checkKey: `dns-${record.recordName}-${record.recordType}`
        .replace(/[^a-zA-Z0-9-]/g, "-")
        .toLowerCase(),
      checkTitle: `${record.recordType} ${record.recordName} DNS security record`,
      checkStatus:
        record.recordStatus === "present"
          ? "pass"
          : record.recordStatus === "weak"
            ? "warning"
            : record.recordStatus === "missing"
              ? "fail"
              : "manual-review",
      severity,
      evidenceSummary: record.findingSummary,
      remediationAction: record.remediationAction,
      clientSafeNote:
        "DNS/email configuration should be verified in the DNS provider before production launch.",
      confidenceLevel: "Needs manual review",
    });
  }

  const failedCount = checks.filter(
    (check) => check.checkStatus === "fail",
  ).length;
  const warningCount = checks.filter(
    (check) => check.checkStatus === "warning",
  ).length;
  const manualReviewCount = checks.filter(
    (check) => check.checkStatus === "manual-review",
  ).length;
  const passedCount = checks.filter(
    (check) => check.checkStatus === "pass",
  ).length;

  const riskScore = Math.min(
    100,
    checks.reduce((score, check) => {
      if (check.checkStatus === "fail")
        return score + scoreSeverity(check.severity);
      if (check.checkStatus === "warning")
        return score + Math.ceil(scoreSeverity(check.severity) / 2);
      if (check.checkStatus === "manual-review") return score + 5;
      return score;
    }, 0),
  );

  const riskLevel = scoreToLevel(riskScore);

  return {
    riskScore,
    riskLevel,
    passedCount,
    warningCount,
    failedCount,
    manualReviewCount,
    summary: `Cloud config audit completed with ${passedCount} pass, ${warningCount} warning, ${failedCount} fail and ${manualReviewCount} manual-review item(s). Overall risk: ${riskLevel} (${riskScore}/100).`,
    developerAction:
      failedCount > 0
        ? "Fix failed Supabase/Vercel/DNS controls first, then re-run the cloud config audit before production claims."
        : warningCount > 0
          ? "Review warnings and manual-review DNS items before full public launch."
          : "Maintain documentation and re-check cloud configuration after every major deployment.",
    clientSafeSummary:
      "Cloud configuration review completed using submitted checklist evidence. This is not a legal compliance certificate or 100% security guarantee.",
    checks,
    dnsRecords,
  };
}
