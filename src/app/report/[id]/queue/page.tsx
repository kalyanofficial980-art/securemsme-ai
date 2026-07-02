import Link from "next/link";
import { redirect } from "next/navigation";
import { BackgroundQueuePanel } from "@/components/BackgroundQueuePanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function QueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to view queue");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_id, website_url")
    .eq("id", id);

  if (profile?.role !== "admin") scanQuery = scanQuery.eq("user_id", user.id);

  const { data: scan } = await scanQuery.single();
  if (!scan) redirect("/dashboard?message=Queue report not found");

  const { data: monitoringJob } = scan.website_id
    ? await supabase
        .from("monitoring_jobs")
        .select("id")
        .eq("user_id", scan.user_id)
        .eq("website_id", scan.website_id)
        .eq("job_status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : await supabase
        .from("monitoring_jobs")
        .select("id")
        .eq("user_id", scan.user_id)
        .eq("website_url", scan.website_url)
        .eq("job_status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  const { data: jobs } = await supabase
    .from("background_worker_jobs")
    .select(
      "id, job_type, job_status, priority, run_after, attempts, max_attempts, locked_at, locked_by, last_error, result, worker_version, created_at",
    )
    .eq("user_id", scan.user_id)
    .eq("source_scan_id", scan.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const jobIds = (jobs || []).map((job) => job.id);

  const { data: attempts } = jobIds.length
    ? await supabase
        .from("background_worker_attempts")
        .select(
          "id, worker_job_id, attempt_number, attempt_status, worker_id, started_at, completed_at, error_message",
        )
        .in("worker_job_id", jobIds)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  const { data: events } = jobIds.length
    ? await supabase
        .from("background_worker_events")
        .select("id, event_type, severity, title, details, created_at")
        .in("worker_job_id", jobIds)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/monitoring`}
              className="text-sm font-bold text-slate-600"
            >
              Back to monitoring
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Background Job Queue
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Worker queue, locking, attempts and scheduler foundation.
            </p>
          </div>

          <Link
            href="/background-worker"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Worker info
          </Link>
        </div>

        <BackgroundQueuePanel
          scanId={scan.id}
          websiteUrl={scan.website_url}
          monitoringReady={Boolean(monitoringJob?.id)}
          jobs={jobs || []}
          attempts={attempts || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
