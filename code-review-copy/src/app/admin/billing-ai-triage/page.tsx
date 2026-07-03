import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["active", "allowed", "Low", "Info"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["warning", "trialing", "Medium", "Needs Review"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["blocked", "past-due", "Urgent", "High", "Critical"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminBillingAiTriagePage() {
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

  const { data: billingProfiles } = await supabase
    .from("user_billing_profiles_v2")
    .select(
      "id, user_id, plan_key, billing_status, current_period_start, current_period_end, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: usageEvents } = await supabase
    .from("usage_events_v2")
    .select(
      "id, event_type, usage_key, plan_key, limit_value, used_after_event, event_status, event_title, event_details, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: triageRuns } = await supabase
    .from("ai_triage_runs_v2")
    .select(
      "id, target_url, total_item_count, urgent_count, high_priority_count, triage_score, business_impact_score, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Billing + AI Triage Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor plan assignments, usage events, limit warnings and AI triage
          runs.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Billing profiles</h2>
          <div className="mt-6 grid gap-4">
            {billingProfiles?.length ? (
              billingProfiles.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{item.plan_key}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        User {item.user_id}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.billing_status)}`}
                    >
                      {item.billing_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No billing profiles yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Usage events</h2>
          <div className="mt-6 grid gap-4">
            {usageEvents?.length ? (
              usageEvents.map((event: any) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{event.event_title}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {event.event_details}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {event.usage_key} · {event.used_after_event}/
                        {event.limit_value} · {event.plan_key}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(event.event_status)}`}
                    >
                      {event.event_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No usage events yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">AI triage runs</h2>
          <div className="mt-6 grid gap-4">
            {triageRuns?.length ? (
              triageRuns.map((run: any) => (
                <div
                  key={run.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="break-all font-black">{run.target_url}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    triage {run.triage_score}/100 · business{" "}
                    {run.business_impact_score}/100 · items{" "}
                    {run.total_item_count}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    urgent {run.urgent_count} · high {run.high_priority_count}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No AI triage runs yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
