import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["accepted", "Info", "page-view", "cta-click"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (
    ["demo-request", "pricing-interest", "Medium", "spam-review"].includes(
      value,
    )
  )
    return "bg-amber-100 text-amber-950";
  if (["ignored", "High", "Critical"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminLaunchAnalyticsPage() {
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

  const { data: events } = await supabase
    .from("launch_analytics_events_v2")
    .select(
      "id, event_type, source_path, target_path, campaign_source, campaign_medium, campaign_name, device_hint, event_status, privacy_mode, client_safe_summary, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(150);

  const { data: seoPages } = await supabase
    .from("launch_seo_pages_v2")
    .select(
      "id, path, page_title, meta_description, page_type, indexable, priority, change_frequency, seo_status, updated_at",
    )
    .order("priority", { ascending: false })
    .limit(100);

  const { data: adminEvents } = await supabase
    .from("launch_seo_admin_events_v2")
    .select("id, event_type, severity, title, details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const totalEvents = events?.length || 0;
  const demoEvents =
    events?.filter((event: any) => event.event_type === "demo-request")
      .length || 0;
  const pricingEvents =
    events?.filter((event: any) => event.event_type === "pricing-interest")
      .length || 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Launch Analytics</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Privacy-safe public launch analytics and SEO observability. No cookies
          or fingerprinting.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["Total events", totalEvents],
            ["Demo events", demoEvents],
            ["Pricing events", pricingEvents],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <p className="text-sm font-black text-slate-500">{label}</p>
              <p className="mt-2 text-4xl font-black">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent launch events</h2>
          <div className="mt-6 grid gap-3">
            {events?.length ? (
              events.map((event: any) => (
                <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(event.event_type)}`}
                    >
                      {event.event_type}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(event.event_status)}`}
                    >
                      {event.event_status}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                      {event.privacy_mode}
                    </span>
                  </div>
                  <p className="mt-3 font-black">
                    {event.source_path || "unknown source"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {event.client_safe_summary}
                  </p>
                  {event.campaign_source ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Campaign: {event.campaign_source} /{" "}
                      {event.campaign_medium} / {event.campaign_name}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-slate-600">No launch analytics events yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">SEO pages</h2>
            <div className="mt-6 grid gap-3">
              {seoPages?.length ? (
                seoPages.map((page: any) => (
                  <div key={page.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(page.seo_status)}`}
                      >
                        {page.seo_status}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                        priority {page.priority}
                      </span>
                    </div>
                    <p className="mt-3 font-black">{page.page_title}</p>
                    <p className="mt-1 text-sm text-slate-600">{page.path}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {page.meta_description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">
                  No SEO page records yet. Run Part 74 SQL seed.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Admin events</h2>
            <div className="mt-6 grid gap-3">
              {adminEvents?.length ? (
                adminEvents.map((event: any) => (
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
                <p className="text-slate-600">No SEO admin events yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
