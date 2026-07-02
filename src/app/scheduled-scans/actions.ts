"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildEmailTemplate,
  calculateNextRunAt,
  evaluateScheduledRun,
  scheduledScanBlockedClaims,
  validateScheduleInput,
} from "@/lib/scheduled-scans-email-alerts-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to use scheduled scans");
  return { supabase, user };
}

async function ensureEmailPrefs(supabase: any, user: any, email?: string) {
  const { data: existing } = await supabase
    .from("email_alert_preferences_v2")
    .select(
      "id, alert_email, alert_status, send_high_risk_alerts, send_regression_alerts, send_scan_summary",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.id) return existing;

  const { data: prefs } = await supabase
    .from("email_alert_preferences_v2")
    .insert({
      user_id: user.id,
      alert_email: email || user.email || "",
      alert_status: "enabled",
      consent_status: "consented",
    })
    .select(
      "id, alert_email, alert_status, send_high_risk_alerts, send_regression_alerts, send_scan_summary",
    )
    .single();

  return prefs;
}

export async function saveEmailAlertPreferencesAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const alertEmail = clean(formData.get("alertEmail"));

  await supabase.from("email_alert_preferences_v2").upsert(
    {
      user_id: user.id,
      alert_email: alertEmail || user.email || "",
      alert_status: clean(formData.get("alertStatus"), "enabled"),
      send_scan_summary: clean(formData.get("sendScanSummary")) === "on",
      send_high_risk_alerts: clean(formData.get("sendHighRiskAlerts")) === "on",
      send_regression_alerts:
        clean(formData.get("sendRegressionAlerts")) === "on",
      send_billing_alerts: clean(formData.get("sendBillingAlerts")) === "on",
      send_weekly_digest: clean(formData.get("sendWeeklyDigest")) === "on",
      quiet_hours_enabled: clean(formData.get("quietHoursEnabled")) === "on",
      quiet_hours_start: clean(formData.get("quietHoursStart"), "22:00"),
      quiet_hours_end: clean(formData.get("quietHoursEnd"), "07:00"),
      consent_status: "consented",
    },
    { onConflict: "user_id" },
  );

  revalidatePath("/scheduled-scans");
  redirect("/scheduled-scans?message=Email alert preferences saved.");
}

export async function createScheduledScanTargetAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const decision = validateScheduleInput({
    targetUrl: clean(formData.get("targetUrl")),
    targetName: clean(formData.get("targetName")),
    frequency: clean(formData.get("frequency"), "weekly") as any,
    preferredHour: Number(clean(formData.get("preferredHour"), "9")),
    alertEmail: clean(formData.get("alertEmail")),
    authorizationConfirmed:
      clean(formData.get("authorizationConfirmed")) === "on",
    emailAlertsEnabled: clean(formData.get("emailAlertsEnabled")) === "on",
    riskThreshold: clean(formData.get("riskThreshold"), "High") as any,
  });

  if (!decision.valid) {
    redirect(
      `/scheduled-scans?message=${encodeURIComponent(decision.errors.join(" "))}`,
    );
  }

  await ensureEmailPrefs(supabase, user, clean(formData.get("alertEmail")));

  const { data: target, error } = await supabase
    .from("scheduled_scan_targets_v2")
    .insert({
      user_id: user.id,
      scan_id: clean(formData.get("scanId")) || null,
      target_url: decision.normalizedUrl,
      target_name: clean(formData.get("targetName")) || decision.normalizedUrl,
      schedule_status: "active",
      schedule_frequency: clean(formData.get("frequency"), "weekly"),
      schedule_scope: "safe-public-checks",
      timezone: clean(formData.get("timezone"), "Asia/Kolkata"),
      preferred_hour: Number(clean(formData.get("preferredHour"), "9")),
      next_run_at: decision.nextRunAt,
      authorization_confirmed: true,
      authorization_note: clean(formData.get("authorizationNote")),
      email_alerts_enabled: clean(formData.get("emailAlertsEnabled")) === "on",
      alert_email_override: clean(formData.get("alertEmail")),
      risk_threshold: clean(formData.get("riskThreshold"), "High"),
      blocked_claims: scheduledScanBlockedClaims,
      target_payload: { safeSchedule: true },
    })
    .select("id")
    .single();

  if (error || !target?.id) {
    redirect(
      `/scheduled-scans?message=${encodeURIComponent(error?.message || "Could not create schedule")}`,
    );
  }

  await supabase.from("email_alert_events_v2").insert({
    schedule_target_id: target.id,
    user_id: user.id,
    event_type: "schedule-created",
    severity: "Info",
    title: "Scheduled scan target created",
    details: `Scheduled safe checks for ${decision.normalizedUrl}.`,
    metadata: { frequency: clean(formData.get("frequency"), "weekly") },
  });

  revalidatePath("/scheduled-scans");
  redirect(
    `/scheduled-scans?target=${target.id}&message=Scheduled scan target created.`,
  );
}

export async function updateScheduledScanStatusAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const targetId = clean(formData.get("targetId"));
  const status = clean(formData.get("scheduleStatus"), "paused");

  await supabase
    .from("scheduled_scan_targets_v2")
    .update({ schedule_status: status })
    .eq("id", targetId)
    .eq("user_id", user.id);

  await supabase.from("email_alert_events_v2").insert({
    schedule_target_id: targetId,
    user_id: user.id,
    event_type: "schedule-updated",
    severity: status === "active" ? "Info" : "Low",
    title: "Scheduled scan status updated",
    details: `Schedule status changed to ${status}.`,
    metadata: { status },
  });

  revalidatePath("/scheduled-scans");
  redirect("/scheduled-scans?message=Schedule status updated.");
}

async function countTable(
  supabase: any,
  table: string,
  userId: string,
  scanId?: string,
  extra?: (query: any) => any,
) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (scanId) query = query.eq("scan_id", scanId);
  if (extra) query = extra(query);
  const { count } = await query;
  return count || 0;
}

export async function runScheduledScanNowAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const targetId = clean(formData.get("targetId"));

  const { data: target } = await supabase
    .from("scheduled_scan_targets_v2")
    .select(
      "id, scan_id, target_url, target_name, schedule_frequency, risk_threshold, email_alerts_enabled, alert_email_override",
    )
    .eq("id", targetId)
    .eq("user_id", user.id)
    .single();

  if (!target?.id)
    redirect("/scheduled-scans?message=Schedule target not found.");

  const sourceCounts = {
    latestScans: await countTable(supabase, "scans", user.id),
    monitoringAlerts: await countTable(
      supabase,
      "monitoring_regression_alerts_v2",
      user.id,
      target.scan_id || undefined,
      (query: any) => query.neq("alert_status", "resolved"),
    ),
    highRiskAlerts: await countTable(
      supabase,
      "monitoring_regression_alerts_v2",
      user.id,
      target.scan_id || undefined,
      (query: any) =>
        query
          .in("severity", ["Critical", "High"])
          .neq("alert_status", "resolved"),
    ),
    openDeveloperTasks: await countTable(
      supabase,
      "developer_fix_tasks_v2",
      user.id,
      target.scan_id || undefined,
      (query: any) => query.neq("task_status", "done"),
    ),
    aiTriageRuns: await countTable(
      supabase,
      "ai_triage_runs_v2",
      user.id,
      target.scan_id || undefined,
    ),
  };

  const decision = evaluateScheduledRun(
    sourceCounts,
    target.risk_threshold || "High",
  );

  const { data: run, error } = await supabase
    .from("scheduled_scan_runs_v2")
    .insert({
      schedule_target_id: target.id,
      user_id: user.id,
      scan_id: target.scan_id || null,
      run_status: "completed",
      run_type: "manual-scheduled-check",
      target_url: target.target_url,
      risk_level: decision.riskLevel,
      risk_score: decision.riskScore,
      summary: decision.summary,
      detected_change_summary: decision.detectedChangeSummary,
      safe_next_action: decision.safeNextAction,
      email_should_send: decision.emailShouldSend,
      email_reason: decision.emailReason,
      source_counts: sourceCounts,
      completed_at: new Date().toISOString(),
      run_payload: { safeScheduledRun: true },
    })
    .select("id")
    .single();

  if (error || !run?.id) {
    redirect(
      `/scheduled-scans?message=${encodeURIComponent(error?.message || "Could not create scheduled run")}`,
    );
  }

  const nextRunAt = calculateNextRunAt(
    target.schedule_frequency || "weekly",
    9,
  );
  await supabase
    .from("scheduled_scan_targets_v2")
    .update({ last_run_at: new Date().toISOString(), next_run_at: nextRunAt })
    .eq("id", target.id)
    .eq("user_id", user.id);

  let alertId = null;
  if (decision.emailShouldSend || decision.alertType !== "scan-summary") {
    const { data: alert } = await supabase
      .from("scheduled_scan_alerts_v2")
      .insert({
        scheduled_run_id: run.id,
        schedule_target_id: target.id,
        user_id: user.id,
        alert_type: decision.alertType,
        alert_status: "open",
        severity: decision.riskLevel,
        alert_title: `${decision.riskLevel} scheduled scan alert`,
        alert_body: decision.summary,
        client_safe_summary: decision.detectedChangeSummary,
        developer_action: decision.safeNextAction,
        evidence_summary: decision.emailReason,
        alert_payload: { sourceCounts },
      })
      .select("id")
      .single();
    alertId = alert?.id || null;
  }

  const prefs = await ensureEmailPrefs(
    supabase,
    user,
    target.alert_email_override || user.email || "",
  );
  const recipient =
    target.alert_email_override || prefs?.alert_email || user.email || "";
  const emailEnabled =
    target.email_alerts_enabled &&
    prefs?.alert_status === "enabled" &&
    recipient;

  if (decision.emailShouldSend && emailEnabled) {
    const template = buildEmailTemplate({
      targetUrl: target.target_url,
      riskLevel: decision.riskLevel,
      riskScore: decision.riskScore,
      summary: decision.summary,
      safeNextAction: decision.safeNextAction,
      alertType: decision.alertType,
    });

    const { data: email } = await supabase
      .from("email_alert_queue_v2")
      .insert({
        user_id: user.id,
        schedule_target_id: target.id,
        scheduled_run_id: run.id,
        alert_id: alertId,
        recipient_email: recipient,
        email_subject: template.subject,
        email_body: template.body,
        email_type:
          decision.alertType === "high-risk"
            ? "high-risk"
            : decision.alertType === "regression"
              ? "regression"
              : "scan-summary",
        delivery_status: "provider-not-configured",
        delivery_provider: "manual-queue",
        email_payload: { providerNeeded: true },
      })
      .select("id")
      .single();

    await supabase.from("email_alert_events_v2").insert({
      email_queue_id: email?.id || null,
      schedule_target_id: target.id,
      scheduled_run_id: run.id,
      user_id: user.id,
      event_type: "email-queued",
      severity: decision.riskLevel,
      title: "Email alert queued",
      details:
        "Email alert queued. Delivery provider is not configured yet, so status is provider-not-configured.",
      metadata: { recipient },
    });
  } else {
    await supabase.from("email_alert_events_v2").insert({
      schedule_target_id: target.id,
      scheduled_run_id: run.id,
      user_id: user.id,
      event_type: "email-suppressed",
      severity: "Info",
      title: "Email alert suppressed",
      details: decision.emailShouldSend
        ? "Email preferences or recipient disabled delivery."
        : "Risk threshold did not require email alert.",
      metadata: { emailEnabled },
    });
  }

  revalidatePath("/scheduled-scans");
  redirect(
    `/scheduled-scans?target=${target.id}&message=Scheduled safe check completed.`,
  );
}
