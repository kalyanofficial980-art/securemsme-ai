import Link from "next/link";
import { submitManualPaymentRequestAction } from "@/app/launch-ready/actions";
import { launchPlans } from "@/lib/launch-ready-legal-payment-engine";

type Payment = {
  id: string;
  requested_plan_name: string;
  billing_cycle: string;
  amount_inr: number;
  payment_reference: string;
  request_status: string;
  admin_review_note: string | null;
  plan_activated_at: string | null;
  plan_expires_at: string | null;
  created_at: string;
};

type Props = {
  payments: Payment[];
  message?: string;
  selectedPlan: string;
  currentPlan: string;
  currentPlanExpiresAt: string | null;
  payerName: string;
  payerEmail: string;
};

function badgeClass(value: string) {
  if (value === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "submitted_for_review" || value === "pending_payment")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (value === "rejected" || value === "expired")
    return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ManualBillingPanel({
  payments,
  message,
  selectedPlan,
  currentPlan,
  currentPlanExpiresAt,
  payerName,
  payerEmail,
}: Props) {
  const paidPlans = launchPlans.filter((plan) => plan.key !== "free");
  const latestRequest = payments[0];

  return (
    <section>
      {message ? (
        <div className="mb-6 border-l-2 border-blue-700 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-950">
          {message}
        </div>
      ) : null}

      <div className="grid gap-7 border-b border-slate-300 pb-8 lg:grid-cols-[1fr_320px] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Billing</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">Paid plan activation</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            One flow only: choose a monthly plan, pay using official VeyraSec instructions, submit the UTR/reference, then wait for admin verification.
          </p>
        </div>
        <div className="border border-slate-300 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Current access</p>
          <p className="mt-2 text-2xl font-semibold capitalize">{currentPlan}</p>
          {currentPlanExpiresAt && currentPlan !== "free" ? (
            <p className="mt-1 text-sm text-slate-500">Active through {formatDate(currentPlanExpiresAt)}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Free access is active.</p>
          )}
        </div>
      </div>

      <div className="mt-8 grid border border-slate-300 bg-white md:grid-cols-3">
        {paidPlans.map((plan, index) => (
          <div key={plan.key} className={`p-6 ${index < paidPlans.length - 1 ? "border-b border-slate-200 md:border-b-0 md:border-r" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{plan.name}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              ₹{plan.amountInr.toLocaleString("en-IN")}
              <span className="text-sm font-normal text-slate-500">/month</span>
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{plan.monthlyScans} scans/month · {plan.websites} website{plan.websites === 1 ? "" : "s"}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 border border-amber-300 bg-amber-50 p-5">
        <p className="font-semibold text-amber-950">Before you submit a UTR</p>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-900">
          Pay only to payment details you received through the official VeyraSec billing channel. This page does not invent or display an unverified UPI ID or bank account. If you have not received official payment instructions yet, contact billing first.
        </p>
        <Link href="/contact" className="mt-4 inline-flex border border-amber-800 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100">
          Get official payment instructions
        </Link>
      </div>

      <form action={submitManualPaymentRequestAction} className="mt-8 border border-slate-300 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-lg font-semibold">Already paid? Submit the payment reference</h2>
          <p className="mt-1 text-sm text-slate-500">Monthly activation only. Submission does not activate the plan by itself.</p>
        </div>
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Plan
            <select name="planKey" defaultValue={selectedPlan} className="border border-slate-300 bg-white px-3.5 py-3 font-normal outline-none focus:border-blue-600">
              <option value="starter">Starter · ₹999/month</option>
              <option value="growth">Growth · ₹2,499/month</option>
              <option value="agency">Agency · ₹6,999/month</option>
            </select>
          </label>
          <input type="hidden" name="billingCycle" value="monthly" />
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Payment method
            <select name="paymentMethod" className="border border-slate-300 bg-white px-3.5 py-3 font-normal outline-none focus:border-blue-600">
              <option value="upi">UPI</option>
              <option value="bank-transfer">Bank transfer</option>
              <option value="manual-other">Other approved method</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            UTR / transaction reference
            <input name="paymentReference" required className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600" placeholder="Transaction reference" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Payer name
            <input name="payerName" required defaultValue={payerName} className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Payer email
            <input name="payerEmail" type="email" required defaultValue={payerEmail} className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Phone <span className="font-normal text-slate-400">optional</span>
            <input name="payerPhone" className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
            Note <span className="font-normal text-slate-400">optional</span>
            <input name="paymentNote" className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600" placeholder="Invoice context only — never OTPs, PINs or passwords" />
          </label>
        </div>
        <div className="flex flex-col justify-between gap-4 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-xs leading-5 text-slate-500">Admin independently verifies the reference before paid entitlements are activated.</p>
          <button className="bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Submit for admin review</button>
        </div>
      </form>

      <section className="mt-8 border border-slate-300 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Payment status</h2>
          {latestRequest ? <span className={`border px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(latestRequest.request_status)}`}>{latestRequest.request_status.replaceAll("_", " ")}</span> : null}
        </div>
        {payments.length ? (
          <div className="divide-y divide-slate-200">
            {payments.map((payment) => (
              <div key={payment.id} className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <p className="font-semibold">{payment.requested_plan_name} · ₹{payment.amount_inr.toLocaleString("en-IN")}</p>
                  <p className="mt-1 text-sm text-slate-500">Reference {payment.payment_reference} · {new Date(payment.created_at).toLocaleString()}</p>
                  {payment.plan_expires_at ? <p className="mt-2 text-sm text-slate-600">Access through {formatDate(payment.plan_expires_at)}</p> : null}
                  {payment.admin_review_note ? <p className="mt-2 text-sm text-slate-600">Admin note: {payment.admin_review_note}</p> : null}
                </div>
                <span className={`border px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(payment.request_status)}`}>{payment.request_status.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-sm text-slate-500">No payment request yet.</div>
        )}
      </section>
    </section>
  );
}
