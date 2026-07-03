import { describe, expect, it } from "vitest";
import {
  buildQueuePayload,
  buildSchedulerSummary,
  executeMonitoringJobInMemory,
  shouldRetryJob,
} from "@/lib/background-job-queue";

describe("background job queue", () => {
  it("builds scheduler summary for due jobs", () => {
    const summary = buildSchedulerSummary([
      {
        id: "job-1",
        user_id: "user-1",
        job_type: "monitoring-evaluation",
        job_status: "queued",
        priority: 7,
        run_after: new Date(Date.now() - 1000).toISOString(),
        attempts: 0,
        max_attempts: 3,
        worker_version: "46.0",
      },
    ] as never);

    expect(summary.dueCount).toBe(1);
    expect(summary.queuedCount).toBe(1);
  });

  it("limits retries by max attempts", () => {
    expect(
      shouldRetryJob({ attempts: 1, maxAttempts: 3, status: "failed" }),
    ).toBe(true);
    expect(
      shouldRetryJob({ attempts: 3, maxAttempts: 3, status: "failed" }),
    ).toBe(false);
    expect(
      shouldRetryJob({ attempts: 1, maxAttempts: 3, status: "completed" }),
    ).toBe(false);
  });

  it("executes monitoring evaluation in memory", () => {
    const result = executeMonitoringJobInMemory({
      workerId: "test-worker",
      job: {
        id: "job-1",
        user_id: "user-1",
        monitoring_job_id: "mon-1",
        source_scan_id: "scan-2",
        job_type: "monitoring-evaluation",
        job_status: "queued",
        priority: 7,
        run_after: new Date().toISOString(),
        attempts: 0,
        max_attempts: 3,
        worker_version: "46.0",
      },
      currentScan: {
        id: "scan-2",
        website_url: "https://example.com",
        score: 60,
        risk_level: "Medium risk",
      },
      previousScan: {
        id: "scan-1",
        website_url: "https://example.com",
        score: 90,
        risk_level: "Low risk",
      },
      monitoringJob: {
        id: "mon-1",
        user_id: "user-1",
        website_url: "https://example.com",
        cadence: "daily",
        score_drop_threshold: 10,
        risk_threshold: "Medium risk",
      },
    });

    expect(result.status).toBe("completed");
    expect(result.result).toHaveProperty("evaluation");
  });

  it("creates queue payload safely", () => {
    const payload = buildQueuePayload({
      jobType: "monitoring-evaluation",
      websiteUrl: "https://example.com",
      sourceScanId: "scan-1",
    });

    expect(payload.workerVersion).toBe("46.0");
    expect(payload.safetyBoundary.length).toBeGreaterThan(0);
  });
});
