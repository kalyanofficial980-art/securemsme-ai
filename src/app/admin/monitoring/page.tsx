import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMonitoringPage() {
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

  const { data: jobs } = await supabase
    .from("monitoring_jobs")
    .select(
      "id, website_url, job_status, cadence, risk_threshold, score_drop_threshold, latest_run_at, next_run_at, run_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: events } = await supabase
    .from("monitoring_events")
    .select(
      "id, event_type, severity, title, details, acknowledged, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Monitoring observability</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Track active monitoring jobs, score drift events and security
          regression alerts.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Monitoring jobs</h2>
          <div className="mt-6 grid gap-4">
            {jobs?.length ? (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">{job.website_url}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {job.cadence} · threshold {job.score_drop_threshold} ·
                        next{" "}
                        {job.next_run_at
                          ? new Date(job.next_run_at).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black">
                      {job.job_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No monitoring jobs yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest monitoring events</h2>
          <div className="mt-6 grid gap-4">
            {events?.length ? (
              events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-xs font-black uppercase text-slate-500">
                    {event.event_type} ·{" "}
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                  <h3 className="mt-1 font-black">{event.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {event.details}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No monitoring events yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
