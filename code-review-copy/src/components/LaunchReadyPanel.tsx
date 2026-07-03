import Link from "next/link";

type LegalAcceptance = { accepted_at: string; acceptance_status: string };
type Payment = {
  id: string;
  requested_plan_name: string;
  amount_inr: number;
  request_status: string;
  created_at: string;
};
type Authorization = {
  id: string;
  target_url: string;
  authorization_status: string;
  confirmed_at: string;
};

function badgeClass(value: string) {
  if (["accepted", "confirmed", "approved", "active", "ready"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (
    ["submitted_for_review", "pending_payment", "pending", "warning"].includes(
      value,
    )
  )
    return "bg-amber-100 text-amber-950";
  if (["rejected", "revoked", "expired", "blocked"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

function Card({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-slate-200 bg-white p-6 hover:bg-slate-50"
    >
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-3 min-h-16 text-sm leading-6 text-slate-600">
        {description}
      </p>
      <span className="mt-5 inline-block rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
        {action}
      </span>
    </Link>
  );
}

export function LaunchReadyPanel({
  legalAcceptance,
  payments,
  authorizations,
  message,
}: {
  legalAcceptance?: LegalAcceptance | null;
  payments: Payment[];
  authorizations: Authorization[];
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
        <p className="text-sm font-black text-blue-700">Mega Part 67</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Launch Ready Setup
        </h1>
        <p className="mt-4 max-w-4xl leading-8 text-blue-900">
          Clean customer experience, legal acceptance, scan authorization,
          manual payment approval and support readiness.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Legal Acceptance"
          description="Accept Terms, Privacy, Acceptable Use, Refund, Data Processing and Disclaimer."
          href="/legal-acceptance"
          action={legalAcceptance ? "Review Accepted" : "Accept Now"}
        />
        <Card
          title="Manual Billing"
          description="Choose plan, pay manually and submit UTR/reference for admin approval."
          href="/manual-billing"
          action="Open Billing"
        />
        <Card
          title="Scan Authorization"
          description="Confirm ownership or written permission before scanning a website."
          href="/scan-authorization"
          action="Confirm"
        />
        <Card
          title="Trust Center"
          description="View legal pages, security policy, responsible disclosure and support."
          href="/trust"
          action="Open Trust"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-black">Legal status</h2>
          {legalAcceptance ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(legalAcceptance.acceptance_status)}`}
              >
                {legalAcceptance.acceptance_status}
              </span>
              <p className="mt-3 text-sm font-bold text-slate-600">
                Accepted:{" "}
                {new Date(legalAcceptance.accepted_at).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="mt-5 text-slate-600">Legal acceptance pending.</p>
          )}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-black">Payment requests</h2>
          <div className="mt-5 grid gap-3">
            {payments.length ? (
              payments.map((payment) => (
                <div key={payment.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black">
                    {payment.requested_plan_name} · ₹{payment.amount_inr}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${badgeClass(payment.request_status)}`}
                  >
                    {payment.request_status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No payment requests yet.</p>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-black">Scan authorizations</h2>
          <div className="mt-5 grid gap-3">
            {authorizations.length ? (
              authorizations.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="break-all font-black">{item.target_url}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.authorization_status)}`}
                  >
                    {item.authorization_status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-600">
                No scan authorization records yet.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
        <h2 className="text-2xl font-black text-emerald-950">
          Launch customer menu
        </h2>
        <p className="mt-3 max-w-4xl leading-7 text-emerald-900">
          Customer UI should show only Dashboard, Websites, Security Scan,
          Reports, Developer Fixes, Retest Proof, Monitoring, Billing and
          Support. Internal engines stay hidden from normal customers.
        </p>
      </div>
    </section>
  );
}
