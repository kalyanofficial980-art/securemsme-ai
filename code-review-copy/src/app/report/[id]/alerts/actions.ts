"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildAlertNotifications,
  buildAlertPolicy,
  normalizeAlertSeverity,
} from "@/lib/alert-notification-engine";
import { createClient } from "@/lib/supabase/server";

function parseAlertTypes(formData: FormData) {
  const values = formData.getAll("alertTypes").map(String).filter(Boolean);
  return values.length ? values : ["score-drop", "risk-increase", "regression"];
}

export async function saveAlertPreferences(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const inAppEnabled = formData.get("inAppEnabled") === "on";
  const emailEnabled = formData.get("emailEnabled") === "on";
  const recipientEmail = String(formData.get("recipientEmail") || "").trim();
  const minSeverity = normalizeAlertSeverity(formData.get("minSeverity"));
  const alertTypes = parseAlertTypes(formData);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to save alert preferences");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, website_url")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const policy = buildAlertPolicy({
    websiteUrl: scan.website_url,
    inAppEnabled,
    emailEnabled,
    recipientEmail,
    minSeverity,
    alertTypes,
  });

  const { data: existing } = scan.website_id
    ? await supabase
        .from("alert_preferences")
        .select("id")
        .eq("user_id", user.id)
        .eq("website_id", scan.website_id)
        .limit(1)
        .maybeSingle()
    : await supabase
        .from("alert_preferences")
        .select("id")
        .eq("user_id", user.id)
        .eq("website_url", scan.website_url)
        .limit(1)
        .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("alert_preferences")
      .update({
        status: "active",
        in_app_enabled: inAppEnabled,
        email_enabled: emailEnabled,
        recipient_email: recipientEmail || null,
        min_severity: minSeverity,
        alert_types: alertTypes,
        policy,
      })
      .eq("id", existing.id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("alert_preferences").insert({
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      website_url: scan.website_url,
      status: "active",
      in_app_enabled: inAppEnabled,
      email_enabled: emailEnabled,
      recipient_email: recipientEmail || null,
      min_severity: minSeverity,
      alert_types: alertTypes,
      policy,
    });
  }

  revalidatePath(`/report/${scan.id}/alerts`);
  redirect(
    `/report/${scan.id}/alerts?message=${encodeURIComponent("Alert preferences saved.")}`,
  );
}

export async function generateAlertsFromMonitoring(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to generate alerts");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, website_url")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: prefs } = scan.website_id
    ? await supabase
        .from("alert_preferences")
        .select(
          "id, in_app_enabled, email_enabled, recipient_email, min_severity, alert_types",
        )
        .eq("user_id", user.id)
        .eq("website_id", scan.website_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : await supabase
        .from("alert_preferences")
        .select(
          "id, in_app_enabled, email_enabled, recipient_email, min_severity, alert_types",
        )
        .eq("user_id", user.id)
        .eq("website_url", scan.website_url)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (!prefs?.id) {
    redirect(
      `/report/${scan.id}/alerts?message=${encodeURIComponent("Save alert preferences first.")}`,
    );
  }

  const { data: events } = scan.website_id
    ? await supabase
        .from("monitoring_events")
        .select(
          "id, event_type, severity, title, details, metadata, created_at",
        )
        .eq("user_id", user.id)
        .eq("website_id", scan.website_id)
        .order("created_at", { ascending: false })
        .limit(20)
    : await supabase
        .from("monitoring_events")
        .select(
          "id, event_type, severity, title, details, metadata, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

  const notifications = buildAlertNotifications({
    websiteUrl: scan.website_url,
    scanId: scan.id,
    events: events || [],
    minSeverity: normalizeAlertSeverity(prefs.min_severity),
    alertTypes: Array.isArray(prefs.alert_types)
      ? prefs.alert_types
      : ["score-drop", "risk-increase", "regression"],
    inAppEnabled: Boolean(prefs.in_app_enabled),
    emailEnabled: Boolean(prefs.email_enabled),
    recipientEmail: prefs.recipient_email,
  });

  if (notifications.length) {
    await supabase.from("security_alert_notifications").insert(
      notifications.map((notification) => ({
        user_id: user.id,
        website_id: scan.website_id,
        source_scan_id: scan.id,
        monitoring_event_id: notification.monitoringEventId,
        alert_preference_id: prefs.id,
        website_url: scan.website_url,
        channel: notification.channel,
        recipient: notification.recipient,
        alert_type: notification.alertType,
        severity: notification.severity,
        title: notification.title,
        message: notification.message,
        action_url: notification.actionUrl,
        status: "queued",
        delivery_mode: "development-simulated",
        payload: notification.payload,
      })),
    );
  }

  revalidatePath(`/report/${scan.id}/alerts`);
  redirect(
    `/report/${scan.id}/alerts?message=${encodeURIComponent(
      `${notifications.length} alert notification(s) queued from monitoring events.`,
    )}`,
  );
}

export async function processPendingAlertNotifications(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login");

  const { data: notifications } = await supabase
    .from("security_alert_notifications")
    .select("id, user_id, channel")
    .eq("user_id", user.id)
    .eq("source_scan_id", scanId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(25);

  for (const notification of notifications || []) {
    await supabase
      .from("security_alert_notifications")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", notification.id)
      .eq("user_id", user.id);

    await supabase.from("security_alert_delivery_attempts").insert({
      notification_id: notification.id,
      user_id: user.id,
      channel: notification.channel,
      provider: "development-simulated",
      attempt_number: 1,
      status: "sent",
      response: {
        mode: "development-simulated",
        note: "No real email provider called. Provider integration comes next.",
      },
    });
  }

  revalidatePath(`/report/${scanId}/alerts`);
  redirect(
    `/report/${scanId}/alerts?message=${encodeURIComponent("Pending alert notifications processed in development-simulated mode.")}`,
  );
}
