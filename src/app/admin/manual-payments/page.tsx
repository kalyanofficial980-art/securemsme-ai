import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { requireAdmin } from "@/lib/admin";
import { reviewManualPaymentAction } from "./actions";

function badgeClass(value: string) {
  if (value === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "submitted_for_review" || value === "pending_payment")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (value === "rejected" || value === "expired")
    return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default async function AdminManualPaymentsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: payments } = await supabase
    .from("manual_payment_requests_v2")
    .select(
      "id, user_id, requested_plan_key, requested_plan_name, billing_cycle, amount_inr, payment_method, payment_reference, payer_name, payer_email, payer_phone, payment_note, request_status, admin_review_note, approved_at, rejected_at, plan_activated_at, plan_expires_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = payments ?? [];
  const pending = rows.filter((payment) => payment.request_status === "submitted_for_review" || payment.request_status === "pending_payment").length;
  const approved = rows.filter((payment) => payment.request_status === "approved").length;
  const rejected = rows.filter((payment) => payment.request_status === "rejected").length;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/admin" className="text-sm font-semibold text-blue-700">← Admin</Link>

        <div className="mt-6 flex flex-col justify-between gap-5 border-b border-slate-300 pb-7 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Revenue operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Payment approvals</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Verify the transaction outside VeyraSec, then approve or reject the request. Approval atomically updates the payment record, billing profile and server-side paid entitlement.
            </p>
          </div>
          <Link href="/pricing" className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Public pricing</Link>
        </div>

        {message ? <div className="mt-6 border-l-2 border-blue-700 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-950">{message}</div> : null}

        <div className="grid border-x border-b border-slate-300 bg-white sm:grid-cols-3">
          {[["Pending review", pending], ["Approved", approved], ["Rejected", rejected]].map(([label, value], index) => (
            <div key={String(label)} className={`p-5 ${index < 2 ? "border-b border-slate-200 sm:border-b-0 sm:border-r" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <section className="mt-8 border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold">Recent payment requests</h2>
            <p className="mt-1 text-sm text-slate-500">Latest 100 assisted billing requests.</p>
          </div>

          {rows.length ? (
            <div className="divide-y divide-slate-200">
              {rows.map((payment) => {
                const finalized = ["approved", "rejected", "expired"].includes(payment.request_status);
                return (
                  <article key={payment.id} className="p-6">
                    <div className="grid gap-6 lg:grid-cols-[1fr_220px] lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold">{payment.requested_plan_name} · ₹{Number(payment.amount_inr).toLocaleString("en-IN")}</h3>
                          <span className={`border px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(payment.request_status)}`}>{payment.request_status.replaceAll("_", " ")}</span>
                        </div>
                        <dl className="mt-5 grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="bg-white p-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Reference</dt><dd className="mt-1 break-all text-sm font-semibold">{payment.payment_reference}</dd></div>
                          <div className="bg-white p-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Method</dt><dd className="mt-1 text-sm capitalize">{payment.payment_method}</dd></div>
                          <div className="bg-white p-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Submitted</dt><dd className="mt-1 text-sm">{new Date(payment.created_at).toLocaleString()}</dd></div>
                          <div className="bg-white p-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Access through</dt><dd className="mt-1 text-sm">{payment.plan_expires_at ? new Date(payment.plan_expires_at).toLocaleDateString() : "—"}</dd></div>
                        </dl>
                        <div className="mt-4 text-sm leading-6 text-slate-600">
                          <p><span className="font-semibold text-slate-900">Payer:</span> {payment.payer_name} · {payment.payer_email}{payment.payer_phone ? ` · ${payment.payer_phone}` : ""}</p>
                          <p className="mt-1 break-all"><span className="font-semibold text-slate-900">User ID:</span> {payment.user_id}</p>
                          {payment.payment_note ? <p className="mt-1"><span className="font-semibold text-slate-900">Customer note:</span> {payment.payment_note}</p> : null}
                          {payment.admin_review_note ? <p className="mt-1"><span className="font-semibold text-slate-900">Admin note:</span> {payment.admin_review_note}</p> : null}
                        </div>
                      </div>

                      <aside className="border border-slate-200 bg-slate-50 p-4">
                        {finalized ? (
                          <div>
                            <p className="text-sm font-semibold">Review finalized</p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">Finalized requests cannot be changed to the opposite decision through the approval RPC.</p>
                          </div>
                        ) : (
                          <form action={reviewManualPaymentAction}>
                            <input type="hidden" name="requestId" value={payment.id} />
                            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Decision</label>
                            <select name="decision" className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold">
                              <option value="approved">Approve</option>
                              <option value="rejected">Reject</option>
                            </select>
                            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Verification note</label>
                            <textarea name="adminNote" rows={3} className="mt-2 w-full resize-none border border-slate-300 bg-white px-3 py-2.5 text-sm" placeholder="Bank/UPI verification note" />
                            <button className="mt-4 w-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Submit review</button>
                          </form>
                        )}
                      </aside>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-sm text-slate-500">No assisted payment requests yet.</div>
          )}
        </section>
      </section>
    </main>
  );
}
