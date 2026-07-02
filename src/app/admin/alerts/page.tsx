import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAlertsPage() {
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

  const { data: notifications } = await supabase
    .from("security_alert_notifications")
    .select(
      "id, website_url, channel, recipient, alert_type, severity, title, status, delivery_mode, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(75);

  const { data: preferences } = await supabase
    .from("alert_preferences")
    .select(
      "id, website_url, status, in_app_enabled, email_enabled, recipient_email, min_severity, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Alert observability</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor alert preferences, queued notifications and simulated delivery
          status.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Alert preferences</h2>
          <div className="mt-6 grid gap-4">
            {preferences?.length ? (
              preferences.map((pref) => (
                <div
                  key={pref.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">{pref.website_url}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        in-app {String(pref.in_app_enabled)} · email{" "}
                        {String(pref.email_enabled)} · min {pref.min_severity}
                      </p>
                      {pref.recipient_email ? (
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {pref.recipient_email}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black">
                      {pref.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No alert preferences yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent alert notifications</h2>
          <div className="mt-6 grid gap-4">
            {notifications?.length ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">{item.website_url}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.channel} · {item.alert_type} ·{" "}
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                      <h3 className="mt-2 font-black">{item.title}</h3>
                      {item.recipient ? (
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          To: {item.recipient}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No alert notifications yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
