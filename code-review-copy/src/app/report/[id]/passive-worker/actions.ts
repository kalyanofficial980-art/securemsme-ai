"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runPassiveZapStyleWorker } from "@/lib/passive-zap-worker";
import { createClient } from "@/lib/supabase/server";

export async function runPassiveWorkerForScan(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to run passive worker");
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, website_url, report")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    redirect("/dashboard?message=Scan not found");
  }

  let verifiedScope = false;

  if (scan.website_id) {
    const { data: website } = await supabase
      .from("websites")
      .select("verification_status, deep_scan_enabled, permission_attested_at")
      .eq("id", scan.website_id)
      .eq("user_id", user.id)
      .maybeSingle();

    verifiedScope = Boolean(
      website?.verification_status === "verified" &&
      website?.deep_scan_enabled &&
      website?.permission_attested_at,
    );
  }

  const workerReport = runPassiveZapStyleWorker({
    websiteUrl: scan.website_url,
    report: (scan.report || {}) as Record<string, unknown>,
    verifiedScope,
  });

  const { data: job, error: jobError } = await supabase
    .from("security_tool_jobs")
    .insert({
      user_id: user.id,
      website_id: scan.website_id || null,
      scan_id: scan.id,
      job_type: "passive-zap-worker",
      tool_mode: workerReport.mode,
      status: "completed",
      requested_tools: ["passive-zap-worker"],
      safe_boundary: workerReport.safeBoundary,
      result_summary: {
        version: workerReport.version,
        pagesObserved: workerReport.pagesObserved,
        linksDiscovered: workerReport.linksDiscovered,
        alertsObserved: workerReport.alertsObserved,
        normalizedEvidence: workerReport.normalizedEvidence.length,
      },
      total_tools: 1,
      completed_tools: 1,
      failed_tools: 0,
      blocked_tools: workerReport.blockedActions,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job?.id) {
    redirect(
      `/report/${scan.id}/passive-worker?message=${encodeURIComponent(
        `Could not create passive worker job: ${jobError?.message || "Unknown error"}`,
      )}`,
    );
  }

  const { data: run } = await supabase
    .from("security_tool_runs")
    .insert({
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id || null,
      scan_id: scan.id,
      tool_id: "passive-zap-worker",
      tool_name: "Passive ZAP-style Worker",
      tool_category: "Passive worker",
      tool_mode: workerReport.mode,
      status: "completed",
      requires_verification: false,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      output_summary: {
        pagesObserved: workerReport.pagesObserved,
        linksDiscovered: workerReport.linksDiscovered,
        alertsObserved: workerReport.alertsObserved,
        blockedActions: workerReport.blockedActions,
        maxPages: workerReport.policy.maxPages,
      },
      evidence_count: workerReport.normalizedEvidence.length,
      safe_boundary: workerReport.safeBoundary,
    })
    .select("id")
    .single();

  if (workerReport.normalizedEvidence.length) {
    await supabase.from("security_tool_evidence").insert(
      workerReport.normalizedEvidence.slice(0, 80).map((item) => ({
        job_id: job.id,
        run_id: run?.id || null,
        user_id: user.id,
        website_id: scan.website_id || null,
        scan_id: scan.id,
        source_tool_id: item.sourceToolId,
        source_tool_name: item.sourceToolName,
        evidence_type: item.evidenceType,
        title: item.title,
        category: item.category,
        severity: item.severity,
        status: item.status,
        confidence: item.confidence,
        false_positive_risk: item.falsePositiveRisk,
        raw_evidence: item.rawEvidence,
        normalized_evidence: item.normalizedEvidence,
        claim_control: item.claimControl,
      })),
    );
  }

  revalidatePath(`/report/${scan.id}/passive-worker`);
  redirect(
    `/report/${scan.id}/passive-worker?message=${encodeURIComponent(
      "Passive worker executed and evidence saved.",
    )}`,
  );
}
