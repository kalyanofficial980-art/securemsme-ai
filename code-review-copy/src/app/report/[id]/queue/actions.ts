"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildQueuePayload,
  executeMonitoringJobInMemory,
  retryRunAfter,
  shouldRetryJob,
} from "@/lib/background-job-queue";
import { createClient } from "@/lib/supabase/server";

function workerId() {
  return `dev-worker-${Date.now()}`;
}

export async function enqueueMonitoringWorkerJob(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to enqueue worker job");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, website_url")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: monitoringJob } = scan.website_id
    ? await supabase
        .from("monitoring_jobs")
        .select("id")
        .eq("user_id", user.id)
        .eq("website_id", scan.website_id)
        .eq("job_status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : await supabase
        .from("monitoring_jobs")
        .select("id")
        .eq("user_id", user.id)
        .eq("website_url", scan.website_url)
        .eq("job_status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (!monitoringJob?.id) {
    redirect(
      `/report/${scan.id}/queue?message=${encodeURIComponent(
        "Enable Continuous Monitoring first, then enqueue worker job.",
      )}`,
    );
  }

  const { error } = await supabase.from("background_worker_jobs").insert({
    user_id: user.id,
    website_id: scan.website_id,
    monitoring_job_id: monitoringJob.id,
    source_scan_id: scan.id,
    job_type: "monitoring-evaluation",
    job_status: "queued",
    priority: 7,
    run_after: new Date().toISOString(),
    attempts: 0,
    max_attempts: 3,
    payload: buildQueuePayload({
      jobType: "monitoring-evaluation",
      websiteUrl: scan.website_url,
      sourceScanId: scan.id,
      monitoringJobId: monitoringJob.id,
      reason: "manual-development-enqueue-from-report",
    }),
  });

  if (error) {
    redirect(
      `/report/${scan.id}/queue?message=${encodeURIComponent(
        `Could not enqueue worker job: ${error.message}`,
      )}`,
    );
  }

  await supabase.from("background_worker_events").insert({
    user_id: user.id,
    website_id: scan.website_id,
    event_type: "job-enqueued",
    severity: "Info",
    title: "Monitoring worker job enqueued",
    details: `Background queue job created for ${scan.website_url}.`,
    metadata: { scanId: scan.id, monitoringJobId: monitoringJob.id },
  });

  revalidatePath(`/report/${scan.id}/queue`);
  redirect(
    `/report/${scan.id}/queue?message=${encodeURIComponent("Monitoring worker job enqueued.")}`,
  );
}

export async function runDueWorkerJob(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to run worker");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, website_url")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: job } = await supabase
    .from("background_worker_jobs")
    .select(
      "id, user_id, website_id, monitoring_job_id, source_scan_id, job_type, job_status, priority, run_after, attempts, max_attempts, locked_at, locked_by, payload, result, worker_version, created_at",
    )
    .eq("user_id", user.id)
    .in("job_status", ["queued", "retrying"])
    .lte("run_after", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!job?.id) {
    redirect(
      `/report/${scan.id}/queue?message=${encodeURIComponent("No due worker jobs found.")}`,
    );
  }

  const currentWorkerId = workerId();
  const lockTime = new Date().toISOString();

  const { error: lockError } = await supabase
    .from("background_worker_jobs")
    .update({
      job_status: "running",
      locked_at: lockTime,
      locked_by: currentWorkerId,
      started_at: lockTime,
      attempts: (job.attempts || 0) + 1,
    })
    .eq("id", job.id)
    .eq("user_id", user.id)
    .in("job_status", ["queued", "retrying"]);

  if (lockError) {
    redirect(
      `/report/${scan.id}/queue?message=${encodeURIComponent(
        `Could not lock worker job: ${lockError.message}`,
      )}`,
    );
  }

  const { data: attempt } = await supabase
    .from("background_worker_attempts")
    .insert({
      worker_job_id: job.id,
      user_id: user.id,
      website_id: job.website_id,
      attempt_number: (job.attempts || 0) + 1,
      attempt_status: "running",
      worker_id: currentWorkerId,
      started_at: lockTime,
    })
    .select("id")
    .single();

  await supabase.from("background_worker_events").insert({
    worker_job_id: job.id,
    worker_attempt_id: attempt?.id || null,
    user_id: user.id,
    website_id: job.website_id,
    event_type: "job-started",
    severity: "Info",
    title: "Worker job started",
    details: `Worker ${currentWorkerId} started ${job.job_type}.`,
    metadata: { workerId: currentWorkerId },
  });

  const { data: currentScan } = job.source_scan_id
    ? await supabase
        .from("scans")
        .select(
          "id, website_id, website_url, score, risk_level, report, created_at",
        )
        .eq("id", job.source_scan_id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  let previousQuery = supabase
    .from("scans")
    .select(
      "id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("user_id", user.id)
    .lt("created_at", currentScan?.created_at || new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (currentScan?.website_id)
    previousQuery = previousQuery.eq("website_id", currentScan.website_id);
  else if (currentScan?.website_url)
    previousQuery = previousQuery.eq("website_url", currentScan.website_url);

  const { data: previousScan } = currentScan
    ? await previousQuery.maybeSingle()
    : { data: null };

  const { data: monitoringJob } = job.monitoring_job_id
    ? await supabase
        .from("monitoring_jobs")
        .select(
          "id, user_id, website_id, seed_scan_id, website_url, cadence, risk_threshold, score_drop_threshold",
        )
        .eq("id", job.monitoring_job_id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const execution = executeMonitoringJobInMemory({
    job,
    currentScan,
    previousScan,
    monitoringJob,
    workerId: currentWorkerId,
  });

  const now = new Date().toISOString();
  const nextStatus =
    execution.status === "completed" || execution.status === "skipped"
      ? "completed"
      : shouldRetryJob({
            attempts: (job.attempts || 0) + 1,
            maxAttempts: job.max_attempts || 3,
            status: execution.status,
          })
        ? "retrying"
        : "failed";

  await supabase
    .from("background_worker_attempts")
    .update({
      attempt_status:
        execution.status === "completed"
          ? "completed"
          : execution.status === "skipped"
            ? "skipped"
            : "failed",
      completed_at: now,
      error_message: execution.errorMessage || null,
      output_summary: execution.result,
    })
    .eq("id", attempt?.id || "00000000-0000-0000-0000-000000000000")
    .eq("user_id", user.id);

  await supabase
    .from("background_worker_jobs")
    .update({
      job_status: nextStatus,
      completed_at: nextStatus === "completed" ? now : null,
      failed_at: nextStatus === "failed" ? now : null,
      last_error: execution.errorMessage || null,
      run_after:
        nextStatus === "retrying"
          ? retryRunAfter((job.attempts || 0) + 1)
          : job.run_after,
      result: execution.result,
    })
    .eq("id", job.id)
    .eq("user_id", user.id);

  if (
    execution.status === "completed" &&
    job.job_type === "monitoring-evaluation" &&
    currentScan &&
    monitoringJob
  ) {
    const evaluation = execution.result.evaluation as
      Record<string, unknown> | undefined;

    const { data: monitoringRun } = await supabase
      .from("monitoring_runs")
      .insert({
        monitoring_job_id: monitoringJob.id,
        user_id: user.id,
        website_id: currentScan.website_id,
        source_scan_id: currentScan.id,
        previous_scan_id: previousScan?.id || null,
        website_url: currentScan.website_url,
        run_status: evaluation?.regressionDetected
          ? "completed-with-warnings"
          : "completed",
        worker_version: "46.0",
        score_before: evaluation?.scoreBefore ?? null,
        score_current: evaluation?.scoreCurrent ?? 0,
        score_delta: evaluation?.scoreDelta ?? null,
        risk_before: evaluation?.riskBefore ?? null,
        risk_current: evaluation?.riskCurrent ?? null,
        risk_transition: evaluation?.riskTransition ?? "unknown",
        drift_status: evaluation?.driftStatus ?? "needs-review",
        regression_detected: Boolean(evaluation?.regressionDetected),
        regression_reasons: evaluation?.regressionReasons ?? [],
        run_summary: evaluation?.runSummary ?? {},
        evidence_snapshot: evaluation?.evidenceSnapshot ?? {},
      })
      .select("id")
      .single();

    await supabase.from("monitoring_events").insert({
      monitoring_job_id: monitoringJob.id,
      monitoring_run_id: monitoringRun?.id || null,
      user_id: user.id,
      website_id: currentScan.website_id,
      event_type:
        (evaluation?.event as Record<string, unknown> | undefined)?.eventType ||
        "monitoring-info",
      severity:
        (evaluation?.event as Record<string, unknown> | undefined)?.severity ||
        "Info",
      title:
        (evaluation?.event as Record<string, unknown> | undefined)?.title ||
        execution.title,
      details:
        (evaluation?.event as Record<string, unknown> | undefined)?.details ||
        execution.details,
      metadata:
        (evaluation?.event as Record<string, unknown> | undefined)?.metadata ||
        {},
    });

    await supabase
      .from("monitoring_jobs")
      .update({
        latest_baseline_scan_id: currentScan.id,
        latest_run_at: now,
        next_run_at: String(execution.result.nextRunAt || now),
        run_count: 1,
      })
      .eq("id", monitoringJob.id)
      .eq("user_id", user.id);
  }

  await supabase.from("background_worker_events").insert({
    worker_job_id: job.id,
    worker_attempt_id: attempt?.id || null,
    user_id: user.id,
    website_id: job.website_id,
    event_type:
      execution.status === "completed"
        ? "job-completed"
        : execution.status === "failed"
          ? "job-failed"
          : "queue-info",
    severity: execution.status === "failed" ? "High" : "Info",
    title: execution.title,
    details: execution.details,
    metadata: {
      nextStatus,
      workerId: currentWorkerId,
      result: execution.result,
    },
  });

  revalidatePath(`/report/${scan.id}/queue`);
  redirect(
    `/report/${scan.id}/queue?message=${encodeURIComponent(
      `Worker finished with status: ${nextStatus}`,
    )}`,
  );
}

export async function cancelWorkerJob(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const jobId = String(formData.get("jobId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login");

  await supabase
    .from("background_worker_jobs")
    .update({ job_status: "cancelled" })
    .eq("id", jobId)
    .eq("user_id", user.id)
    .in("job_status", ["queued", "retrying", "failed"]);

  await supabase.from("background_worker_events").insert({
    worker_job_id: jobId,
    user_id: user.id,
    event_type: "job-cancelled",
    severity: "Info",
    title: "Worker job cancelled",
    details: "User cancelled queued/retry worker job.",
    metadata: {},
  });

  revalidatePath(`/report/${scanId}/queue`);
  redirect(
    `/report/${scanId}/queue?message=${encodeURIComponent("Worker job cancelled.")}`,
  );
}
