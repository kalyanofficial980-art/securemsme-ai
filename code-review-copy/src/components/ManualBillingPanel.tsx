import { submitManualPaymentRequestAction } from "@/app/launch-ready/actions";
import { launchPlans } from "@/lib/launch-ready-legal-payment-engine";

type Payment = {
  id: string;
  requested_plan_name: string;
  billing_cycle: string;
  amount_inr: number;
  payment_reference: string;
  request_status: string;
  admin_review_note: string;
  plan_activated_at: string | null;
  plan_expires_at: string | null;
  created_at: string;
};

function badgeClass(value: string) {
  if (value === "approved") return "bg-emerald-100 text-emerald-950";
  if (value === "submitted_for_review" || value === "pending_payment")
    return "bg-amber-100 text-amber-950";
  if (value === "rejected" || value === "expired")
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export function ManualBillingPanel({
  payments,
  message,
}: {
  payments: Payment[];
  message?: string;
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}
      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <p className="text-sm font-black text-blue-700">
          Manual approval billing
        </p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Manual Billing
        </h1>
        <p className="mt-4 max-w-4xl leading-8 text-blue-900">
          Choose a plan, pay manually by UPI/bank transfer and submit
          UTR/reference. Your plan activates only after admin approval.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        {launchPlans.map((plan) => (
          <div
            key={plan.key}
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-xl font-black">{plan.name}</h2>
            <p className="mt-3 text-3xl font-black">₹{plan.amountInr}</p>
            <p className="mt-2 text-sm text-slate-500">per month</p>
            <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
              <p>{plan.websites} website(s)</p>
              <p>{plan.monthlyScans} scans/month</p>
              <p>{plan.reports} reports/month</p>
              <p>{plan.supportLevel}</p>
            </div>
          </div>
        ))}
      </div>
      <form
        action={submitManualPaymentRequestAction}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <h2 className="text-2xl font-black">Submit payment request</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Plan
            <select
              name="planKey"
              className="rounded-2xl border border-slate-300 px-4 py-3"
            >
              <option value="starter">Starter ₹999</option>
              <option value="business">Business ₹2,999</option>
              <option value="pro">Pro ₹7,999</option>
              <option value="agency">Agency ₹19,999</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Billing cycle
            <select
              name="billingCycle"
              className="rounded-2xl border border-slate-300 px-4 py-3"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly · pay 10 months</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Payment method
            <select
              name="paymentMethod"
              className="rounded-2xl border border-slate-300 px-4 py-3"
            >
              <option value="upi">UPI</option>
              <option value="bank-transfer">Bank Transfer</option>
              <option value="manual-other">Other manual</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            UTR / Reference number
            <input
              name="paymentReference"
              className="rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Example: UTR123456789"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Payer name
            <input
              name="payerName"
              className="rounded-2xl border border-slate-300 px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Payer email
            <input
              name="payerEmail"
              type="email"
              className="rounded-2xl border border-slate-300 px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Phone optional
            <input
              name="payerPhone"
              className="rounded-2xl border border-slate-300 px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Payment note optional
            <input
              name="paymentNote"
              className="rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Do not enter UPI PIN/password"
            />
          </label>
        </div>
        <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
          Do not submit card numbers, UPI PINs, passwords, OTPs or bank login
          details.
        </div>
        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
          Submit for Admin Approval
        </button>
      </form>
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">Your payment requests</h2>
        <div className="mt-6 grid gap-4">
          {payments.length ? (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="font-black">
                      {payment.requested_plan_name} · ₹{payment.amount_inr}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Reference: {payment.payment_reference}
                    </p>
                    {payment.admin_review_note ? (
                      <p className="mt-2 text-sm font-bold text-slate-700">
                        {payment.admin_review_note}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(payment.request_status)}`}
                  >
                    {payment.request_status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-600">No payment requests yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
