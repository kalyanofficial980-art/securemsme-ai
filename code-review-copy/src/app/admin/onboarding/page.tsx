import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (
    [
      "completed",
      "Info",
      "starter",
      "active",
      "ready-to-scan",
      "scan-linked",
    ].includes(value)
  )
    return "bg-emerald-100 text-emerald-950";
  if (
    [
      "pending",
      "Medium",
      "plan-recommended",
      "growth",
      "needs-review",
      "draft",
    ].includes(value)
  )
    return "bg-amber-100 text-amber-950";
  if (
    ["blocked", "High", "Critical", "enterprise-review", "agency"].includes(
      value,
    )
  )
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminOnboardingPage() {
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

  const { data: onboardingProfiles } = await supabase
    .from("customer_onboarding_profiles_v2")
    .select(
      "id, business_name, business_type, country, industry, onboarding_status, onboarding_progress, latest_recommended_plan, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: funnels } = await supabase
    .from("customer_first_scan_funnels_v2")
    .select(
      "id, website_url, ownership_status, funnel_status, client_safe_summary, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: recommendations } = await supabase
    .from("customer_plan_recommendations_v2")
    .select(
      "id, recommended_plan, recommendation_score, recommendation_reason, next_best_action, billing_cta, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: events } = await supabase
    .from("customer_onboarding_admin_events_v2")
    .select("id, event_type, severity, title, details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Customer Onboarding Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor business profiles, first scan funnels, plan recommendations
          and onboarding completion.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Profiles</h2>
          <div className="mt-6 grid gap-4">
            {onboardingProfiles?.length ? (
              onboardingProfiles.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">
                        {item.business_name || "Unnamed business"}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {item.business_type} · {item.country} ·{" "}
                        {item.industry || "No industry"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.onboarding_status)}`}
                      >
                        {item.onboarding_status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.latest_recommended_plan)}`}
                      >
                        {item.latest_recommended_plan}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                        {item.onboarding_progress}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No onboarding profiles yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">First scan funnels</h2>
            <div className="mt-6 grid gap-3">
              {funnels?.length ? (
                funnels.map((item: any) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.funnel_status)}`}
                    >
                      {item.funnel_status}
                    </span>
                    <p className="mt-3 break-all font-black">
                      {item.website_url}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.client_safe_summary}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No first scan funnels yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Recommendations</h2>
            <div className="mt-6 grid gap-3">
              {recommendations?.length ? (
                recommendations.map((item: any) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.recommended_plan)}`}
                    >
                      {item.recommended_plan} · {item.recommendation_score}/100
                    </span>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.recommendation_reason}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {item.billing_cta}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No recommendations yet.</p>
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
