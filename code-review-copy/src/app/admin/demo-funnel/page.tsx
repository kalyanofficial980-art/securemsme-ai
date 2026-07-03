import { redirect } from "next/navigation";
import { updateDemoRequestStatusAction } from "@/app/demo/actions";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["converted", "qualified", "Info", "starter", "active"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["new", "contacted", "demo-booked", "Medium", "growth"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (
    [
      "spam-review",
      "not-fit",
      "High",
      "Critical",
      "agency",
      "enterprise-review",
    ].includes(value)
  )
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminDemoFunnelPage({
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

  const { data: requests } = await supabase
    .from("public_demo_requests_v2")
    .select(
      "id, full_name, work_email, company_name, website_url, business_type, primary_need, requested_plan, urgency, lead_score, lead_status, client_safe_summary, admin_notes, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: interests } = await supabase
    .from("public_pricing_interests_v2")
    .select(
      "id, selected_plan, billing_preference, expected_usage, price_sensitivity, pricing_reason, next_best_action, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: events } = await supabase
    .from("public_demo_admin_events_v2")
    .select("id, event_type, severity, title, details, created_at")
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

        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Demo Funnel Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor public demo requests, pricing interests and public launch
          funnel events.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Demo requests</h2>
          <div className="mt-6 grid gap-4">
            {requests?.length ? (
              requests.map((request: any) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">
                        {request.full_name} ·{" "}
                        {request.company_name || "No company"}
                      </p>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        {request.work_email} ·{" "}
                        {request.website_url || "No website"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {request.client_safe_summary}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(request.lead_status)}`}
                      >
                        {request.lead_status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(request.requested_plan)}`}
                      >
                        {request.requested_plan}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                        {request.lead_score}/100
                      </span>
                    </div>
                  </div>
                  <form
                    action={updateDemoRequestStatusAction}
                    className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]"
                  >
                    <input type="hidden" name="requestId" value={request.id} />
                    <select
                      name="leadStatus"
                      defaultValue={request.lead_status}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                    >
                      <option value="new">new</option>
                      <option value="qualified">qualified</option>
                      <option value="contacted">contacted</option>
                      <option value="demo-booked">demo-booked</option>
                      <option value="converted">converted</option>
                      <option value="not-fit">not-fit</option>
                      <option value="spam-review">spam-review</option>
                    </select>
                    <input
                      name="adminNotes"
                      defaultValue={request.admin_notes || ""}
                      placeholder="Admin notes"
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                    />
                    <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                      Update
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No demo requests yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Pricing interests</h2>
            <div className="mt-6 grid gap-3">
              {interests?.length ? (
                interests.map((item: any) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.selected_plan)}`}
                    >
                      {item.selected_plan}
                    </span>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.pricing_reason}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {item.next_best_action}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No pricing interests yet.</p>
              )}
            </div>
          </div>

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
                <p className="text-slate-600">No demo events yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
