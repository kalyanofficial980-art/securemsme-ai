import Link from "next/link";
import { pricingPlans } from "@/lib/public-launch-funnel-engine";

export function PublicPricingPlans({ message }: { message?: string }) {
  return (
    <section>
      {message ? (
        <div className="mb-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="grid gap-8 border-b border-slate-300 pb-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            Pricing
          </p>
          <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Straightforward plans for real security review work.
          </h1>
        </div>
        <div>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Three monthly plans. Choose a plan, pay the exact amount by the official VeyraSec UPI or bank destination, submit the transaction reference, and access activates only after verification.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Free access remains available for evaluation. No Enterprise tier is offered during the current launch.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {pricingPlans.map((plan) => {
          const recommended = plan.plan === "growth";
          return (
            <article
              key={plan.plan}
              className={`flex min-h-[520px] flex-col border bg-white p-6 sm:p-7 ${
                recommended ? "border-blue-700 ring-1 ring-blue-700" : "border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{plan.name}</p>
                  <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
                    {plan.priceLabel.replace("/month", "")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">per month</p>
                </div>
                {recommended ? (
                  <span className="border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                    Recommended
                  </span>
                ) : null}
              </div>

              <p className="mt-6 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Best for
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">{plan.bestFor}</p>

              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Included
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span aria-hidden="true" className="font-semibold text-blue-700">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-8">
                <Link
                  href={`/manual-billing?plan=${plan.plan}`}
                  className={`inline-flex w-full items-center justify-center px-4 py-3 text-sm font-semibold ${
                    recommended
                      ? "bg-blue-700 text-white hover:bg-blue-800"
                      : "bg-slate-950 text-white hover:bg-slate-800"
                  }`}
                >
                  {plan.cta}
                </Link>
                <p className="mt-3 text-xs leading-5 text-slate-500">{plan.safetyNote}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-8 grid border border-slate-300 bg-white md:grid-cols-3">
        <div className="border-b border-slate-200 p-5 md:border-b-0 md:border-r">
          <p className="text-sm font-semibold">Exact plan-price QR</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            UPI QR is generated from the selected plan amount and the admin-configured official payee.
          </p>
        </div>
        <div className="border-b border-slate-200 p-5 md:border-b-0 md:border-r">
          <p className="text-sm font-semibold">Admin verification required</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            A payment or UTR never activates access by itself. VeyraSec verifies it first.
          </p>
        </div>
        <div className="p-5">
          <p className="text-sm font-semibold">No payment secrets</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Never provide OTPs, UPI PINs, card PINs, banking passwords or login credentials.
          </p>
        </div>
      </div>
    </section>
  );
}
