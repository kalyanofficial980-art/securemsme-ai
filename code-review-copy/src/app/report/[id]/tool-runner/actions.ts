"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildToolJobRows, buildToolRunnerReport } from "@/lib/tool-runner";
import { createClient } from "@/lib/supabase/server";

export async function createToolRunnerJob(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to create tool runner job");
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

  const report = buildToolRunnerReport({
    websiteUrl: scan.website_url,
    scanId: scan.id,
    report: (scan.report || {}) as Record<string, unknown>,
    verifiedScope,
  });

  const { data: job, error: jobError } = await supabase
    .from("security_tool_jobs")
    .insert({
      user_id: user.id,
      website_id: scan.website_id || null,
      scan_id: scan.id,
      job_type: "report-tool-runner",
      tool_mode: report.mode,
      status: "completed",
      requested_tools: report.tools.map((tool) => tool.id),
      safe_boundary: report.safeBoundary,
      result_summary: {
        version: report.version,
        completedTools: report.completedTools,
        blockedTools: report.blockedTools,
        architectureReadyTools: report.architectureReadyTools,
        normalizedEvidence: report.normalizedEvidence.length,
        customerMessage: report.customerMessage,
      },
      total_tools: report.totalTools,
      completed_tools: report.completedTools,
      failed_tools: 0,
      blocked_tools: report.blockedTools,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job?.id) {
    redirect(
      `/report/${scan.id}/tool-runner?message=${encodeURIComponent(
        `Could not create tool runner job: ${jobError?.message || "Unknown error"}`,
      )}`,
    );
  }

  const { runRows, evidenceRows } = buildToolJobRows({
    userId: user.id,
    websiteId: scan.website_id || null,
    scanId: scan.id,
    report,
  });

  if (runRows.length) {
    const { data: runs } = await supabase
      .from("security_tool_runs")
      .insert(runRows.map((row) => ({ ...row, job_id: job.id })))
      .select("id, tool_id");

    if (runs?.length && evidenceRows.length) {
      const runIdByTool = new Map(
        runs.map((run: { id: string; tool_id: string }) => [
          run.tool_id,
          run.id,
        ]),
      );

      await supabase.from("security_tool_evidence").insert(
        evidenceRows.map((row) => ({
          ...row,
          job_id: job.id,
          run_id: runIdByTool.get(row.source_tool_id) || null,
        })),
      );
    }
  }

  revalidatePath(`/report/${scan.id}/tool-runner`);
  redirect(
    `/report/${scan.id}/tool-runner?message=${encodeURIComponent(
      "Tool runner job created and evidence normalized.",
    )}`,
  );
}
