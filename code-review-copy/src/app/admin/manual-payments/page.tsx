import { redirect } from "next/navigation";
import { reviewManualPaymentAction } from "@/app/launch-ready/actions";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (value === "approved") return "bg-emerald-100 text-emerald-950";
  if (value === "submitted_for_review" || value === "pending_payment")
    return "bg-amber-100 text-amber-950";
  if (value === "rejected" || value === "expired")
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminManualPaymentsPage({
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

  const { data: payments } = await supabase
    .from("manual_payment_requests_v2")
    .select(
      "id, user_id, requested_plan_key, requested_plan_name, billing_cycle, amount_inr, payment_method, payment_reference, payer_name, payer_email, payer_phone, payment_note, request_status, admin_review_note, created_at",
    )
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
        <p className="text-sm font-black text-slate-500">Admin</p>
        <h1 className="mt-2 text-4xl font-black">Manual Payment Approvals</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Review UTR/reference payments and activate paid plans manually. Do not
          approve without verifying payment outside the app.
        </p>
        <div className="mt-10 grid gap-5">
          {payments?.length ? (
            payments.map((payment: any) => (
              <div
                key={payment.id}
                className="rounded-3xl border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {payment.requested_plan_key} · {payment.billing_cycle}
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {payment.requested_plan_name} · ₹{payment.amount_inr}
                    </h2>
                    <p className="mt-2 text-sm font-bold text-slate-600">
                      Reference: {payment.payment_reference}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Payer: {payment.payer_name} · {payment.payer_email} ·{" "}
                      {payment.payer_phone}
                    </p>
                    {payment.payment_note ? (
                      <p className="mt-2 text-sm text-slate-700">
                        {payment.payment_note}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(payment.request_status)}`}
                  >
                    {payment.request_status}
                  </span>
                </div>
                <form
                  action={reviewManualPaymentAction}
                  className="mt-6 grid gap-3 md:grid-cols-[160px_1fr_auto]"
                >
                  <input type="hidden" name="requestId" value={payment.id} />
                  <select
                    name="decision"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black"
                  >
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                  </select>
                  <input
                    name="adminNote"
                    placeholder="Admin note / verification proof"
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                  />
                  <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
                    Submit Review
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-white p-6 text-slate-600">
              No manual payment requests yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
