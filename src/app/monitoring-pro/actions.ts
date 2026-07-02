"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildAgencySocSummary,
  buildMonitoringRun,
  topIssueForClient,
} from "@/lib/monitoring-pro-agency-soc-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to continue");
  return { supabase, user };
}

async function countTable(
  supabase: any,
  table: string,
  scanId: string,
  userId: string,
  extra?: (query: any) => any,
) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("scan_id", scanId)
    .eq("user_id", userId);
  if (extra) query = extra(query);
  const { count } = await query;
  return count || 0;
}

export async function createMonitoringTargetAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, website_id, organization_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: existing } = await supabase
    .from("monitoring_pro_targets_v2")
    .select("id")
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.id) {
    redirect(
      `/report/${scan.id}/monitoring-pro?target=${existing.id}&message=${encodeURIComponent("Monitoring target already exists.")}`,
    );
  }

  const { data: target, error } = await supabase
    .from("monitoring_pro_targets_v2")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      target_url: scan.website_url,
      target_name: "Monitored website",
      monitoring_status: "active",
      monitoring_mode: "passive-safe",
      monitoring_summary:
        "Monitoring target created. Run Monitoring Pro to generate passive regression signals.",
      client_safe_summary:
        "Monitoring is active but no run has been generated yet.",
      developer_summary:
        "Create a monitoring run after report/fix/retest data exists.",
      safety_summary:
        "Passive-safe monitoring only. No exploit payloads or destructive tests.",
      blocked_claims: [
        "No 100% security claim",
        "No breach claim without confirmed evidence",
        "No legal compliance certificate claim",
      ],
    })
    .select("id")
    .single();

  if (error || !target?.id) {
    redirect(
      `/report/${scan.id}/monitoring-pro?message=${encodeURIComponent(error?.message || "Could not create monitoring target")}`,
    );
  }

  await supabase.from("monitoring_soc_events_v2").insert({
    target_id: target.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    event_type: "target-created",
    severity: "Info",
    title: "Monitoring target created",
    details: "Passive-safe Monitoring Pro target created.",
    metadata: { targetUrl: scan.website_url },
  });

  revalidatePath(`/report/${scan.id}/monitoring-pro`);
  redirect(
    `/report/${scan.id}/monitoring-pro?target=${target.id}&message=${encodeURIComponent("Monitoring target created.")}`,
  );
}

export async function runMonitoringProAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));
  const targetId = clean(formData.get("targetId"));

  const { data: target } = await supabase
    .from("monitoring_pro_targets_v2")
    .select("id, organization_id, target_url, last_health_score")
    .eq("id", targetId)
    .eq("user_id", user.id)
    .single();

  if (!target)
    redirect(
      `/report/${scanId}/monitoring-pro?message=Monitoring target not found`,
    );

  const { data: report } = await supabase
    .from("client_report_v4_snapshots")
    .select("executive_score, report_readiness_score")
    .eq("scan_id", scanId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: developerPortal } = await supabase
    .from("developer_fix_portals_v2")
    .select("fix_progress_score, open_task_count, verified_fixed_count")
    .eq("scan_id", scanId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: retestRun } = await supabase
    .from("retest_automation_runs_v2")
    .select(
      "retest_pass_rate, client_readiness_score, failed_count, passed_count",
    )
    .eq("scan_id", scanId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: clientPortal } = await supabase
    .from("client_portal_pro_links_v2")
    .select("client_readiness_score")
    .eq("scan_id", scanId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const reportSnapshots = await countTable(
    supabase,
    "client_report_v4_snapshots",
    scanId,
    user.id,
  );
  const developerPortals = await countTable(
    supabase,
    "developer_fix_portals_v2",
    scanId,
    user.id,
  );
  const retestRuns = await countTable(
    supabase,
    "retest_automation_runs_v2",
    scanId,
    user.id,
  );
  const clientPortalLinks = await countTable(
    supabase,
    "client_portal_pro_links_v2",
    scanId,
    user.id,
  );
  const openAlerts = await countTable(
    supabase,
    "monitoring_regression_alerts_v2",
    scanId,
    user.id,
    (query: any) => query.eq("alert_status", "open"),
  );

  const runDraft = buildMonitoringRun({
    targetUrl: target.target_url,
    previousHealthScore: target.last_health_score || null,
    reportReadinessScore: report?.report_readiness_score || 0,
    executiveScore: report?.executive_score || 0,
    fixProgressScore: developerPortal?.fix_progress_score || 0,
    retestPassRate: retestRun?.retest_pass_rate || 0,
    clientReadinessScore:
      clientPortal?.client_readiness_score ||
      retestRun?.client_readiness_score ||
      0,
    sourceCounts: {
      reportSnapshots,
      developerPortals,
      retestRuns,
      clientPortalLinks,
      openDeveloperTasks: developerPortal?.open_task_count || 0,
      failedRetestItems: retestRun?.failed_count || 0,
      passedRetestItems: retestRun?.passed_count || 0,
      openAlerts,
    },
  });

  const { data: run, error } = await supabase
    .from("monitoring_pro_runs_v2")
    .insert({
      target_id: target.id,
      user_id: user.id,
      organization_id: target.organization_id,
      scan_id: scanId,
      run_status: "completed",
      run_type: "passive-regression",
      health_score: runDraft.healthScore,
      regression_score: runDraft.regressionScore,
      risk_score: runDraft.riskScore,
      client_readiness_score: runDraft.clientReadinessScore,
      source_counts: runDraft.sourceCounts,
      run_summary: runDraft.runSummary,
      regression_summary: runDraft.regressionSummary,
      alert_summary: runDraft.alertSummary,
      run_payload: { safeMonitoring: true },
    })
    .select("id")
    .single();

  if (error || !run?.id) {
    redirect(
      `/report/${scanId}/monitoring-pro?target=${targetId}&message=${encodeURIComponent(error?.message || "Could not create monitoring run")}`,
    );
  }

  if (runDraft.alerts.length) {
    await supabase.from("monitoring_regression_alerts_v2").insert(
      runDraft.alerts.map((alert: any) => ({
        target_id: target.id,
        run_id: run.id,
        user_id: user.id,
        organization_id: target.organization_id,
        scan_id: scanId,
        alert_status: "open",
        alert_type: alert.alertType,
        severity: alert.severity,
        alert_title: alert.alertTitle,
        affected_area: alert.affectedArea,
        before_summary: alert.beforeSummary,
        after_summary: alert.afterSummary,
        evidence_summary: alert.evidenceSummary,
        developer_action: alert.developerAction,
        client_safe_note: alert.clientSafeNote,
        blocked_claim: alert.blockedClaim,
        alert_payload: alert.alertPayload,
      })),
    );
  }

  const openAlertCount = openAlerts + runDraft.alerts.length;
  const criticalAlertCount = runDraft.alerts.filter(
    (alert: any) => alert.severity === "Critical",
  ).length;
  const highAlertCount = runDraft.alerts.filter(
    (alert: any) => alert.severity === "High",
  ).length;

  await supabase
    .from("monitoring_pro_targets_v2")
    .update({
      last_health_score: runDraft.healthScore,
      last_regression_score: runDraft.regressionScore,
      last_risk_score: runDraft.riskScore,
      last_client_readiness_score: runDraft.clientReadinessScore,
      open_alert_count: openAlertCount,
      critical_alert_count: criticalAlertCount,
      high_alert_count: highAlertCount,
      regression_count: runDraft.regressionScore >= 35 ? 1 : 0,
      verified_fixed_count:
        developerPortal?.verified_fixed_count || retestRun?.passed_count || 0,
      monitoring_summary: runDraft.monitoringSummary,
      client_safe_summary: runDraft.clientSafeSummary,
      developer_summary: runDraft.developerSummary,
      safety_summary: runDraft.safetySummary,
      blocked_claims: runDraft.blockedClaims,
      last_checked_at: new Date().toISOString(),
    })
    .eq("id", target.id)
    .eq("user_id", user.id);

  await supabase.from("monitoring_soc_events_v2").insert({
    target_id: target.id,
    run_id: run.id,
    user_id: user.id,
    organization_id: target.organization_id,
    scan_id: scanId,
    event_type: "monitoring-run-created",
    severity:
      runDraft.riskScore >= 65
        ? "High"
        : runDraft.regressionScore >= 35
          ? "Medium"
          : "Info",
    title: "Monitoring Pro run completed",
    details: runDraft.runSummary,
    metadata: { alerts: runDraft.alerts.length },
  });

  revalidatePath(`/report/${scanId}/monitoring-pro`);
  redirect(
    `/report/${scanId}/monitoring-pro?target=${target.id}&message=${encodeURIComponent("Monitoring Pro run completed.")}`,
  );
}

export async function updateMonitoringAlertAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));
  const targetId = clean(formData.get("targetId"));
  const alertId = clean(formData.get("alertId"));
  const status = clean(formData.get("alertStatus"), "acknowledged");

  await supabase
    .from("monitoring_regression_alerts_v2")
    .update({
      alert_status: status,
      acknowledged_at:
        status === "acknowledged" ? new Date().toISOString() : undefined,
      resolved_at: status === "resolved" ? new Date().toISOString() : undefined,
    })
    .eq("id", alertId)
    .eq("user_id", user.id);

  await supabase.from("monitoring_soc_events_v2").insert({
    target_id: targetId,
    alert_id: alertId,
    user_id: user.id,
    scan_id: scanId,
    event_type: "alert-updated",
    severity: "Info",
    title: "Monitoring alert updated",
    details: `Alert status changed to ${status}.`,
    metadata: { status },
  });

  revalidatePath(`/report/${scanId}/monitoring-pro`);
  redirect(
    `/report/${scanId}/monitoring-pro?target=${targetId}&message=${encodeURIComponent("Alert status updated.")}`,
  );
}

export async function createAgencySocSnapshotAction() {
  const { supabase, user } = await getAuthedSupabase();

  const { data: targets } = await supabase
    .from("monitoring_pro_targets_v2")
    .select(
      "id, organization_id, scan_id, target_name, target_url, last_health_score, last_risk_score, open_alert_count, regression_count, verified_fixed_count",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(200);

  const clients = (targets || []).map((target: any) => ({
    targetUrl: target.target_url,
    clientName: target.target_name || "Client website",
    healthScore: target.last_health_score || 0,
    riskScore: target.last_risk_score || 0,
    openAlertCount: target.open_alert_count || 0,
    regressionCount: target.regression_count || 0,
    verifiedFixedCount: target.verified_fixed_count || 0,
  }));

  const summary = buildAgencySocSummary(clients);

  const { data: snapshot, error } = await supabase
    .from("agency_soc_snapshots_v2")
    .insert({
      user_id: user.id,
      snapshot_status: "active",
      total_client_count: summary.totalClientCount,
      active_monitoring_count: summary.activeMonitoringCount,
      open_alert_count: summary.openAlertCount,
      critical_alert_count: summary.criticalAlertCount,
      high_alert_count: summary.highAlertCount,
      regression_count: summary.regressionCount,
      verified_fixed_count: summary.verifiedFixedCount,
      agency_health_score: summary.agencyHealthScore,
      agency_risk_score: summary.agencyRiskScore,
      agency_response_score: summary.agencyResponseScore,
      executive_summary: summary.executiveSummary,
      operations_summary: summary.operationsSummary,
      client_safe_summary: summary.clientSafeSummary,
      blocked_claims: summary.blockedClaims,
      snapshot_payload: { safeAgencySoc: true },
    })
    .select("id")
    .single();

  if (error || !snapshot?.id) {
    redirect(
      `/agency-soc?message=${encodeURIComponent(error?.message || "Could not create SOC snapshot")}`,
    );
  }

  if (targets?.length) {
    await supabase.from("agency_soc_client_risks_v2").insert(
      targets.map((target: any) => ({
        snapshot_id: snapshot.id,
        target_id: target.id,
        user_id: user.id,
        organization_id: target.organization_id,
        scan_id: target.scan_id,
        client_name: target.target_name || "Client website",
        target_url: target.target_url,
        risk_level:
          (target.last_risk_score || 0) >= 85
            ? "Critical"
            : (target.last_risk_score || 0) >= 65
              ? "High"
              : (target.last_risk_score || 0) >= 35
                ? "Medium"
                : (target.last_risk_score || 0) >= 10
                  ? "Low"
                  : "Info",
        risk_score: target.last_risk_score || 0,
        health_score: target.last_health_score || 0,
        open_alert_count: target.open_alert_count || 0,
        regression_count: target.regression_count || 0,
        top_issue: topIssueForClient({
          targetUrl: target.target_url,
          healthScore: target.last_health_score || 0,
          riskScore: target.last_risk_score || 0,
          openAlertCount: target.open_alert_count || 0,
          regressionCount: target.regression_count || 0,
          verifiedFixedCount: target.verified_fixed_count || 0,
        }),
        recommended_action:
          "Review highest-risk alerts first, then failed retests and open developer tasks.",
        client_safe_note:
          "Client risk is based on passive monitoring and available report/retest sources.",
        risk_payload: { safeAgencySoc: true },
      })),
    );
  }

  await supabase.from("monitoring_soc_events_v2").insert({
    snapshot_id: snapshot.id,
    user_id: user.id,
    event_type: "soc-snapshot-created",
    severity: summary.agencyRiskScore >= 65 ? "High" : "Info",
    title: "Agency SOC snapshot created",
    details: summary.executiveSummary,
    metadata: { clientCount: summary.totalClientCount },
  });

  revalidatePath("/agency-soc");
  redirect(
    `/agency-soc?snapshot=${snapshot.id}&message=${encodeURIComponent("Agency SOC snapshot created.")}`,
  );
}
