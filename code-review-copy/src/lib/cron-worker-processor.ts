import {
  buildMonitoringPolicy,
  evaluateMonitoringRun,
  nextRunDate,
  type MonitoringCadence,
} from "@/lib/continuous-monitoring-engine";

export type CronTriggerSource =
  "manual-admin" | "api-cron" | "vercel-cron" | "local-dev" | "unknown";

export type CronBatchResult = {
  batchId: string | null;
  workerName: string;
  triggerSource: CronTriggerSource;
  pickedCount: number;
  completedCount: number;
  failedCount: number;
  skippedCount: number;
  status: "completed" | "completed-with-errors" | "failed";
  messages: string[];
};

type Db = any;

type BackgroundWorkerJob = {
  id: string;
  user_id: string;
  website_id?: string | null;
  monitoring_job_id?: string | null;
  source_scan_id?: string | null;
  job_type?: string | null;
  job_status?: string | null;
  attempts_count?: number | null;
  max_attempts?: number | null;
  payload?: Record<string, unknown> | null;
};

type MonitoringJob = {
  id: string;
  user_id: string;
  website_id?: string | null;
  website_url: string;
  cadence: MonitoringCadence;
  risk_threshold?: string | null;
  score_drop_threshold?: number | null;
};

type ScanRecord = {
  id: string;
  website_id?: string | null;
  website_url: string;
  score?: number | null;
  risk_level?: string | null;
  report?: unknown;
  created_at?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

async function insertCronEvent(
  db: Db,
  input: {
    batchId?: string | null;
    backgroundJobId?: string | null;
    monitoringJobId?: string | null;
    userId?: string | null;
    websiteId?: string | null;
    eventType:
      | "cron-info"
      | "batch-started"
      | "batch-completed"
      | "job-picked"
      | "job-completed"
      | "job-failed"
      | "job-retry-scheduled"
      | "job-skipped";
    severity: "Critical" | "High" | "Medium" | "Low" | "Info";
    title: string;
    details: string;
    metadata?: Record<string, unknown>;
  },
) {
  await db.from("cron_worker_events").insert({
    batch_id: input.batchId || null,
    background_job_id: input.backgroundJobId || null,
    monitoring_job_id: input.monitoringJobId || null,
    user_id: input.userId || null,
    website_id: input.websiteId || null,
    event_type: input.eventType,
    severity: input.severity,
    title: input.title,
    details: input.details,
    metadata: input.metadata || {},
  });
}

async function latestScanForMonitoringJob(db: Db, job: MonitoringJob) {
  let query = db
    .from("scans")
    .select(
      "id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("user_id", job.user_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (job.website_id) query = query.eq("website_id", job.website_id);
  else query = query.eq("website_url", job.website_url);

  const { data } = await query.maybeSingle();
  return (data || null) as ScanRecord | null;
}

async function previousScanForMonitoringJob(
  db: Db,
  job: MonitoringJob,
  current: ScanRecord,
) {
  let query = db
    .from("scans")
    .select(
      "id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("user_id", job.user_id)
    .lt("created_at", current.created_at || nowIso())
    .order("created_at", { ascending: false })
    .limit(1);

  if (job.website_id) query = query.eq("website_id", job.website_id);
  else query = query.eq("website_url", job.website_url);

  const { data } = await query.maybeSingle();
  return (data || null) as ScanRecord | null;
}

async function processMonitoringEvaluationJob(
  db: Db,
  backgroundJob: BackgroundWorkerJob,
  batchId: string,
) {
  const monitoringJobId =
    backgroundJob.monitoring_job_id ||
    asString(backgroundJob.payload?.monitoringJobId);

  if (!monitoringJobId) {
    throw new Error("Missing monitoring_job_id for monitoring worker job.");
  }

  const { data: monitoringJob, error: monitoringJobError } = await db
    .from("monitoring_jobs")
    .select(
      "id, user_id, website_id, website_url, cadence, risk_threshold, score_drop_threshold",
    )
    .eq("id", monitoringJobId)
    .maybeSingle();

  if (monitoringJobError || !monitoringJob) {
    throw new Error(monitoringJobError?.message || "Monitoring job not found.");
  }

  const job = monitoringJob as MonitoringJob;
  const currentScan = await latestScanForMonitoringJob(db, job);

  if (!currentScan) {
    throw new Error("No scan snapshot found for monitoring job.");
  }

  const previousScan = await previousScanForMonitoringJob(db, job, currentScan);
  const policy = buildMonitoringPolicy({
    websiteUrl: job.website_url,
    cadence: job.cadence || "daily",
    scoreDropThreshold: asNumber(job.score_drop_threshold, 10),
    riskThreshold: job.risk_threshold || "Medium risk",
    seedScanId: currentScan.id,
  });

  const evaluation = evaluateMonitoringRun({
    current: currentScan,
    previous: previousScan,
    policy,
  });

  const { data: monitoringRun, error: runError } = await db
    .from("monitoring_runs")
    .insert({
      monitoring_job_id: job.id,
      user_id: job.user_id,
      website_id: job.website_id || null,
      source_scan_id: currentScan.id,
      previous_scan_id: previousScan?.id || null,
      website_url: job.website_url,
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

  if (runError || !monitoringRun?.id) {
    throw new Error(runError?.message || "Could not create monitoring run.");
  }

  await db.from("monitoring_events").insert({
    monitoring_job_id: job.id,
    monitoring_run_id: monitoringRun.id,
    user_id: job.user_id,
    website_id: job.website_id || null,
    event_type: evaluation.event.eventType,
    severity: evaluation.event.severity,
    title: evaluation.event.title,
    details: evaluation.event.details,
    metadata: {
      ...evaluation.event.metadata,
      createdByCronWorker: true,
      backgroundWorkerJobId: backgroundJob.id,
      batchId,
    },
  });

  await db
    .from("monitoring_jobs")
    .update({
      latest_baseline_scan_id: currentScan.id,
      latest_run_at: nowIso(),
      next_run_at: nextRunDate(job.cadence || "daily"),
    })
    .eq("id", job.id);

  return {
    monitoringRunId: monitoringRun.id as string,
    currentScanId: currentScan.id,
    previousScanId: previousScan?.id || null,
    driftStatus: evaluation.driftStatus,
    regressionDetected: evaluation.regressionDetected,
  };
}

async function markJobCompleted(
  db: Db,
  jobId: string,
  result: Record<string, unknown>,
) {
  await db
    .from("background_worker_jobs")
    .update({
      job_status: "completed",
      completed_at: nowIso(),
      locked_at: null,
      locked_by: null,
      result_summary: result,
    })
    .eq("id", jobId);
}

async function markJobFailedOrRetry(
  db: Db,
  job: BackgroundWorkerJob,
  errorMessage: string,
) {
  const attempts = (job.attempts_count || 0) + 1;
  const maxAttempts = job.max_attempts || 3;
  const retry = attempts < maxAttempts;

  await db
    .from("background_worker_jobs")
    .update({
      job_status: retry ? "retrying" : "failed",
      attempts_count: attempts,
      scheduled_for: retry
        ? new Date(Date.now() + attempts * 5 * 60_000).toISOString()
        : nowIso(),
      failed_at: retry ? null : nowIso(),
      locked_at: null,
      locked_by: null,
      last_error: errorMessage,
    })
    .eq("id", job.id);

  return retry;
}

export async function processDueWorkerJobs(
  db: Db,
  input: {
    maxJobs?: number;
    triggerSource?: CronTriggerSource;
    createdBy?: string | null;
    workerName?: string;
  } = {},
): Promise<CronBatchResult> {
  const maxJobs = Math.max(1, Math.min(50, input.maxJobs || 5));
  const workerName = input.workerName || "securemsme-cron-worker";
  const triggerSource = input.triggerSource || "manual-admin";
  const messages: string[] = [];

  const { data: batch, error: batchError } = await db
    .from("cron_worker_batches")
    .insert({
      worker_name: workerName,
      trigger_source: triggerSource,
      batch_status: "running",
      max_jobs: maxJobs,
      created_by: input.createdBy || null,
      batch_summary: { startedAt: nowIso() },
    })
    .select("id")
    .single();

  if (batchError || !batch?.id) {
    return {
      batchId: null,
      workerName,
      triggerSource,
      pickedCount: 0,
      completedCount: 0,
      failedCount: 1,
      skippedCount: 0,
      status: "failed",
      messages: [batchError?.message || "Could not create cron batch."],
    };
  }

  const batchId = String(batch.id);

  await insertCronEvent(db, {
    batchId,
    eventType: "batch-started",
    severity: "Info",
    title: "Cron worker batch started",
    details: `Worker started with max ${maxJobs} jobs.`,
    metadata: { triggerSource, workerName },
  });

  const { data: jobs, error: jobsError } = await db
    .from("background_worker_jobs")
    .select(
      "id, user_id, website_id, monitoring_job_id, source_scan_id, job_type, job_status, attempts_count, max_attempts, payload",
    )
    .in("job_status", ["queued", "retrying"])
    .lte("scheduled_for", nowIso())
    .order("scheduled_for", { ascending: true })
    .limit(maxJobs);

  if (jobsError) {
    await db
      .from("cron_worker_batches")
      .update({
        batch_status: "failed",
        completed_at: nowIso(),
        failed_count: 1,
        batch_summary: { error: jobsError.message },
      })
      .eq("id", batchId);

    return {
      batchId,
      workerName,
      triggerSource,
      pickedCount: 0,
      completedCount: 0,
      failedCount: 1,
      skippedCount: 0,
      status: "failed",
      messages: [jobsError.message],
    };
  }

  const pickedJobs = (jobs || []) as BackgroundWorkerJob[];
  let completedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const job of pickedJobs) {
    await db
      .from("background_worker_jobs")
      .update({
        job_status: "running",
        locked_at: nowIso(),
        locked_by: workerName,
      })
      .eq("id", job.id)
      .in("job_status", ["queued", "retrying"]);

    await db.from("cron_worker_batch_items").insert({
      batch_id: batchId,
      background_job_id: job.id,
      monitoring_job_id: job.monitoring_job_id || null,
      user_id: job.user_id,
      website_id: job.website_id || null,
      item_status: "picked",
      job_type: job.job_type || "unknown",
      details: "Job picked by cron batch processor.",
    });

    await insertCronEvent(db, {
      batchId,
      backgroundJobId: job.id,
      monitoringJobId: job.monitoring_job_id || null,
      userId: job.user_id,
      websiteId: job.website_id || null,
      eventType: "job-picked",
      severity: "Info",
      title: "Worker job picked",
      details: `Picked job ${job.id}.`,
      metadata: { jobType: job.job_type },
    });

    try {
      if (
        (job.job_type || "monitoring-evaluation") !== "monitoring-evaluation"
      ) {
        skippedCount += 1;
        await db
          .from("background_worker_jobs")
          .update({
            job_status: "skipped",
            locked_at: null,
            locked_by: null,
            result_summary: {
              reason: "Unsupported job type",
              jobType: job.job_type,
            },
          })
          .eq("id", job.id);

        await insertCronEvent(db, {
          batchId,
          backgroundJobId: job.id,
          monitoringJobId: job.monitoring_job_id || null,
          userId: job.user_id,
          websiteId: job.website_id || null,
          eventType: "job-skipped",
          severity: "Low",
          title: "Worker job skipped",
          details: `Unsupported job type: ${job.job_type}`,
          metadata: { jobType: job.job_type },
        });
        continue;
      }

      const result = await processMonitoringEvaluationJob(db, job, batchId);
      await markJobCompleted(db, job.id, result);
      completedCount += 1;

      await insertCronEvent(db, {
        batchId,
        backgroundJobId: job.id,
        monitoringJobId: job.monitoring_job_id || null,
        userId: job.user_id,
        websiteId: job.website_id || null,
        eventType: "job-completed",
        severity: result.regressionDetected ? "Medium" : "Info",
        title: "Worker job completed",
        details: `Monitoring worker completed with drift status ${result.driftStatus}.`,
        metadata: result,
      });
    } catch (error) {
      failedCount += 1;
      const message =
        error instanceof Error ? error.message : "Unknown worker error";
      const retry = await markJobFailedOrRetry(db, job, message);

      await insertCronEvent(db, {
        batchId,
        backgroundJobId: job.id,
        monitoringJobId: job.monitoring_job_id || null,
        userId: job.user_id,
        websiteId: job.website_id || null,
        eventType: retry ? "job-retry-scheduled" : "job-failed",
        severity: retry ? "Medium" : "High",
        title: retry ? "Worker job retry scheduled" : "Worker job failed",
        details: message,
        metadata: { retry, attempts: (job.attempts_count || 0) + 1 },
      });

      messages.push(message);
    }
  }

  const status = failedCount > 0 ? "completed-with-errors" : "completed";

  await db
    .from("cron_worker_batches")
    .update({
      batch_status: status,
      picked_count: pickedJobs.length,
      completed_count: completedCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
      completed_at: nowIso(),
      batch_summary: {
        pickedCount: pickedJobs.length,
        completedCount,
        failedCount,
        skippedCount,
        messages,
      },
    })
    .eq("id", batchId);

  await insertCronEvent(db, {
    batchId,
    eventType: "batch-completed",
    severity: failedCount > 0 ? "Medium" : "Info",
    title: "Cron worker batch completed",
    details: `Picked ${pickedJobs.length}, completed ${completedCount}, failed ${failedCount}, skipped ${skippedCount}.`,
    metadata: {
      pickedCount: pickedJobs.length,
      completedCount,
      failedCount,
      skippedCount,
    },
  });

  return {
    batchId,
    workerName,
    triggerSource,
    pickedCount: pickedJobs.length,
    completedCount,
    failedCount,
    skippedCount,
    status,
    messages,
  };
}
