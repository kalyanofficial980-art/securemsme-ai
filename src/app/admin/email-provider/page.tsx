import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getEmailEnvStatus } from "@/lib/email-provider";
import { createClient } from "@/lib/supabase/server";

export default async function AdminEmailProviderPage() {
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

  const { data: runs } = await supabase
    .from("email_provider_delivery_runs")
    .select(
      "id, provider, delivery_type, recipient_email, subject, status, provider_message_id, error_message, created_at, sent_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: events } = await supabase
    .from("email_provider_events")
    .select("id, event_type, severity, title, details, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const env = getEmailEnvStatus();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Email provider observability
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor real email delivery status, provider message IDs and failures.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-black">Resend API key</p>
            <p className="mt-2 text-sm text-slate-600">
              {env.resendApiKeyConfigured ? "configured" : "missing"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-black">From email</p>
            <p className="mt-2 text-sm text-slate-600">
              {env.fromEmailConfigured ? "configured" : "missing"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-black">Site URL</p>
            <p className="mt-2 break-all text-sm text-slate-600">
              {env.siteUrl}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest delivery runs</h2>
          <div className="mt-6 grid gap-4">
            {runs?.length ? (
              runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        {run.delivery_type} · {run.provider} ·{" "}
                        {new Date(run.created_at).toLocaleString()}
                      </p>
                      <h3 className="mt-1 font-black">{run.subject}</h3>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        To: {run.recipient_email}
                      </p>
                      {run.provider_message_id ? (
                        <p className="mt-2 text-xs font-bold text-emerald-700">
                          {run.provider_message_id}
                        </p>
                      ) : null}
                      {run.error_message ? (
                        <p className="mt-2 text-sm font-bold text-red-700">
                          {run.error_message}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black">
                      {run.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No email delivery runs yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Email provider events</h2>
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
              <p className="text-slate-600">No email provider events yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
