import { redirect } from "next/navigation";
import { recordAbuseTestEventAction } from "@/app/launch-ops/actions";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badge(value: string) {
  if (["allow", "active", "Info"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["manual-review", "monitor-only", "rate-limit", "Medium"].includes(value))
    return "bg-amber-100 text-amber-950";
  return "bg-red-100 text-red-950";
}

export default async function AdminAbuseProtectionPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
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

  const { data: rules } = await supabase
    .from("launch_abuse_guard_rules_v2")
    .select("*")
    .order("created_at");
  const { data: events } = await supabase
    .from("launch_rate_limit_events_v2")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        {message ? (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
            {message}
          </div>
        ) : null}
        <p className="text-sm font-black text-slate-500">Admin security ops</p>
        <h1 className="mt-2 text-4xl font-black">Abuse Protection</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          No-cookie abuse monitoring foundation. CAPTCHA/provider rate limit can
          be added later.
        </p>

        <form
          action={recordAbuseTestEventAction}
          className="mt-10 rounded-3xl border border-slate-200 bg-white p-8"
        >
          <h2 className="text-2xl font-black">Record admin abuse test</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <input
              name="email"
              placeholder="test@example.com"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
            <input
              name="message"
              placeholder="message"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
            <input
              name="honeypot"
              placeholder="honeypot optional"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
              Record Test
            </button>
          </div>
        </form>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Guard rules</h2>
            <div className="mt-5 grid gap-3">
              {rules?.map((rule: any) => (
                <div key={rule.id} className="rounded-2xl bg-slate-50 p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${badge(rule.rule_status)}`}
                  >
                    {rule.rule_status}
                  </span>
                  <p className="mt-3 font-black">{rule.rule_title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {rule.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Recent events</h2>
            <div className="mt-5 grid gap-3">
              {events?.length ? (
                events.map((event: any) => (
                  <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badge(event.decision)}`}
                    >
                      {event.decision}
                    </span>
                    <p className="mt-3 font-black">
                      {event.event_type} · {event.risk_score}/100
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {event.reason}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No abuse events yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
