import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["Info", "active", "message-created"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["Medium", "answer-blocked"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["High", "Critical"].includes(value)) return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminAiCopilotPage() {
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

  const { data: sessions } = await supabase
    .from("ai_copilot_sessions_v2")
    .select(
      "id, session_title, copilot_mode, session_status, source_count, message_count, target_url, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: events } = await supabase
    .from("ai_copilot_admin_events_v2")
    .select("id, event_type, severity, title, details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: feedback } = await supabase
    .from("ai_copilot_feedback_v2")
    .select("id, feedback_value, feedback_note, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">AI Copilot Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor copilot sessions, blocked answers and user feedback.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Sessions</h2>
          <div className="mt-6 grid gap-4">
            {sessions?.length ? (
              sessions.map((session: any) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{session.session_title}</p>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        {session.target_url}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {session.source_count} sources · {session.message_count}{" "}
                        messages · {session.copilot_mode}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(session.session_status)}`}
                    >
                      {session.session_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No copilot sessions yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
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

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Feedback</h2>
            <div className="mt-6 grid gap-3">
              {feedback?.length ? (
                feedback.map((item: any) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.feedback_value)}`}
                    >
                      {item.feedback_value}
                    </span>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.feedback_note || "No note"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No feedback yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
