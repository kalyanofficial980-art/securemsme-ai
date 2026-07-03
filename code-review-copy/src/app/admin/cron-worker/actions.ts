"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { processDueWorkerJobs } from "@/lib/cron-worker-processor";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login as admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin")
    redirect("/dashboard?message=Admin access required");

  return { supabase, user };
}

export async function runDueCronWorkerBatch(formData: FormData) {
  const maxJobs = Math.max(
    1,
    Math.min(50, Number(formData.get("maxJobs") || 5)),
  );
  const { supabase, user } = await requireAdmin();

  const result = await processDueWorkerJobs(
    supabase as unknown as Parameters<typeof processDueWorkerJobs>[0],
    {
      maxJobs,
      triggerSource: "manual-admin",
      createdBy: user.id,
      workerName: "securemsme-admin-manual-worker",
    },
  );

  revalidatePath("/admin/cron-worker");
  redirect(
    `/admin/cron-worker?message=${encodeURIComponent(
      `Batch ${result.status}: picked ${result.pickedCount}, completed ${result.completedCount}, failed ${result.failedCount}`,
    )}`,
  );
}

export async function enqueueDueMonitoringJobs() {
  const { supabase, user } = await requireAdmin();
  const now = new Date().toISOString();

  const { data: dueJobs } = await supabase
    .from("monitoring_jobs")
    .select("id, user_id, website_id, website_url, next_run_at, job_status")
    .eq("job_status", "active")
    .lte("next_run_at", now)
    .limit(25);

  let created = 0;

  for (const job of dueJobs || []) {
    const { data: existing } = await supabase
      .from("background_worker_jobs")
      .select("id")
      .eq("monitoring_job_id", job.id)
      .in("job_status", ["queued", "retrying", "running"])
      .limit(1)
      .maybeSingle();

    if (existing?.id) continue;

    await supabase.from("background_worker_jobs").insert({
      user_id: job.user_id,
      website_id: job.website_id || null,
      monitoring_job_id: job.id,
      job_type: "monitoring-evaluation",
      job_status: "queued",
      scheduled_for: now,
      payload: {
        monitoringJobId: job.id,
        websiteUrl: job.website_url,
        enqueuedBy: "admin-due-picker",
        enqueuedByUserId: user.id,
      },
    });

    created += 1;
  }

  await supabase.from("cron_worker_events").insert({
    user_id: user.id,
    event_type: "cron-info",
    severity: "Info",
    title: "Due monitoring jobs enqueued",
    details: `Created ${created} background worker jobs from due monitoring jobs.`,
    metadata: { created },
  });

  revalidatePath("/admin/cron-worker");
  redirect(
    `/admin/cron-worker?message=${encodeURIComponent(`Enqueued ${created} due monitoring jobs.`)}`,
  );
}
