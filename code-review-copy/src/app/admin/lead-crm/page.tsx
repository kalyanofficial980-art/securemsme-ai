import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badge(value: string) {
  if (["qualified", "converted", "resolved"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["new", "contacted", "triaged", "reply-drafted"].includes(value))
    return "bg-amber-100 text-amber-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminLeadCrmPage() {
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

  const { data: demoRequests } = await supabase
    .from("public_demo_requests_v2")
    .select(
      "id, full_name, work_email, company_name, website_url, requested_plan, lead_status, lead_score, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const { data: supportTickets } = await supabase
    .from("support_contact_tickets_v2")
    .select(
      "id, full_name, email, company_name, website_url, topic, ticket_status, support_score, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-slate-500">Admin CRM</p>
            <h1 className="mt-2 text-4xl font-black">Lead CRM + CSV Export</h1>
            <p className="mt-4 max-w-3xl leading-7 text-slate-600">
              Combined demo leads and support tickets for manual follow-up.
            </p>
          </div>
          <Link
            href="/admin/lead-crm/export"
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
          >
            Download CSV
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Demo leads</h2>
            <div className="mt-5 grid gap-3">
              {demoRequests?.length ? (
                demoRequests.map((lead: any) => (
                  <div key={lead.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badge(lead.lead_status)}`}
                    >
                      {lead.lead_status}
                    </span>
                    <p className="mt-3 font-black">
                      {lead.full_name} · {lead.company_name || "No company"}
                    </p>
                    <p className="mt-1 break-all text-sm text-slate-600">
                      {lead.work_email} · {lead.website_url || "No website"}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {lead.requested_plan} · {lead.lead_score}/100
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No demo leads yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Support leads</h2>
            <div className="mt-5 grid gap-3">
              {supportTickets?.length ? (
                supportTickets.map((ticket: any) => (
                  <div key={ticket.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badge(ticket.ticket_status)}`}
                    >
                      {ticket.ticket_status}
                    </span>
                    <p className="mt-3 font-black">
                      {ticket.full_name} · {ticket.company_name || "No company"}
                    </p>
                    <p className="mt-1 break-all text-sm text-slate-600">
                      {ticket.email} · {ticket.website_url || "No website"}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {ticket.topic} · {ticket.support_score}/100
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No support leads yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
