export type EmailProviderName = "resend" | "development";

export type EmailProviderSettings = {
  provider: EmailProviderName;
  enabled: boolean;
  fromEmail?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  recipientEmail: string;
  minimumSeverity: "Critical" | "High" | "Medium" | "Low" | "Info";
};

export type SecurityAlertEmailInput = {
  websiteUrl: string;
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  details: string;
  alertType?: string | null;
  scoreDelta?: number | null;
  riskCurrent?: string | null;
  riskBefore?: string | null;
  reportUrl?: string | null;
};

export type ProviderSendInput = {
  provider: EmailProviderName;
  to: string;
  fromEmail?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
};

export type ProviderSendResult = {
  status: "sent" | "failed" | "provider-not-configured" | "skipped";
  provider: EmailProviderName;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  responseMetadata?: Record<string, unknown>;
};

const severityRank: Record<string, number> = {
  Critical: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Info: 1,
};

export function shouldSendSeverity(severity: string, minimumSeverity: string) {
  return (severityRank[severity] || 1) >= (severityRank[minimumSeverity] || 3);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildSecurityAlertEmail(alert: SecurityAlertEmailInput) {
  const safeWebsite = escapeHtml(alert.websiteUrl);
  const safeTitle = escapeHtml(alert.title);
  const safeSeverity = escapeHtml(alert.severity);
  const safeDetails = escapeHtml(alert.details);
  const safeType = escapeHtml(alert.alertType || "security-alert");
  const subject = `[${alert.severity}] SecureMSME AI alert for ${alert.websiteUrl}`;

  const scoreLine =
    typeof alert.scoreDelta === "number"
      ? `<p><strong>Score change:</strong> ${alert.scoreDelta > 0 ? "+" : ""}${alert.scoreDelta}</p>`
      : "";

  const riskLine =
    alert.riskCurrent || alert.riskBefore
      ? `<p><strong>Risk:</strong> ${escapeHtml(alert.riskBefore || "N/A")} → ${escapeHtml(alert.riskCurrent || "N/A")}</p>`
      : "";

  const reportLink = alert.reportUrl
    ? `<p><a href="${escapeHtml(alert.reportUrl)}">Open SecureMSME AI report</a></p>`
    : "";

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
    <h1>SecureMSME AI Security Alert</h1>
    <p><strong>Website:</strong> ${safeWebsite}</p>
    <p><strong>Severity:</strong> ${safeSeverity}</p>
    <p><strong>Type:</strong> ${safeType}</p>
    <h2>${safeTitle}</h2>
    <p>${safeDetails}</p>
    ${scoreLine}
    ${riskLine}
    ${reportLink}
    <hr />
    <p style="font-size:13px;color:#475569">
      This is an evidence-based monitoring notification. It does not claim exploitation,
      compromise, full pentest coverage, or that every vulnerability has been found.
    </p>
  </div>`;

  const text = [
    "SecureMSME AI Security Alert",
    `Website: ${alert.websiteUrl}`,
    `Severity: ${alert.severity}`,
    `Type: ${alert.alertType || "security-alert"}`,
    `Title: ${alert.title}`,
    `Details: ${alert.details}`,
    typeof alert.scoreDelta === "number"
      ? `Score change: ${alert.scoreDelta}`
      : "",
    alert.riskCurrent || alert.riskBefore
      ? `Risk: ${alert.riskBefore || "N/A"} -> ${alert.riskCurrent || "N/A"}`
      : "",
    alert.reportUrl ? `Report: ${alert.reportUrl}` : "",
    "Safety: This alert does not claim exploitation, compromise, full pentest coverage, or all vulnerabilities found.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

function fromAddress(input: ProviderSendInput) {
  const envFrom = process.env.ALERT_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  const fromEmail = input.fromEmail || envFrom;
  const fromName = input.fromName || "SecureMSME AI";

  if (!fromEmail) return null;
  return `${fromName} <${fromEmail}>`;
}

async function sendViaResend(
  input: ProviderSendInput,
): Promise<ProviderSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = fromAddress(input);

  if (!apiKey || !from) {
    return {
      status: "provider-not-configured",
      provider: "resend",
      errorMessage:
        "Missing RESEND_API_KEY or ALERT_FROM_EMAIL/RESEND_FROM_EMAIL. Email was not sent.",
      responseMetadata: { missingApiKey: !apiKey, missingFrom: !from },
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        reply_to: input.replyTo || undefined,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      return {
        status: "failed",
        provider: "resend",
        errorMessage:
          typeof payload.message === "string"
            ? payload.message
            : `Resend API failed with status ${response.status}`,
        responseMetadata: payload,
      };
    }

    return {
      status: "sent",
      provider: "resend",
      providerMessageId: typeof payload.id === "string" ? payload.id : null,
      responseMetadata: payload,
    };
  } catch (error) {
    return {
      status: "failed",
      provider: "resend",
      errorMessage:
        error instanceof Error ? error.message : "Unknown email provider error",
      responseMetadata: {},
    };
  }
}

export async function sendProviderEmail(
  input: ProviderSendInput,
): Promise<ProviderSendResult> {
  if (!input.to || !input.to.includes("@")) {
    return {
      status: "skipped",
      provider: input.provider,
      errorMessage: "Recipient email is missing or invalid.",
      responseMetadata: {},
    };
  }

  if (input.provider === "development") {
    return {
      status: "provider-not-configured",
      provider: "development",
      errorMessage: "Development provider selected. No real email sent.",
      responseMetadata: { preview: { to: input.to, subject: input.subject } },
    };
  }

  return sendViaResend(input);
}

export function getEmailEnvStatus() {
  return {
    resendApiKeyConfigured: Boolean(process.env.RESEND_API_KEY),
    fromEmailConfigured: Boolean(
      process.env.ALERT_FROM_EMAIL || process.env.RESEND_FROM_EMAIL,
    ),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  };
}
