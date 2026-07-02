import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["active", "completed", "sent", "Low", "Info"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (
    ["queued", "provider-not-configured", "Medium", "open", "paused"].includes(
      value,
    )
  )
    return "bg-amber-100 text-amber-950";
  if (["Critical", "High", "failed", "disabled"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminScheduledScansPage() {
  const supabase = (await createClient()) as any;
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

  const { data: targets } = await supabase
    .from("scheduled_scan_targets_v2")
    .select(
      "id, target_url, target_name, schedule_status, schedule_frequency, next_run_at, last_run_at, risk_threshold, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: runs } = await supabase
    .from("scheduled_scan_runs_v2")
    .select(
      "id, target_url, run_status, risk_level, risk_score, summary, email_should_send, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: emails } = await supabase
    .from("email_alert_queue_v2")
    .select(
      "id, recipient_email, email_subject, email_type, delivery_status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: events } = await supabase
    .from("email_alert_events_v2")
    .select("id, event_type, severity, title, details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Scheduled Scans Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor scheduled targets, safe check runs, queued emails and alert
          events.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Scheduled targets</h2>
          <div className="mt-6 grid gap-4">
            {targets?.length ? (
              targets.map((target: any) => (
                <div
                  key={target.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">
                        {target.target_name || target.target_url}
                      </p>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        {target.target_url}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {target.schedule_frequency} · threshold{" "}
                        {target.risk_threshold}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(target.schedule_status)}`}
                    >
                      {target.schedule_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No scheduled targets yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Recent runs</h2>
            <div className="mt-6 grid gap-3">
              {runs?.length ? (
                runs.map((run: any) => (
                  <div key={run.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(run.risk_level)}`}
                      >
                        {run.risk_level}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(run.run_status)}`}
                      >
                        {run.run_status}
                      </span>
                    </div>
                    <p className="mt-3 break-all font-black">
                      {run.target_url}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {run.summary}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No runs yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Email queue</h2>
            <div className="mt-6 grid gap-3">
              {emails?.length ? (
                emails.map((email: any) => (
                  <div key={email.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(email.delivery_status)}`}
                    >
                      {email.delivery_status}
                    </span>
                    <p className="mt-3 break-all font-black">
                      {email.email_subject}
                    </p>
                    <p className="mt-1 break-all text-sm text-slate-600">
                      {email.recipient_email}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No emails yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Events</h2>
          <div className="mt-6 grid gap-3">
            {events?.length ? (
              events.map((event: any) => (
                <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(event.severity)}`}
                  >
                    {event.severity}
                  </span>
                  <p className="mt-3 font-black">{event.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {event.details}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No events yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
