import Link from "next/link";
import { updateSupportTicketStatusAction } from "@/app/support/actions";
import { Navbar } from "@/components/Navbar";
import { requireAdmin } from "@/lib/admin";

function badgeClass(value: string) {
  if (["resolved", "closed"].includes(value)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["open", "in_progress", "normal", "high"].includes(value)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["urgent-review", "critical"].includes(value.toLowerCase())) return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default async function AdminSupportInboxPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: requests } = await supabase
    .from("support_requests_v2")
    .select("id, user_id, subject, request_type, priority, request_status, contact_email, message, admin_note, assigned_to, created_at, updated_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = requests ?? [];
  const openCount = rows.filter((request) => request.request_status === "open").length;
  const activeCount = rows.filter((request) => request.request_status === "in_progress").length;
  const resolvedCount = rows.filter((request) => ["resolved", "closed"].includes(request.request_status)).length;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/admin" className="text-sm font-semibold text-blue-700">← Admin</Link>

        <div className="mt-6 border-b border-slate-300 pb-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Customer operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Support inbox</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Customer requests from the public contact form. Keep status and internal notes here so launch support stays traceable.</p>
        </div>

        {message ? <div className="mt-6 border-l-2 border-blue-700 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-950">{message}</div> : null}

        <div className="grid border-x border-b border-slate-300 bg-white sm:grid-cols-3">
          {[["Open", openCount], ["In progress", activeCount], ["Resolved / closed", resolvedCount]].map(([label, value], index) => (
            <div key={String(label)} className={`p-5 ${index < 2 ? "border-b border-slate-200 sm:border-b-0 sm:border-r" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <section className="mt-8 border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold">Recent requests</h2>
          </div>
          {rows.length ? (
            <div className="divide-y divide-slate-200">
              {rows.map((request) => (
                <article key={request.id} className="p-6">
                  <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold">{request.subject}</h3>
                        <span className={`border px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(request.request_status)}`}>{request.request_status.replaceAll("_", " ")}</span>
                        <span className={`border px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(request.priority)}`}>{request.priority}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{request.contact_email} · {request.request_type} · {new Date(request.created_at).toLocaleString()}</p>
                      <p className="mt-4 whitespace-pre-wrap border-l-2 border-slate-200 pl-4 text-sm leading-6 text-slate-700">{request.message}</p>
                      {request.admin_note ? <p className="mt-4 text-sm text-slate-600"><span className="font-semibold text-slate-900">Internal note:</span> {request.admin_note}</p> : null}
                    </div>

                    <form action={updateSupportTicketStatusAction} className="border border-slate-200 bg-slate-50 p-4">
                      <input type="hidden" name="requestId" value={request.id} />
                      <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</label>
                      <select name="status" defaultValue={request.request_status} className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold">
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Internal note</label>
                      <textarea name="adminNote" defaultValue={request.admin_note || ""} rows={3} className="mt-2 w-full resize-none border border-slate-300 bg-white px-3 py-2.5 text-sm" />
                      <button className="mt-4 w-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Update request</button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-sm text-slate-500">No support requests yet.</div>
          )}
        </section>
      </section>
    </main>
  );
}
