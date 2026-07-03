"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildEnginePlan,
  normalizeScanMode,
  orchestratorSafeSummary,
  simulateSafeEngineResult,
} from "@/lib/scan-orchestrator-v2";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function bool(value: FormDataEntryValue | null) {
  return value === "yes" || value === "true" || value === "on";
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to continue");
  return { supabase, user };
}

async function recalculateJob(supabase: any, jobId: string) {
  await supabase.rpc("recalculate_scan_orchestrator_job", {
    p_job_id: jobId,
  });
}

export async function createScanPipelineAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const mode = normalizeScanMode(
    clean(formData.get("scanMode"), "safe-standard"),
  );
  const permissionAccepted = bool(formData.get("permissionAccepted"));
  const authenticatedContextApproved = bool(
    formData.get("authenticatedContextApproved"),
  );

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/scan-orchestrator?message=${encodeURIComponent("Authorization checkbox is required.")}`,
    );
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_url, website_id, organization_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  let verifiedScope = false;

  if (scan.website_id) {
    const { data: website } = await supabase
      .from("websites")
      .select("verification_status, deep_scan_enabled, permission_attested_at")
      .eq("id", scan.website_id)
      .eq("user_id", user.id)
      .maybeSingle();

    verifiedScope = Boolean(
      website?.verification_status === "verified" ||
      website?.deep_scan_enabled ||
      website?.permission_attested_at,
    );
  }

  const plan = buildEnginePlan({
    mode,
    verifiedScope,
    authenticatedContextApproved,
  });

  const authorizationStatus =
    mode === "authenticated-safe" && authenticatedContextApproved
      ? "authenticated-safe-approved"
      : verifiedScope
        ? "verified-scope"
        : "user-attested";

  const { data: job, error } = await supabase
    .from("scan_orchestrator_jobs")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      target_url: scan.website_url,
      job_name: `${mode} security scan pipeline`,
      job_status: "queued",
      scan_mode: mode,
      authorization_status: authorizationStatus,
      total_engines: plan.length,
      progress_message: "Pipeline planned. Ready to run engines.",
      safe_summary: orchestratorSafeSummary({
        mode,
        totalEngines: plan.length,
        targetUrl: scan.website_url,
      }),
      developer_summary:
        "Run planned engines, review engine evidence, then send findings to Accuracy Foundation and Security Review Workspace.",
    })
    .select("id")
    .single();

  if (error || !job?.id) {
    redirect(
      `/report/${scan.id}/scan-orchestrator?message=${encodeURIComponent(error?.message || "Could not create pipeline")}`,
    );
  }

  if (plan.length) {
    await supabase.from("scan_orchestrator_engine_runs").insert(
      plan.map((engine) => ({
        job_id: job.id,
        user_id: user.id,
        organization_id: scan.organization_id,
        website_id: scan.website_id,
        scan_id: scan.id,
        engine_key: engine.engineKey,
        engine_name: engine.engineName,
        engine_group: engine.engineGroup,
        engine_type: engine.engineType,
        run_order: engine.runOrder,
        run_status: engine.plannedStatus,
        coverage_weight: engine.weight,
        status_message: engine.skipReason || "Engine queued.",
        safe_summary: engine.description,
        engine_config: {
          safeMethods: engine.safeMethods,
          timeoutSeconds: engine.timeoutSeconds,
          maxRetries: engine.maxRetries,
          requiresVerifiedScope: engine.requiresVerifiedScope,
          requiresAuthenticatedContext: engine.requiresAuthenticatedContext,
        },
      })),
    );
  }

  await supabase.from("scan_orchestrator_events").insert({
    job_id: job.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    website_id: scan.website_id,
    scan_id: scan.id,
    event_type: "pipeline-created",
    severity: "Info",
    title: "Scan pipeline created",
    details: `Created ${plan.length} engine run(s) in ${mode} mode.`,
    metadata: {
      mode,
      authorizationStatus,
      verifiedScope,
      authenticatedContextApproved,
    },
  });

  await recalculateJob(supabase, job.id);

  revalidatePath(`/report/${scan.id}/scan-orchestrator`);
  redirect(
    `/report/${scan.id}/scan-orchestrator?job=${job.id}&message=${encodeURIComponent("Scan pipeline created.")}`,
  );
}

export async function runNextEngineAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const jobId = clean(formData.get("jobId"));

  const { data: job } = await supabase
    .from("scan_orchestrator_jobs")
    .select("id, scan_id, target_url, user_id, organization_id, website_id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) redirect("/dashboard?message=Pipeline not found");

  const { data: engine } = await supabase
    .from("scan_orchestrator_engine_runs")
    .select("*")
    .eq("job_id", job.id)
    .eq("user_id", user.id)
    .eq("run_status", "queued")
    .order("run_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!engine) {
    await recalculateJob(supabase, job.id);
    redirect(
      `/report/${job.scan_id}/scan-orchestrator?job=${job.id}&message=${encodeURIComponent("No queued engine left.")}`,
    );
  }

  await supabase
    .from("scan_orchestrator_engine_runs")
    .update({
      run_status: "running",
      started_at: new Date().toISOString(),
      status_message: "Engine started.",
    })
    .eq("id", engine.id)
    .eq("user_id", user.id);

  await supabase.from("scan_orchestrator_events").insert({
    job_id: job.id,
    engine_run_id: engine.id,
    user_id: user.id,
    organization_id: job.organization_id,
    website_id: job.website_id,
    scan_id: job.scan_id,
    event_type: "engine-started",
    severity: "Info",
    title: `${engine.engine_name} started`,
    details: "Engine entered running state.",
    metadata: { engineKey: engine.engine_key },
  });

  const startedAt = Date.now();
  const result = simulateSafeEngineResult(
    {
      engineKey: engine.engine_key,
      engineName: engine.engine_name,
      engineGroup: engine.engine_group,
      engineType: engine.engine_type,
      description: engine.safe_summary || "",
      defaultEnabled: true,
      requiresVerifiedScope: false,
      requiresAuthenticatedContext: false,
      safeMethods: engine.engine_config?.safeMethods || ["GET", "HEAD"],
      timeoutSeconds: engine.engine_config?.timeoutSeconds || 30,
      maxRetries: engine.engine_config?.maxRetries || 1,
      weight: engine.coverage_weight,
    },
    job.target_url,
  );

  await supabase
    .from("scan_orchestrator_engine_runs")
    .update({
      run_status: result.status,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      status_message: "Engine completed.",
      safe_summary: result.safeSummary,
      evidence_summary: result.evidenceSummary,
      observations_count: result.observationsCount,
      findings_created_count: result.findingsCreatedCount,
      potential_findings_count: result.potentialFindingsCount,
      confirmed_findings_count: result.confirmedFindingsCount,
      engine_result: result.engineResult,
    })
    .eq("id", engine.id)
    .eq("user_id", user.id);

  await supabase.from("scan_orchestrator_events").insert({
    job_id: job.id,
    engine_run_id: engine.id,
    user_id: user.id,
    organization_id: job.organization_id,
    website_id: job.website_id,
    scan_id: job.scan_id,
    event_type: "engine-completed",
    severity: "Info",
    title: `${engine.engine_name} completed`,
    details: result.evidenceSummary,
    metadata: result.engineResult,
  });

  await recalculateJob(supabase, job.id);

  revalidatePath(`/report/${job.scan_id}/scan-orchestrator`);
  redirect(
    `/report/${job.scan_id}/scan-orchestrator?job=${job.id}&message=${encodeURIComponent(`${engine.engine_name} completed.`)}`,
  );
}

export async function runAllQueuedEnginesAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const jobId = clean(formData.get("jobId"));

  const { data: job } = await supabase
    .from("scan_orchestrator_jobs")
    .select("id, scan_id, target_url, user_id, organization_id, website_id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) redirect("/dashboard?message=Pipeline not found");

  const { data: engines } = await supabase
    .from("scan_orchestrator_engine_runs")
    .select("*")
    .eq("job_id", job.id)
    .eq("user_id", user.id)
    .eq("run_status", "queued")
    .order("run_order", { ascending: true })
    .limit(50);

  if (!engines?.length) {
    await recalculateJob(supabase, job.id);
    redirect(
      `/report/${job.scan_id}/scan-orchestrator?job=${job.id}&message=${encodeURIComponent("No queued engines left.")}`,
    );
  }

  await supabase
    .from("scan_orchestrator_jobs")
    .update({
      job_status: "running",
      started_at: new Date().toISOString(),
      progress_message: "Running queued engines.",
    })
    .eq("id", job.id)
    .eq("user_id", user.id);

  let completed = 0;

  for (const engine of engines) {
    const startedAt = Date.now();

    await supabase
      .from("scan_orchestrator_engine_runs")
      .update({
        run_status: "running",
        started_at: new Date().toISOString(),
        status_message: "Engine started.",
      })
      .eq("id", engine.id)
      .eq("user_id", user.id);

    const result = simulateSafeEngineResult(
      {
        engineKey: engine.engine_key,
        engineName: engine.engine_name,
        engineGroup: engine.engine_group,
        engineType: engine.engine_type,
        description: engine.safe_summary || "",
        defaultEnabled: true,
        requiresVerifiedScope: false,
        requiresAuthenticatedContext: false,
        safeMethods: engine.engine_config?.safeMethods || ["GET", "HEAD"],
        timeoutSeconds: engine.engine_config?.timeoutSeconds || 30,
        maxRetries: engine.engine_config?.maxRetries || 1,
        weight: engine.coverage_weight,
      },
      job.target_url,
    );

    await supabase
      .from("scan_orchestrator_engine_runs")
      .update({
        run_status: result.status,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        status_message: "Engine completed.",
        safe_summary: result.safeSummary,
        evidence_summary: result.evidenceSummary,
        observations_count: result.observationsCount,
        findings_created_count: result.findingsCreatedCount,
        potential_findings_count: result.potentialFindingsCount,
        confirmed_findings_count: result.confirmedFindingsCount,
        engine_result: result.engineResult,
      })
      .eq("id", engine.id)
      .eq("user_id", user.id);

    await supabase.from("scan_orchestrator_events").insert({
      job_id: job.id,
      engine_run_id: engine.id,
      user_id: user.id,
      organization_id: job.organization_id,
      website_id: job.website_id,
      scan_id: job.scan_id,
      event_type: "engine-completed",
      severity: "Info",
      title: `${engine.engine_name} completed`,
      details: result.evidenceSummary,
      metadata: result.engineResult,
    });

    completed += 1;
  }

  await supabase.from("scan_orchestrator_events").insert({
    job_id: job.id,
    user_id: user.id,
    organization_id: job.organization_id,
    website_id: job.website_id,
    scan_id: job.scan_id,
    event_type: "pipeline-completed",
    severity: "Info",
    title: "Queued engines completed",
    details: `${completed} queued engine(s) completed in this run.`,
    metadata: { completed },
  });

  await recalculateJob(supabase, job.id);

  revalidatePath(`/report/${job.scan_id}/scan-orchestrator`);
  redirect(
    `/report/${job.scan_id}/scan-orchestrator?job=${job.id}&message=${encodeURIComponent(`${completed} engine(s) completed.`)}`,
  );
}

export async function retryFailedEnginesAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const jobId = clean(formData.get("jobId"));

  const { data: job } = await supabase
    .from("scan_orchestrator_jobs")
    .select("id, scan_id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) redirect("/dashboard?message=Pipeline not found");

  const { data: failed } = await supabase
    .from("scan_orchestrator_engine_runs")
    .select("id, retry_count")
    .eq("job_id", job.id)
    .eq("user_id", user.id)
    .in("run_status", ["failed", "completed-with-warnings"])
    .limit(50);

  for (const engine of failed || []) {
    await supabase
      .from("scan_orchestrator_engine_runs")
      .update({
        run_status: "queued",
        retry_count: (engine.retry_count || 0) + 1,
        status_message: "Queued for retry.",
        error_message: null,
      })
      .eq("id", engine.id)
      .eq("user_id", user.id);
  }

  await recalculateJob(supabase, job.id);

  revalidatePath(`/report/${job.scan_id}/scan-orchestrator`);
  redirect(
    `/report/${job.scan_id}/scan-orchestrator?job=${job.id}&message=${encodeURIComponent(`${failed?.length || 0} engine(s) queued for retry.`)}`,
  );
}
