"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildSecurityAlertEmail,
  getEmailEnvStatus,
  sendProviderEmail,
  shouldSendSeverity,
  type EmailProviderName,
} from "@/lib/email-provider";
import { createClient } from "@/lib/supabase/server";

function asProvider(value: FormDataEntryValue | null): EmailProviderName {
  if (value === "development") return "development";
  return "resend";
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function getUserAndScan(scanId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to use email delivery");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, website_url")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  return { supabase, user, scan };
}

export async function saveEmailProviderSettings(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const provider = asProvider(formData.get("provider"));
  const enabled = formData.get("enabled") === "on";
  const fromEmail = String(formData.get("fromEmail") || "").trim() || null;
  const fromName = String(formData.get("fromName") || "SecureMSME AI").trim();
  const replyTo = String(formData.get("replyTo") || "").trim() || null;
  const recipientEmail = String(formData.get("recipientEmail") || "").trim();
  const minimumSeverity = String(formData.get("minimumSeverity") || "Medium");
  const { supabase, user, scan } = await getUserAndScan(scanId);
  const envStatus = getEmailEnvStatus();

  const configurationStatus =
    provider === "resend" &&
    (!envStatus.resendApiKeyConfigured || !envStatus.fromEmailConfigured)
      ? "missing-env"
      : "not-tested";

  const { data: existing } = await supabase
    .from("email_provider_settings")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const payload = {
    user_id: user.id,
    provider,
    enabled,
    from_email: fromEmail,
    from_name: fromName,
    reply_to: replyTo,
    recipient_email: recipientEmail,
    minimum_severity: minimumSeverity,
    send_regression_alerts: formData.get("sendRegressionAlerts") === "on",
    send_score_drop_alerts: formData.get("sendScoreDropAlerts") === "on",
    send_risk_increase_alerts: formData.get("sendRiskIncreaseAlerts") === "on",
    send_weekly_summary: formData.get("sendWeeklySummary") === "on",
    configuration_status: configurationStatus,
    configuration_notes:
      configurationStatus === "missing-env"
        ? "Missing RESEND_API_KEY or ALERT_FROM_EMAIL/RESEND_FROM_EMAIL."
        : "Settings saved. Send test email to verify provider.",
  };

  if (existing?.id) {
    await supabase
      .from("email_provider_settings")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("email_provider_settings").insert(payload);
  }

  await supabase.from("email_provider_events").insert({
    user_id: user.id,
    event_type: "email-config-updated",
    severity: "Info",
    title: "Email provider settings updated",
    details: `Email provider settings updated for ${scan.website_url}.`,
    metadata: { provider, configurationStatus },
  });

  revalidatePath(`/report/${scan.id}/email-delivery`);
  redirect(
    `/report/${scan.id}/email-delivery?message=${encodeURIComponent("Email provider settings saved.")}`,
  );
}

export async function sendTestEmail(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const { supabase, user, scan } = await getUserAndScan(scanId);

  const { data: settings } = await supabase
    .from("email_provider_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.recipient_email) {
    redirect(
      `/report/${scan.id}/email-delivery?message=${encodeURIComponent("Save recipient email first.")}`,
    );
  }

  const email = buildSecurityAlertEmail({
    websiteUrl: scan.website_url,
    title: "Test email from SecureMSME AI",
    severity: "Info",
    details:
      "This is a provider verification email. No security incident is being claimed.",
    alertType: "test-email",
    reportUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/report/${scan.id}`,
  });

  const { data: deliveryRun } = await supabase
    .from("email_provider_delivery_runs")
    .insert({
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      provider: settings.provider || "resend",
      delivery_type: "test-email",
      recipient_email: settings.recipient_email,
      from_email: settings.from_email,
      subject: email.subject,
      status: "queued",
      request_metadata: { testEmail: true },
    })
    .select("id")
    .single();

  const result = await sendProviderEmail({
    provider: (settings.provider || "resend") as EmailProviderName,
    to: settings.recipient_email,
    fromEmail: settings.from_email,
    fromName: settings.from_name,
    replyTo: settings.reply_to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  await supabase
    .from("email_provider_delivery_runs")
    .update({
      status: result.status,
      provider_message_id: result.providerMessageId || null,
      error_message: result.errorMessage || null,
      response_metadata: result.responseMetadata || {},
      sent_at: result.status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", deliveryRun?.id)
    .eq("user_id", user.id);

  await supabase
    .from("email_provider_settings")
    .update({
      configuration_status:
        result.status === "sent"
          ? "ready"
          : result.status === "provider-not-configured"
            ? "missing-env"
            : "failed",
      configuration_notes:
        result.errorMessage || "Email provider test sent successfully.",
      last_test_sent_at:
        result.status === "sent" ? new Date().toISOString() : null,
      last_delivery_at:
        result.status === "sent" ? new Date().toISOString() : null,
    })
    .eq("user_id", user.id);

  await supabase.from("email_provider_events").insert({
    user_id: user.id,
    delivery_run_id: deliveryRun?.id || null,
    event_type: result.status === "sent" ? "test-email" : "email-failed",
    severity: result.status === "sent" ? "Info" : "Medium",
    title: result.status === "sent" ? "Test email sent" : "Test email failed",
    details: result.errorMessage || "Test email processed.",
    metadata: {
      providerStatus: result.status,
      providerMessageId: result.providerMessageId,
    },
  });

  revalidatePath(`/report/${scan.id}/email-delivery`);
  redirect(
    `/report/${scan.id}/email-delivery?message=${encodeURIComponent(
      result.status === "sent"
        ? "Test email sent successfully."
        : `Test email not sent: ${result.errorMessage || result.status}`,
    )}`,
  );
}

export async function processPendingAlertEmails(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const { supabase, user, scan } = await getUserAndScan(scanId);

  const { data: settings } = await supabase
    .from("email_provider_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.enabled || !settings?.recipient_email) {
    redirect(
      `/report/${scan.id}/email-delivery?message=${encodeURIComponent("Email provider is not enabled or recipient is missing.")}`,
    );
  }

  const { data: alerts } = await supabase
    .from("security_alert_notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("source_scan_id", scan.id)
    .neq("email_delivery_status", "sent")
    .order("created_at", { ascending: false })
    .limit(25);

  if (!alerts?.length) {
    redirect(
      `/report/${scan.id}/email-delivery?message=${encodeURIComponent("No pending alert emails found for this scan. Generate alerts first.")}`,
    );
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const alert of alerts as Record<string, unknown>[]) {
    const severity = stringValue(alert.severity, "Info") as
      "Critical" | "High" | "Medium" | "Low" | "Info";

    if (
      !shouldSendSeverity(
        severity,
        stringValue(settings.minimum_severity, "Medium"),
      )
    ) {
      skipped += 1;
      await supabase
        .from("security_alert_notifications")
        .update({ email_delivery_status: "skipped" })
        .eq("id", alert.id)
        .eq("user_id", user.id);
      continue;
    }

    const email = buildSecurityAlertEmail({
      websiteUrl: scan.website_url,
      title: stringValue(alert.title, "Security alert"),
      severity,
      details: stringValue(
        alert.details || alert.message || alert.description,
        "Security alert requires review.",
      ),
      alertType: stringValue(
        alert.alert_type || alert.notification_type || alert.event_type,
        "security-alert",
      ),
      scoreDelta: numberValue(alert.score_delta),
      riskCurrent: stringValue(alert.risk_current || alert.current_risk),
      riskBefore: stringValue(alert.risk_before || alert.previous_risk),
      reportUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/report/${scan.id}/alerts`,
    });

    const { data: deliveryRun } = await supabase
      .from("email_provider_delivery_runs")
      .insert({
        user_id: user.id,
        website_id: scan.website_id,
        source_scan_id: scan.id,
        notification_id: alert.id,
        provider: settings.provider || "resend",
        delivery_type: "security-alert",
        recipient_email: settings.recipient_email,
        from_email: settings.from_email,
        subject: email.subject,
        status: "queued",
        request_metadata: { alertId: alert.id, severity },
      })
      .select("id")
      .single();

    const result = await sendProviderEmail({
      provider: (settings.provider || "resend") as EmailProviderName,
      to: settings.recipient_email,
      fromEmail: settings.from_email,
      fromName: settings.from_name,
      replyTo: settings.reply_to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    await supabase
      .from("email_provider_delivery_runs")
      .update({
        status: result.status,
        provider_message_id: result.providerMessageId || null,
        error_message: result.errorMessage || null,
        response_metadata: result.responseMetadata || {},
        sent_at: result.status === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", deliveryRun?.id)
      .eq("user_id", user.id);

    await supabase
      .from("security_alert_notifications")
      .update({
        email_delivery_status: result.status,
        email_provider_message_id: result.providerMessageId || null,
        email_last_error: result.errorMessage || null,
        email_sent_at:
          result.status === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", alert.id)
      .eq("user_id", user.id);

    await supabase.from("email_provider_events").insert({
      user_id: user.id,
      delivery_run_id: deliveryRun?.id || null,
      event_type:
        result.status === "sent"
          ? "email-sent"
          : result.status === "skipped"
            ? "email-skipped"
            : "email-failed",
      severity: result.status === "sent" ? "Info" : "Medium",
      title:
        result.status === "sent"
          ? "Security alert email sent"
          : "Security alert email failed",
      details:
        result.errorMessage || `Email processed for ${scan.website_url}.`,
      metadata: {
        alertId: alert.id,
        providerStatus: result.status,
        providerMessageId: result.providerMessageId,
      },
    });

    if (result.status === "sent") sent += 1;
    else if (result.status === "skipped") skipped += 1;
    else failed += 1;
  }

  await supabase
    .from("email_provider_settings")
    .update({
      last_delivery_at:
        sent > 0 ? new Date().toISOString() : settings.last_delivery_at,
    })
    .eq("user_id", user.id);

  revalidatePath(`/report/${scan.id}/email-delivery`);
  redirect(
    `/report/${scan.id}/email-delivery?message=${encodeURIComponent(
      `Processed alert emails. Sent: ${sent}, failed/not configured: ${failed}, skipped: ${skipped}.`,
    )}`,
  );
}
