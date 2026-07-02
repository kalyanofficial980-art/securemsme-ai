import { redirect } from "next/navigation";
import {
  createLeadReplyDraftAction,
  markReplySentManualAction,
  updateSupportTicketStatusAction,
} from "@/app/support/actions";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (
    ["resolved", "closed", "sent-manual", "safe-draft", "Info", "low"].includes(
      value,
    )
  )
    return "bg-emerald-100 text-emerald-950";
  if (
    [
      "new",
      "triaged",
      "reply-drafted",
      "waiting-customer",
      "draft",
      "queued",
      "ready-for-manual-send",
      "Medium",
      "normal",
      "high",
    ].includes(value)
  )
    return "bg-amber-100 text-amber-950";
  if (
    [
      "spam-review",
      "blocked",
      "failed",
      "urgent-review",
      "High",
      "Critical",
    ].includes(value)
  )
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminSupportInboxPage({
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

  const { data: tickets } = await supabase
    .from("support_contact_tickets_v2")
    .select(
      "id, full_name, email, company_name, website_url, topic, priority, message, ticket_status, support_score, client_safe_summary, admin_notes, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(80);
  const { data: demoRequests } = await supabase
    .from("public_demo_requests_v2")
    .select(
      "id, full_name, work_email, company_name, website_url, primary_need, requested_plan, lead_score, lead_status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(40);
  const { data: replyDrafts } = await supabase
    .from("lead_reply_drafts_v2")
    .select(
      "id, reply_type, to_email, subject, body, reply_status, safety_status, safety_notes, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(40);
  const { data: queue } = await supabase
    .from("support_email_queue_v2")
    .select(
      "id, queue_type, to_email, subject, body_preview, queue_status, provider, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(40);
  const { data: events } = await supabase
    .from("support_contact_events_v2")
    .select("id, event_type, severity, title, details, created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16">
        {message ? (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
            {message}
          </div>
        ) : null}
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Support Inbox</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Manage support tickets, demo lead follow-ups, safe reply drafts and
          manual email queue.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Support tickets</h2>
          <div className="mt-6 grid gap-4">
            {tickets?.length ? (
              tickets.map((ticket: any) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">
                        {ticket.full_name} ·{" "}
                        {ticket.company_name || "No company"}
                      </p>
                      <p className="mt-1 break-all text-sm text-slate-600">
                        {ticket.email} · {ticket.website_url || "No website"}
                      </p>
                      <p className="mt-3 text-sm font-bold text-slate-800">
                        {ticket.client_safe_summary}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600">
                        {ticket.message}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(ticket.ticket_status)}`}
                      >
                        {ticket.ticket_status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(ticket.priority)}`}
                      >
                        {ticket.priority}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                        {ticket.support_score}/100
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <form
                      action={updateSupportTicketStatusAction}
                      className="grid gap-3"
                    >
                      <input type="hidden" name="ticketId" value={ticket.id} />
                      <select
                        name="ticketStatus"
                        defaultValue={ticket.ticket_status}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                      >
                        <option value="new">new</option>
                        <option value="triaged">triaged</option>
                        <option value="reply-drafted">reply-drafted</option>
                        <option value="waiting-customer">
                          waiting-customer
                        </option>
                        <option value="resolved">resolved</option>
                        <option value="closed">closed</option>
                        <option value="spam-review">spam-review</option>
                      </select>
                      <input
                        name="adminNotes"
                        defaultValue={ticket.admin_notes || ""}
                        placeholder="Admin notes"
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                      <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                        Update Ticket
                      </button>
                    </form>
                    <form
                      action={createLeadReplyDraftAction}
                      className="grid gap-3"
                    >
                      <input
                        type="hidden"
                        name="supportTicketId"
                        value={ticket.id}
                      />
                      <input
                        type="hidden"
                        name="toEmail"
                        value={ticket.email}
                      />
                      <input
                        type="hidden"
                        name="fullName"
                        value={ticket.full_name}
                      />
                      <input
                        type="hidden"
                        name="companyName"
                        value={ticket.company_name || "your business"}
                      />
                      <input
                        type="hidden"
                        name="websiteUrl"
                        value={ticket.website_url || ""}
                      />
                      <input
                        type="hidden"
                        name="primaryNeed"
                        value={ticket.topic}
                      />
                      <select
                        name="replyType"
                        defaultValue="support"
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                      >
                        <option value="support">support</option>
                        <option value="billing">billing</option>
                        <option value="technical-support">
                          technical-support
                        </option>
                        <option value="security-report">security-report</option>
                        <option value="agency">agency</option>
                        <option value="legal">legal</option>
                      </select>
                      <input
                        name="requestedPlan"
                        defaultValue="the suitable launch plan"
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                      <button className="rounded-full bg-blue-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-900">
                        Create Safe Reply Draft
                      </button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No support tickets yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Demo lead reply workflow</h2>
          <div className="mt-6 grid gap-4">
            {demoRequests?.length ? (
              demoRequests.map((lead: any) => (
                <div
                  key={lead.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">
                        {lead.full_name} · {lead.company_name || "No company"}
                      </p>
                      <p className="mt-1 break-all text-sm text-slate-600">
                        {lead.work_email} · {lead.website_url || "No website"}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {lead.primary_need} · {lead.requested_plan}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(lead.lead_status)}`}
                      >
                        {lead.lead_status}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                        {lead.lead_score}/100
                      </span>
                    </div>
                  </div>
                  <form
                    action={createLeadReplyDraftAction}
                    className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]"
                  >
                    <input type="hidden" name="demoRequestId" value={lead.id} />
                    <input
                      type="hidden"
                      name="toEmail"
                      value={lead.work_email}
                    />
                    <input
                      type="hidden"
                      name="fullName"
                      value={lead.full_name}
                    />
                    <input
                      type="hidden"
                      name="companyName"
                      value={lead.company_name || "your business"}
                    />
                    <input
                      type="hidden"
                      name="websiteUrl"
                      value={lead.website_url || ""}
                    />
                    <input
                      type="hidden"
                      name="primaryNeed"
                      value={lead.primary_need || "security workflow"}
                    />
                    <select
                      name="replyType"
                      defaultValue="demo-follow-up"
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                    >
                      <option value="demo-follow-up">demo-follow-up</option>
                      <option value="pricing-follow-up">
                        pricing-follow-up
                      </option>
                      <option value="agency">agency</option>
                    </select>
                    <input
                      name="requestedPlan"
                      defaultValue={
                        lead.requested_plan || "the suitable launch plan"
                      }
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                    />
                    <button className="rounded-full bg-blue-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-900">
                      Draft Reply
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No demo requests found.</p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Reply drafts</h2>
            <div className="mt-6 grid gap-3">
              {replyDrafts?.length ? (
                replyDrafts.map((reply: any) => (
                  <div key={reply.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(reply.reply_status)}`}
                      >
                        {reply.reply_status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(reply.safety_status)}`}
                      >
                        {reply.safety_status}
                      </span>
                    </div>
                    <p className="mt-3 break-all font-black">
                      {reply.to_email}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {reply.subject}
                    </p>
                    <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs leading-5 text-slate-600">
                      {reply.body}
                    </pre>
                    <form action={markReplySentManualAction} className="mt-3">
                      <input
                        type="hidden"
                        name="replyDraftId"
                        value={reply.id}
                      />
                      <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black hover:bg-slate-100">
                        Mark Manual Sent
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No reply drafts yet.</p>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Email queue</h2>
            <div className="mt-6 grid gap-3">
              {queue?.length ? (
                queue.map((item: any) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.queue_status)}`}
                      >
                        {item.queue_status}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                        {item.provider}
                      </span>
                    </div>
                    <p className="mt-3 break-all font-black">{item.to_email}</p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {item.subject}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.body_preview}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No email queue items yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Support events</h2>
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
              <p className="text-slate-600">No support events yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
