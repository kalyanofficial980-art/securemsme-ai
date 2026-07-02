export type AlertSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";
export type AlertChannel = "in-app" | "email";

export type AlertPreferenceInput = {
  websiteUrl: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  recipientEmail?: string | null;
  minSeverity: AlertSeverity;
  alertTypes: string[];
};

export type MonitoringEventForAlert = {
  id: string;
  event_type: string;
  severity: AlertSeverity | string;
  title: string;
  details: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type AlertNotificationSeed = {
  monitoringEventId: string;
  channel: AlertChannel;
  recipient?: string | null;
  alertType: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionUrl: string;
  payload: Record<string, unknown>;
};

const severityRank: Record<AlertSeverity, number> = {
  Critical: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Info: 1,
};

export function normalizeAlertSeverity(value: unknown): AlertSeverity {
  const raw = String(value || "Info").toLowerCase();
  if (raw.includes("critical")) return "Critical";
  if (raw.includes("high")) return "High";
  if (raw.includes("medium")) return "Medium";
  if (raw.includes("low")) return "Low";
  return "Info";
}

export function buildAlertPolicy(input: AlertPreferenceInput) {
  return {
    engineVersion: "48.0",
    websiteUrl: input.websiteUrl,
    inAppEnabled: input.inAppEnabled,
    emailEnabled: input.emailEnabled,
    minSeverity: input.minSeverity,
    alertTypes: input.alertTypes,
    deliveryModes: {
      inApp: "stored notification",
      email:
        "queued provider-ready notification; development uses simulated delivery",
    },
    safetyClaims: {
      canClaim: [
        "Can alert when monitoring detects score drop, risk increase or regression event.",
        "Can store in-app alert notification.",
        "Can queue email-ready notification for later provider integration.",
      ],
      cannotClaim: [
        "Cannot claim email provider delivery until provider integration is configured.",
        "Cannot claim compromise from alert alone.",
        "Cannot claim full continuous pentest from alerting system alone.",
      ],
    },
  };
}

export function shouldSendAlert(input: {
  event: MonitoringEventForAlert;
  minSeverity: AlertSeverity;
  alertTypes: string[];
}) {
  const severity = normalizeAlertSeverity(input.event.severity);
  const meetsSeverity =
    severityRank[severity] >= severityRank[input.minSeverity];
  const eventType = input.event.event_type;
  const typeAllowed =
    input.alertTypes.includes(eventType) || input.alertTypes.includes("all");

  return meetsSeverity && typeAllowed;
}

export function buildAlertNotifications(input: {
  websiteUrl: string;
  scanId: string;
  events: MonitoringEventForAlert[];
  minSeverity: AlertSeverity;
  alertTypes: string[];
  inAppEnabled: boolean;
  emailEnabled: boolean;
  recipientEmail?: string | null;
}) {
  const notifications: AlertNotificationSeed[] = [];

  for (const event of input.events) {
    if (
      !shouldSendAlert({
        event,
        minSeverity: input.minSeverity,
        alertTypes: input.alertTypes,
      })
    )
      continue;

    const severity = normalizeAlertSeverity(event.severity);
    const actionUrl = `/report/${input.scanId}/monitoring`;
    const title = `[${severity}] ${event.title}`;
    const message = `${event.details}\n\nWebsite: ${input.websiteUrl}\nAction: Review monitoring page and run Truth Cleanup/Retest if needed.`;
    const payload = {
      engineVersion: "48.0",
      websiteUrl: input.websiteUrl,
      eventType: event.event_type,
      eventCreatedAt: event.created_at,
      eventMetadata: event.metadata || {},
      canClaim: "Monitoring alert was generated from saved monitoring event.",
      cannotClaim:
        "Alert does not prove exploit, compromise or full continuous pentest coverage.",
    };

    if (input.inAppEnabled) {
      notifications.push({
        monitoringEventId: event.id,
        channel: "in-app",
        recipient: null,
        alertType: event.event_type,
        severity,
        title,
        message,
        actionUrl,
        payload,
      });
    }

    if (input.emailEnabled && input.recipientEmail) {
      notifications.push({
        monitoringEventId: event.id,
        channel: "email",
        recipient: input.recipientEmail,
        alertType: event.event_type,
        severity,
        title,
        message,
        actionUrl,
        payload: {
          ...payload,
          emailSubject: title,
          emailBody: message,
          deliveryNote:
            "Development mode simulates delivery until email provider is configured.",
        },
      });
    }
  }

  return notifications;
}

export function buildAlertSummary(input: {
  queued: number;
  emailQueued: number;
  inAppQueued: number;
}) {
  return {
    customerSummary:
      input.queued > 0
        ? `${input.queued} alert notification(s) queued from monitoring events.`
        : "No new alerts matched your alert preferences.",
    developerSummary:
      "Alert foundation generated in-app and email-ready notification records. Email provider delivery is simulated in development.",
    nextAction:
      input.emailQueued > 0
        ? "Configure email provider integration before production email sending."
        : "Keep monitoring active and review in-app alerts.",
  };
}
