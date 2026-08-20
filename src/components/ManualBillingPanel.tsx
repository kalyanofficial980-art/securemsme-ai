import Link from "next/link";
import { submitPaymentVerificationAction } from "@/app/manual-billing/actions";
import type { PaymentCheckout } from "@/lib/billing/payment-checkout";
import { launchPlans } from "@/lib/launch-ready-legal-payment-engine";

type Payment = {
  id: string;
  requested_plan_key: string;
  requested_plan_name: string;
  billing_cycle: string;
  amount_inr: number;
  payment_method: string;
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
  selectedPlan: "starter" | "growth" | "agency";
  currentPlan: string;
  currentPlanExpiresAt: string | null;
  payerName: string;
  payerEmail: string;
  checkout: PaymentCheckout | null;
};

const paidPlans = launchPlans.filter((plan) => plan.key !== "free");

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

function requestStatus(status: string) {
  if (status === "approved") {
    return {
      label: "Active",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      description: "Payment verified and paid access activated.",
    };
  }
  if (status === "rejected") {
    return {
      label: "Rejected",
      className: "border-red-200 bg-red-50 text-red-800",
      description: "Payment could not be verified. Review the admin note before retrying.",
    };
  }
  if (status === "expired") {
    return {
      label: "Expired",
      className: "border-slate-300 bg-slate-100 text-slate-700",
      description: "The previous paid period has ended. Submit a new verified payment to renew.",
    };
  }
  return {
    label: "Verification pending",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    description: "Your payment reference is waiting for VeyraSec admin verification.",
  };
}

export function ManualBillingPanel({
  payments,
  message,
  selectedPlan,
  currentPlan,
  currentPlanExpiresAt,
  payerName,
  payerEmail,
  checkout,
}: Props) {
  const selected = paidPlans.find((plan) => plan.key === selectedPlan) || paidPlans[0];
  const latestRequest = payments[0] || null;
  const latestState = latestRequest ? requestStatus(latestRequest.request_status) : null;
  const pending =
    latestRequest?.request_status === "submitted_for_review" ||
    latestRequest?.request_status === "pending_payment";
  const paymentReady = checkout?.configured === true;
  const availableMethods = [
    checkout?.upiEnabled ? "upi" : null,
    checkout?.bankEnabled ? "bank-transfer" : null,
  ].filter(Boolean) as string[];

  return (
    <section>
      {message ? (
        <div className="mb-6 border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-950">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 border-b border-slate-300 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            Subscription
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
            Choose a plan. Pay once. Verify securely.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Monthly assisted billing for the paid launch. The QR and bank instructions come from VeyraSec admin settings, while plan access activates only after the transaction reference is verified.
          </p>
        </div>
        <div className="min-w-[230px] border border-slate-300 bg-white px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            Current plan
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <p className="text-2xl font-semibold capitalize">{currentPlan}</p>
            {currentPlan !== "free" && currentPlanExpiresAt ? (
              <p className="text-xs text-slate-500">through {formatDate(currentPlanExpiresAt)}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {paidPlans.map((plan) => {
          const selectedCard = plan.key === selectedPlan;
          const recommended = plan.key === "growth";
          return (
            <Link
              key={plan.key}
              href={`/manual-billing?plan=${plan.key}`}
              className={`relative border bg-white p-5 transition hover:border-slate-500 ${
                selectedCard ? "border-blue-700 ring-1 ring-blue-700" : "border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
                    ₹{plan.amountInr.toLocaleString("en-IN")}
                    <span className="ml-1 text-sm font-normal text-slate-500">/month</span>
                  </p>
                </div>
                {recommended ? (
                  <span className="border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800">
                    Recommended
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {plan.monthlyScans} scans · {plan.websites} website{plan.websites === 1 ? "" : "s"}
              </p>
              <p className="mt-2 text-xs text-slate-500">{plan.bestFor}</p>
              <div className={`mt-5 text-sm font-semibold ${selectedCard ? "text-blue-700" : "text-slate-700"}`}>
                {selectedCard ? "Selected" : `Choose ${plan.name}`}
              </div>
            </Link>
          );
        })}
      </div>

      {latestRequest ? (
        <section className="mt-8 border border-slate-300 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold">Latest payment</p>
                <span className={`border px-2.5 py-1 text-xs font-semibold ${latestState?.className}`}>
                  {latestState?.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{latestState?.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                {latestRequest.requested_plan_name} · ₹{Number(latestRequest.amount_inr).toLocaleString("en-IN")} · Reference {latestRequest.payment_reference}
              </p>
              {latestRequest.admin_review_note ? (
                <p className="mt-2 text-sm text-slate-700">
                  Admin note: {latestRequest.admin_review_note}
                </p>
              ) : null}
            </div>
            <p className="text-xs text-slate-400">
              Submitted {new Date(latestRequest.created_at).toLocaleString()}
            </p>
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              Step 1
            </p>
            <h2 className="mt-1 text-xl font-semibold">Pay ₹{selected.amountInr.toLocaleString("en-IN")}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {selected.name} · one month · amount is fixed by the server-side plan definition.
            </p>
          </div>

          {paymentReady ? (
            <div className="grid gap-6 p-6 md:grid-cols-2">
              {checkout?.upiEnabled && checkout.qrSvg && checkout.upiId ? (
                <div>
                  <p className="text-sm font-semibold">UPI</p>
                  <div className="mt-4 inline-flex border border-slate-200 bg-white p-3">
                    <div
                      className="h-64 w-64 max-w-full [&_svg]:h-full [&_svg]:w-full"
                      aria-label={`UPI QR for ${selected.name}`}
                      dangerouslySetInnerHTML={{ __html: checkout.qrSvg }}
                    />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Payee
                  </p>
                  <p className="mt-1 text-sm font-semibold">{checkout.payeeName || "VeyraSec"}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    UPI ID
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold">{checkout.upiId}</p>
                  {checkout.upiUri ? (
                    <a
                      href={checkout.upiUri}
                      className="mt-4 inline-flex bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      Open UPI app
                    </a>
                  ) : null}
                </div>
              ) : null}

              {checkout?.bankEnabled ? (
                <div className="border-t border-slate-200 pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                  <p className="text-sm font-semibold">Bank transfer</p>
                  <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-200 text-sm">
                    <div className="grid grid-cols-[120px_1fr] gap-3 py-3">
                      <dt className="text-slate-500">Account name</dt>
                      <dd className="font-semibold">{checkout.bankAccountName}</dd>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-3 py-3">
                      <dt className="text-slate-500">Bank</dt>
                      <dd className="font-semibold">{checkout.bankName}</dd>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-3 py-3">
                      <dt className="text-slate-500">Account</dt>
                      <dd className="break-all font-semibold">{checkout.bankAccountNumber}</dd>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-3 py-3">
                      <dt className="text-slate-500">IFSC</dt>
                      <dd className="font-semibold">{checkout.bankIfsc}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-6">
              <div className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Payments are temporarily unavailable because the VeyraSec admin has not enabled an official UPI or bank destination yet.
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs leading-5 text-slate-500">
            Never enter an OTP, UPI PIN, card PIN, bank password, private key or session cookie in VeyraSec.
          </div>
        </section>

        <section className="border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              Step 2
            </p>
            <h2 className="mt-1 text-xl font-semibold">Submit transaction reference</h2>
            <p className="mt-1 text-sm text-slate-500">
              Payment does not activate access automatically. Admin verification is mandatory.
            </p>
          </div>

          {pending ? (
            <div className="p-6">
              <div className="border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-950">Verification already pending</p>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  Wait for the current payment reference to be reviewed before submitting another request.
                </p>
              </div>
            </div>
          ) : paymentReady && availableMethods.length ? (
            <form action={submitPaymentVerificationAction}>
              <input type="hidden" name="planKey" value={selectedPlan} />
              <div className="grid gap-5 p-6">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Payment method
                  {availableMethods.length === 1 ? (
                    <>
                      <input type="hidden" name="paymentMethod" value={availableMethods[0]} />
                      <div className="border border-slate-300 bg-slate-50 px-3.5 py-3 font-normal capitalize">
                        {availableMethods[0].replaceAll("-", " ")}
                      </div>
                    </>
                  ) : (
                    <select
                      name="paymentMethod"
                      className="border border-slate-300 bg-white px-3.5 py-3 font-normal outline-none focus:border-blue-600"
                    >
                      {checkout?.upiEnabled ? <option value="upi">UPI</option> : null}
                      {checkout?.bankEnabled ? (
                        <option value="bank-transfer">Bank transfer</option>
                      ) : null}
                    </select>
                  )}
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  UTR / transaction reference
                  <input
                    name="paymentReference"
                    required
                    minLength={4}
                    maxLength={120}
                    className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600"
                    placeholder="Enter the reference shown by your payment app or bank"
                    autoComplete="off"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Payer name
                  <input
                    name="payerName"
                    required
                    defaultValue={payerName}
                    className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Payer email
                  <input
                    name="payerEmail"
                    type="email"
                    required
                    defaultValue={payerEmail}
                    className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Phone <span className="font-normal text-slate-400">optional</span>
                  <input
                    name="payerPhone"
                    className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Note <span className="font-normal text-slate-400">optional</span>
                  <input
                    name="paymentNote"
                    maxLength={300}
                    className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600"
                    placeholder="Invoice context only"
                  />
                </label>
              </div>

              <div className="border-t border-slate-200 px-6 py-5">
                <button className="w-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
                  Submit payment for verification
                </button>
                <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                  VeyraSec verifies the payment before server-side paid entitlements change.
                </p>
              </div>
            </form>
          ) : (
            <div className="p-6 text-sm leading-6 text-slate-500">
              Payment verification submission will become available after the admin enables an official payment method.
            </div>
          )}
        </section>
      </div>

      <section className="mt-8 border border-slate-300 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Payment history</h2>
        </div>
        {payments.length ? (
          <div className="divide-y divide-slate-200">
            {payments.map((payment) => {
              const state = requestStatus(payment.request_status);
              return (
                <div key={payment.id} className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_auto] md:items-start">
                  <div>
                    <p className="font-semibold">
                      {payment.requested_plan_name} · ₹{Number(payment.amount_inr).toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {payment.payment_method.replaceAll("-", " ")} · Reference {payment.payment_reference} · {new Date(payment.created_at).toLocaleString()}
                    </p>
                    {payment.plan_expires_at ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Access through {formatDate(payment.plan_expires_at)}
                      </p>
                    ) : null}
                    {payment.admin_review_note ? (
                      <p className="mt-2 text-sm text-slate-600">Admin note: {payment.admin_review_note}</p>
                    ) : null}
                  </div>
                  <span className={`border px-2.5 py-1 text-xs font-semibold ${state.className}`}>
                    {state.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-10 text-sm text-slate-500">No payment history yet.</div>
        )}
      </section>
    </section>
  );
}
