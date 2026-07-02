"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MonitoringCadence } from "@/lib/continuous-monitoring-engine";
import {
  buildMonitoringPolicy,
  evaluateMonitoringRun,
  nextRunDate,
} from "@/lib/continuous-monitoring-engine";
import { createClient } from "@/lib/supabase/server";

function normalizeCadence(value: FormDataEntryValue | null): MonitoringCadence {
  if (value === "weekly" || value === "manual") return value;
  return "daily";
}

function normalizeThreshold(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(100, Math.round(parsed)));
}

export async function createMonitoringJob(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const cadence = normalizeCadence(formData.get("cadence"));
  const scoreDropThreshold = normalizeThreshold(
    formData.get("scoreDropThreshold"),
  );
  const riskThreshold = String(formData.get("riskThreshold") || "Medium risk");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to enable monitoring");

  const { data: scan } = await supabase
    .from("scans")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const policy = buildMonitoringPolicy({
    websiteUrl: scan.website_url,
    cadence,
    scoreDropThreshold,
    riskThreshold,
    seedScanId: scan.id,
  });

  const { data: existing } = scan.website_id
    ? await supabase
        .from("monitoring_jobs")
        .select("id")
        .eq("user_id", user.id)
        .eq("website_id", scan.website_id)
        .limit(1)
        .maybeSingle()
    : await supabase
        .from("monitoring_jobs")
        .select("id")
        .eq("user_id", user.id)
        .eq("website_url", scan.website_url)
        .limit(1)
        .maybeSingle();

  let jobId = existing?.id;

  if (jobId) {
    await supabase
      .from("monitoring_jobs")
      .update({
        job_status: "active",
        cadence,
        risk_threshold: riskThreshold,
        score_drop_threshold: scoreDropThreshold,
        monitoring_policy: policy,
        latest_baseline_scan_id: scan.id,
        next_run_at: nextRunDate(cadence),
      })
      .eq("id", jobId)
      .eq("user_id", user.id);
  } else {
    const { data: job, error } = await supabase
      .from("monitoring_jobs")
      .insert({
        user_id: user.id,
        website_id: scan.website_id,
        seed_scan_id: scan.id,
        website_url: scan.website_url,
        job_status: "active",
        cadence,
        risk_threshold: riskThreshold,
        score_drop_threshold: scoreDropThreshold,
        monitoring_policy: policy,
        latest_baseline_scan_id: scan.id,
        next_run_at: nextRunDate(cadence),
      })
      .select("id")
      .single();

    if (error || !job?.id) {
      redirect(
        `/report/${scan.id}/monitoring?message=${encodeURIComponent(`Could not create monitoring job: ${error?.message || "Unknown error"}`)}`,
      );
    }

    jobId = job.id;
  }

  await supabase.from("monitoring_events").insert({
    monitoring_job_id: jobId,
    user_id: user.id,
    website_id: scan.website_id,
    event_type: "job-created",
    severity: "Info",
    title: "Monitoring job enabled",
    details: `Continuous monitoring foundation enabled for ${scan.website_url}.`,
    metadata: {
      cadence,
      scoreDropThreshold,
      riskThreshold,
      seedScanId: scan.id,
    },
  });

  revalidatePath(`/report/${scan.id}/monitoring`);
  redirect(
    `/report/${scan.id}/monitoring?message=${encodeURIComponent("Monitoring job enabled. Now run monitoring evaluation.")}`,
  );
}

export async function runMonitoringEvaluation(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to run monitoring");

  const { data: scan } = await supabase
    .from("scans")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: job } = scan.website_id
    ? await supabase
        .from("monitoring_jobs")
        .select("id, cadence, score_drop_threshold, risk_threshold")
        .eq("user_id", user.id)
        .eq("website_id", scan.website_id)
        .eq("job_status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : await supabase
        .from("monitoring_jobs")
        .select("id, cadence, score_drop_threshold, risk_threshold")
        .eq("user_id", user.id)
        .eq("website_url", scan.website_url)
        .eq("job_status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (!job?.id) {
    redirect(
      `/report/${scan.id}/monitoring?message=${encodeURIComponent("Create monitoring job first.")}`,
    );
  }

  let previousQuery = supabase
    .from("scans")
    .select(
      "id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("user_id", user.id)
    .lt("created_at", scan.created_at)
    .order("created_at", { ascending: false })
    .limit(1);

  if (scan.website_id)
    previousQuery = previousQuery.eq("website_id", scan.website_id);
  else previousQuery = previousQuery.eq("website_url", scan.website_url);

  const { data: previous } = await previousQuery.maybeSingle();

  const policy = buildMonitoringPolicy({
    websiteUrl: scan.website_url,
    cadence: (job.cadence as MonitoringCadence) || "daily",
    scoreDropThreshold: job.score_drop_threshold || 10,
    riskThreshold: job.risk_threshold || "Medium risk",
    seedScanId: scan.id,
  });

  const evaluation = evaluateMonitoringRun({ current: scan, previous, policy });

  const { data: run, error: runError } = await supabase
    .from("monitoring_runs")
    .insert({
      monitoring_job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      previous_scan_id: previous?.id || null,
      website_url: scan.website_url,
      run_status: evaluation.regressionDetected
        ? "completed-with-warnings"
        : "completed",
      worker_version: evaluation.workerVersion,
      score_before: evaluation.scoreBefore,
      score_current: evaluation.scoreCurrent,
      score_delta: evaluation.scoreDelta,
      risk_before: evaluation.riskBefore,
      risk_current: evaluation.riskCurrent,
      risk_transition: evaluation.riskTransition,
      drift_status: evaluation.driftStatus,
      regression_detected: evaluation.regressionDetected,
      regression_reasons: evaluation.regressionReasons,
      run_summary: evaluation.runSummary,
      evidence_snapshot: evaluation.evidenceSnapshot,
    })
    .select("id")
    .single();

  if (runError || !run?.id) {
    redirect(
      `/report/${scan.id}/monitoring?message=${encodeURIComponent(`Could not save monitoring run: ${runError?.message || "Unknown error"}`)}`,
    );
  }

  await supabase.from("monitoring_events").insert({
    monitoring_job_id: job.id,
    monitoring_run_id: run.id,
    user_id: user.id,
    website_id: scan.website_id,
    event_type: evaluation.event.eventType,
    severity: evaluation.event.severity,
    title: evaluation.event.title,
    details: evaluation.event.details,
    metadata: evaluation.event.metadata,
  });

  await supabase
    .from("monitoring_jobs")
    .update({
      latest_baseline_scan_id: scan.id,
      latest_run_at: new Date().toISOString(),
      next_run_at: nextRunDate((job.cadence as MonitoringCadence) || "daily"),
      run_count: 1,
    })
    .eq("id", job.id)
    .eq("user_id", user.id);

  revalidatePath(`/report/${scan.id}/monitoring`);
  redirect(
    `/report/${scan.id}/monitoring?message=${encodeURIComponent("Monitoring evaluation completed. Score drift and regression status saved.")}`,
  );
}

export async function pauseMonitoringJob(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const jobId = String(formData.get("jobId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login");

  await supabase
    .from("monitoring_jobs")
    .update({ job_status: "paused" })
    .eq("id", jobId)
    .eq("user_id", user.id);

  await supabase.from("monitoring_events").insert({
    monitoring_job_id: jobId,
    user_id: user.id,
    event_type: "job-paused",
    severity: "Info",
    title: "Monitoring job paused",
    details: "Monitoring job paused by user.",
    metadata: {},
  });

  revalidatePath(`/report/${scanId}/monitoring`);
  redirect(
    `/report/${scanId}/monitoring?message=${encodeURIComponent("Monitoring paused.")}`,
  );
}
