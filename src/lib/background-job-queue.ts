import type { MonitoringCadence } from "@/lib/continuous-monitoring-engine";
import {
  buildMonitoringPolicy,
  evaluateMonitoringRun,
  nextRunDate,
} from "@/lib/continuous-monitoring-engine";

export type BackgroundJobType =
  | "monitoring-evaluation"
  | "monitoring-rescan-placeholder"
  | "score-consistency"
  | "truth-cleanup"
  | "custom";

export type BackgroundJobStatus =
  | "queued"
  | "locked"
  | "running"
  | "completed"
  | "failed"
  | "retrying"
  | "cancelled";

export type QueueJobRecord = {
  id: string;
  user_id: string;
  website_id?: string | null;
  monitoring_job_id?: string | null;
  source_scan_id?: string | null;
  job_type: BackgroundJobType;
  job_status: BackgroundJobStatus;
  priority: number;
  run_after: string;
  attempts: number;
  max_attempts: number;
  locked_at?: string | null;
  locked_by?: string | null;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  worker_version: string;
  created_at?: string | null;
};

export type SchedulerSummary = {
  workerVersion: string;
  generatedAt: string;
  dueCount: number;
  queuedCount: number;
  runningCount: number;
  failedCount: number;
  completedCount: number;
  retryingCount: number;
  nextAction: string;
  safetyBoundary: string[];
};

export type WorkerExecutionResult = {
  workerVersion: string;
  workerId: string;
  jobId: string;
  jobType: BackgroundJobType;
  status: "completed" | "failed" | "skipped";
  title: string;
  details: string;
  result: Record<string, unknown>;
  shouldRetry: boolean;
  errorMessage?: string;
};

type ScanSnapshot = {
  id: string;
  website_id?: string | null;
  website_url: string;
  score?: number | null;
  risk_level?: string | null;
  report?: unknown;
  created_at?: string | null;
};

type MonitoringJobSnapshot = {
  id: string;
  user_id: string;
  website_id?: string | null;
  seed_scan_id?: string | null;
  website_url: string;
  cadence: MonitoringCadence;
  risk_threshold?: string | null;
  score_drop_threshold?: number | null;
};

export const BACKGROUND_WORKER_SAFETY_BOUNDARY = [
  "Worker executes only allowed internal job types",
  "No destructive testing",
  "No exploit payloads",
  "No password or session storage",
  "No private response body storage",
  "Job locking prevents double execution",
  "Retry limit prevents infinite loops",
  "Automatic cron trigger is separate from this foundation",
];

export function buildSchedulerSummary(
  jobs: QueueJobRecord[],
): SchedulerSummary {
  const now = Date.now();
  const dueCount = jobs.filter(
    (job) =>
      ["queued", "retrying"].includes(job.job_status) &&
      new Date(job.run_after).getTime() <= now,
  ).length;

  return {
    workerVersion: "46.0",
    generatedAt: new Date().toISOString(),
    dueCount,
    queuedCount: jobs.filter((job) => job.job_status === "queued").length,
    runningCount: jobs.filter((job) =>
      ["locked", "running"].includes(job.job_status),
    ).length,
    failedCount: jobs.filter((job) => job.job_status === "failed").length,
    completedCount: jobs.filter((job) => job.job_status === "completed").length,
    retryingCount: jobs.filter((job) => job.job_status === "retrying").length,
    nextAction:
      dueCount > 0
        ? "Run the worker processor to execute due jobs."
        : "No due jobs. Keep scheduler ready or enqueue a monitoring job.",
    safetyBoundary: BACKGROUND_WORKER_SAFETY_BOUNDARY,
  };
}

export function buildQueuePayload(input: {
  jobType: BackgroundJobType;
  websiteUrl: string;
  sourceScanId?: string | null;
  monitoringJobId?: string | null;
  reason?: string;
}) {
  return {
    workerVersion: "46.0",
    jobType: input.jobType,
    websiteUrl: input.websiteUrl,
    sourceScanId: input.sourceScanId || null,
    monitoringJobId: input.monitoringJobId || null,
    reason: input.reason || "manual-development-enqueue",
    safetyBoundary: BACKGROUND_WORKER_SAFETY_BOUNDARY,
    createdAt: new Date().toISOString(),
  };
}

export function shouldRetryJob(input: {
  attempts: number;
  maxAttempts: number;
  status: "completed" | "failed" | "skipped";
}) {
  if (input.status !== "failed") return false;
  return input.attempts < input.maxAttempts;
}

export function retryRunAfter(attempts: number) {
  const minutes = Math.min(60, Math.max(1, attempts * 5));
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export function executeMonitoringJobInMemory(input: {
  job: QueueJobRecord;
  currentScan: ScanSnapshot | null;
  previousScan: ScanSnapshot | null;
  monitoringJob: MonitoringJobSnapshot | null;
  workerId: string;
}): WorkerExecutionResult {
  if (input.job.job_type !== "monitoring-evaluation") {
    return {
      workerVersion: "46.0",
      workerId: input.workerId,
      jobId: input.job.id,
      jobType: input.job.job_type,
      status: "skipped",
      title: "Unsupported job type skipped",
      details: `Worker foundation does not execute ${input.job.job_type} yet.`,
      result: {
        supportedJobTypes: ["monitoring-evaluation"],
        nextLayer: "Add worker handlers for this job type in future parts.",
      },
      shouldRetry: false,
    };
  }

  if (!input.currentScan) {
    return {
      workerVersion: "46.0",
      workerId: input.workerId,
      jobId: input.job.id,
      jobType: input.job.job_type,
      status: "failed",
      title: "Source scan missing",
      details: "The queue job does not have a valid source scan snapshot.",
      result: { reason: "missing-source-scan" },
      shouldRetry: false,
      errorMessage: "Source scan missing",
    };
  }

  if (!input.monitoringJob) {
    return {
      workerVersion: "46.0",
      workerId: input.workerId,
      jobId: input.job.id,
      jobType: input.job.job_type,
      status: "failed",
      title: "Monitoring job missing",
      details: "The queue job is not linked to an active monitoring job.",
      result: { reason: "missing-monitoring-job" },
      shouldRetry: false,
      errorMessage: "Monitoring job missing",
    };
  }

  const policy = buildMonitoringPolicy({
    websiteUrl: input.currentScan.website_url,
    cadence: input.monitoringJob.cadence || "daily",
    scoreDropThreshold: input.monitoringJob.score_drop_threshold || 10,
    riskThreshold: input.monitoringJob.risk_threshold || "Medium risk",
    seedScanId: input.currentScan.id,
  });

  const evaluation = evaluateMonitoringRun({
    current: input.currentScan,
    previous: input.previousScan,
    policy,
  });

  return {
    workerVersion: "46.0",
    workerId: input.workerId,
    jobId: input.job.id,
    jobType: input.job.job_type,
    status: "completed",
    title: evaluation.event.title,
    details: evaluation.event.details,
    result: {
      evaluation,
      nextRunAt: nextRunDate(input.monitoringJob.cadence || "daily"),
      safetyBoundary: BACKGROUND_WORKER_SAFETY_BOUNDARY,
    },
    shouldRetry: false,
  };
}
