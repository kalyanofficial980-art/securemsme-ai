"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildTriageRun,
  evaluateUsageLimit,
  type BillingPlan,
  type TriageInputItem,
} from "@/lib/billing-ai-triage-engine";
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

function dbPlanToEnginePlan(plan: any): BillingPlan {
  return {
    planKey: plan.plan_key,
    planName: plan.plan_name,
    monthlyPriceInr: plan.monthly_price_inr,
    monthlyPriceUsd: plan.monthly_price_usd,
    scanLimit: plan.scan_limit,
    websiteLimit: plan.website_limit,
    reportLimit: plan.report_limit,
    clientPortalLimit: plan.client_portal_limit,
    monitoringTargetLimit: plan.monitoring_target_limit,
    aiTriageLimit: plan.ai_triage_limit,
    teamMemberLimit: plan.team_member_limit,
  };
}

async function ensureBillingProfile(supabase: any, userId: string) {
  const { data: existing } = await supabase
    .from("user_billing_profiles_v2")
    .select(
      "id, plan_key, billing_status, current_period_start, current_period_end",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.id) return existing;

  const { data: profile } = await supabase
    .from("user_billing_profiles_v2")
    .insert({
      user_id: userId,
      plan_key: "free",
      billing_status: "active",
      billing_summary: "Free billing profile created.",
      limit_summary: "Free plan usage limits are active.",
      blocked_claims: [
        "No real payment processor is connected in this foundation.",
        "Do not claim payment collection until provider integration is added.",
      ],
    })
    .select(
      "id, plan_key, billing_status, current_period_start, current_period_end",
    )
    .single();

  await supabase.from("billing_ai_triage_events_v2").insert({
    billing_profile_id: profile?.id || null,
    user_id: userId,
    event_type: "billing-profile-created",
    severity: "Info",
    title: "Billing profile created",
    details: "Free billing profile created for usage metering.",
    metadata: { planKey: "free" },
  });

  return profile;
}

async function ensureUsageCounter(
  supabase: any,
  userId: string,
  periodStart: string,
  periodEnd: string,
) {
  const { data: existing } = await supabase
    .from("usage_counters_v2")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();

  if (existing?.id) return existing;

  const { data: counter } = await supabase
    .from("usage_counters_v2")
    .insert({
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
    })
    .select("*")
    .single();

  return counter;
}

export async function ensureBillingProfileAction() {
  const { supabase, user } = await getAuthedSupabase();
  await ensureBillingProfile(supabase, user.id);
  revalidatePath("/billing-ai-triage");
  redirect("/billing-ai-triage?message=Billing profile ready.");
}

export async function changePlanAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const planKey = clean(formData.get("planKey"), "free");

  const profile = await ensureBillingProfile(supabase, user.id);

  await supabase
    .from("user_billing_profiles_v2")
    .update({
      plan_key: planKey,
      billing_status: "active",
      payment_provider: "manual",
      billing_summary: `Manual plan set to ${planKey}.`,
      limit_summary: "Usage limits updated for selected plan.",
      billing_payload: { manualPlanChange: true },
    })
    .eq("id", profile.id)
    .eq("user_id", user.id);

  await supabase.from("billing_ai_triage_events_v2").insert({
    billing_profile_id: profile.id,
    user_id: user.id,
    event_type: "billing-ai-triage-event",
    severity: "Info",
    title: "Plan changed manually",
    details: `Billing plan changed to ${planKey}.`,
    metadata: { planKey },
  });

  revalidatePath("/billing-ai-triage");
  redirect("/billing-ai-triage?message=Plan updated.");
}

async function recordAiTriageUsage(
  supabase: any,
  userId: string,
  scanId: string,
) {
  const profile = await ensureBillingProfile(supabase, userId);
  const { data: planRow } = await supabase
    .from("billing_plan_catalog_v2")
    .select("*")
    .eq("plan_key", profile.plan_key)
    .single();

  const plan = dbPlanToEnginePlan(planRow);
  const counter = await ensureUsageCounter(
    supabase,
    userId,
    profile.current_period_start,
    profile.current_period_end,
  );

  const decision = evaluateUsageLimit(
    plan,
    {
      scansUsed: counter.scans_used || 0,
      websitesUsed: counter.websites_used || 0,
      reportsUsed: counter.reports_used || 0,
      clientPortalsUsed: counter.client_portals_used || 0,
      monitoringTargetsUsed: counter.monitoring_targets_used || 0,
      aiTriageUsed: counter.ai_triage_used || 0,
    },
    "aiTriage",
    1,
  );

  await supabase.from("usage_events_v2").insert({
    user_id: userId,
    scan_id: scanId,
    event_type: decision.allowed ? "ai-triage-run" : "limit-block",
    usage_key: "ai_triage",
    usage_amount: 1,
    plan_key: plan.planKey,
    limit_value: decision.limit,
    used_after_event: decision.used,
    event_status: decision.status,
    event_title: decision.allowed
      ? "AI triage usage recorded"
      : "AI triage limit blocked",
    event_details: decision.message,
    event_payload: decision,
  });

  if (decision.allowed) {
    await supabase
      .from("usage_counters_v2")
      .update({ ai_triage_used: decision.used })
      .eq("id", counter.id)
      .eq("user_id", userId);
  }

  return { allowed: decision.allowed, decision, profile };
}

export async function runAiTriageAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, website_id, organization_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const usage = await recordAiTriageUsage(supabase, user.id, scan.id);
  if (!usage.allowed) {
    redirect(
      `/report/${scan.id}/billing-ai-triage?message=${encodeURIComponent(usage.decision.message)}`,
    );
  }

  const inputs: TriageInputItem[] = [];

  const { data: developerTasks } = await supabase
    .from("developer_fix_tasks_v2")
    .select(
      "id, task_title, task_status, priority, confidence_level, affected_area, developer_fix, evidence_summary, client_safe_note",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .limit(100);

  for (const task of developerTasks || []) {
    inputs.push({
      sourceType: "developer-task",
      sourceId: task.id,
      title: task.task_title,
      status: task.task_status,
      severity:
        task.priority === "Critical" || task.priority === "High"
          ? task.priority
          : "Medium",
      confidence: task.confidence_level || "Medium",
      affectedArea: task.affected_area || "",
      evidenceSummary: task.evidence_summary || "",
      developerAction: task.developer_fix || "",
      clientSafeNote: task.client_safe_note || "",
    });
  }

  const { data: monitoringAlerts } = await supabase
    .from("monitoring_regression_alerts_v2")
    .select(
      "id, alert_title, alert_status, severity, affected_area, evidence_summary, developer_action, client_safe_note",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .limit(100);

  for (const alert of monitoringAlerts || []) {
    inputs.push({
      sourceType: "monitoring-alert",
      sourceId: alert.id,
      title: alert.alert_title,
      status: alert.alert_status,
      severity: alert.severity || "Medium",
      confidence: "High",
      affectedArea: alert.affected_area || "",
      evidenceSummary: alert.evidence_summary || "",
      developerAction: alert.developer_action || "",
      clientSafeNote: alert.client_safe_note || "",
      alertStatus: alert.alert_status,
    });
  }

  const { data: retestItems } = await supabase
    .from("retest_verification_items_v2")
    .select(
      "id, item_title, verification_status, priority, confidence_level, affected_area, pre_fix_evidence, fix_summary, client_safe_result",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .limit(100);

  for (const item of retestItems || []) {
    inputs.push({
      sourceType: "retest-item",
      sourceId: item.id,
      title: item.item_title,
      status: item.verification_status,
      severity:
        item.priority === "Critical" || item.priority === "High"
          ? item.priority
          : "Medium",
      confidence: item.confidence_level || "Medium",
      affectedArea: item.affected_area || "",
      evidenceSummary: item.pre_fix_evidence || "",
      developerAction: item.fix_summary || "",
      clientSafeNote: item.client_safe_result || "",
      retestStatus: item.verification_status,
    });
  }

  const { data: workspaceBugs } = await supabase
    .from("security_review_bug_items")
    .select(
      "id, title, status, severity, confidence, affected_area, developer_fix, evidence_summary, client_safe_summary",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .limit(100);

  for (const bug of workspaceBugs || []) {
    inputs.push({
      sourceType: "workspace-bug",
      sourceId: bug.id,
      title: bug.title,
      status: bug.status,
      severity: bug.severity || "Medium",
      confidence: bug.confidence || "Medium",
      affectedArea: bug.affected_area || "",
      evidenceSummary: bug.evidence_summary || "",
      developerAction: bug.developer_fix || "",
      clientSafeNote: bug.client_safe_summary || "",
    });
  }

  if (!inputs.length) {
    inputs.push({
      sourceType: "manual",
      title: "Generate security workflow evidence before triage",
      status: "needs-review",
      severity: "Medium",
      confidence: "Needs manual review",
      affectedArea: scan.website_url,
      evidenceSummary:
        "No developer, monitoring, retest or workspace items were available.",
      developerAction:
        "Run scanner, developer portal, retest and monitoring workflows before relying on triage.",
      clientSafeNote: "More evidence is needed before strong prioritization.",
    });
  }

  const runDraft = buildTriageRun(inputs);

  const { data: run, error } = await supabase
    .from("ai_triage_runs_v2")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      target_url: scan.website_url,
      run_status: "completed",
      triage_mode: "safe-rule-based",
      total_item_count: runDraft.totalItemCount,
      urgent_count: runDraft.urgentCount,
      high_priority_count: runDraft.highPriorityCount,
      quick_win_count: runDraft.quickWinCount,
      needs_review_count: runDraft.needsReviewCount,
      accepted_risk_count: runDraft.acceptedRiskCount,
      triage_score: runDraft.triageScore,
      business_impact_score: runDraft.businessImpactScore,
      remediation_efficiency_score: runDraft.remediationEfficiencyScore,
      confidence_score: runDraft.confidenceScore,
      executive_summary: runDraft.executiveSummary,
      developer_summary: runDraft.developerSummary,
      client_safe_summary: runDraft.clientSafeSummary,
      limitations_summary: runDraft.limitationsSummary,
      blocked_claims: runDraft.blockedClaims,
      source_counts: runDraft.sourceCounts,
      run_payload: { safeRuleBased: true, noExploitPayloads: true },
    })
    .select("id")
    .single();

  if (error || !run?.id) {
    redirect(
      `/report/${scan.id}/billing-ai-triage?message=${encodeURIComponent(error?.message || "Could not create AI triage run")}`,
    );
  }

  await supabase.from("ai_triage_items_v2").insert(
    runDraft.items.map((item: any) => ({
      run_id: run.id,
      user_id: user.id,
      scan_id: scan.id,
      source_type: item.sourceType,
      source_id: item.sourceId,
      item_title: item.itemTitle,
      item_status: item.itemStatus,
      priority: item.priority,
      severity: item.severity,
      confidence_level: item.confidenceLevel,
      triage_rank: item.triageRank,
      triage_score: item.triageScore,
      business_impact_score: item.businessImpactScore,
      fix_effort_score: item.fixEffortScore,
      confidence_score: item.confidenceScore,
      affected_area: item.affectedArea,
      reason_summary: item.reasonSummary,
      developer_action: item.developerAction,
      client_safe_note: item.clientSafeNote,
      blocked_claim: item.blockedClaim,
      item_payload: item.itemPayload,
    })),
  );

  await supabase.from("billing_ai_triage_events_v2").insert({
    billing_profile_id: usage.profile.id,
    triage_run_id: run.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    event_type: "triage-run-created",
    severity: runDraft.urgentCount > 0 ? "High" : "Info",
    title: "AI triage run created",
    details: runDraft.executiveSummary,
    metadata: { totalItemCount: runDraft.totalItemCount },
  });

  revalidatePath(`/report/${scan.id}/billing-ai-triage`);
  redirect(
    `/report/${scan.id}/billing-ai-triage?run=${run.id}&message=${encodeURIComponent("AI triage completed.")}`,
  );
}
