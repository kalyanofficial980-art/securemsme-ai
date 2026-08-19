import Link from "next/link";
import { pricingPlans } from "@/lib/public-launch-funnel-engine";

function activationLabel(plan: string) {
  return plan === "enterprise-review" ? "Contact us" : "Request activation";
}

export function PublicPricingPlans({ message }: { message?: string }) {
  return (
    <section>
      {message ? (
        <div className="mb-6 border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="grid gap-8 border-b border-slate-200 pb-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Plans</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-[-0.045em]">
            Security review plans without hidden complexity.
          </h1>
        </div>
        <div>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Start with safe public website reviews. Paid plans increase scan capacity and workflow access. During the assisted launch, plan activation is reviewed after payment confirmation rather than forcing an unfinished automated checkout.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Free remains available for evaluation. Paid access is activated for the confirmed billing period.
          </p>
        </div>
      </div>

      <div className="mt-8 grid border-x border-t border-slate-200 lg:hidden">
        {pricingPlans.map((plan) => (
          <article key={plan.plan} className="border-b border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{plan.name}</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">{plan.priceLabel}</p>
              </div>
              {plan.plan === "growth" ? (
                <span className="border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                  Recommended
                </span>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">{plan.bestFor}</p>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Included</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden="true" className="text-slate-400">—</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={`/demo?plan=${plan.plan}`}
              className={`mt-5 inline-flex w-full items-center justify-center px-4 py-2.5 text-sm font-semibold ${
                plan.plan === "growth"
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              {activationLabel(plan.plan)}
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-8 hidden overflow-x-auto border border-slate-200 lg:block">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[1.15fr_repeat(4,1fr)] border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <div className="p-4">Plan</div>
            {pricingPlans.map((plan) => (
              <div key={plan.plan} className="border-l border-slate-200 p-4">
                {plan.name}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1.15fr_repeat(4,1fr)] border-b border-slate-200">
            <div className="p-4 text-sm font-semibold">Price</div>
            {pricingPlans.map((plan) => (
              <div key={plan.plan} className="border-l border-slate-200 p-4 text-xl font-semibold tracking-[-0.03em]">
                {plan.priceLabel}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1.15fr_repeat(4,1fr)] border-b border-slate-200">
            <div className="p-4 text-sm font-semibold">Best for</div>
            {pricingPlans.map((plan) => (
              <div key={plan.plan} className="border-l border-slate-200 p-4 text-sm text-slate-600">
                {plan.bestFor}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1.15fr_repeat(4,1fr)] border-b border-slate-200">
            <div className="p-4 text-sm font-semibold">Included</div>
            {pricingPlans.map((plan) => (
              <div key={plan.plan} className="border-l border-slate-200 p-4">
                <ul className="space-y-2 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature}>— {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1.15fr_repeat(4,1fr)]">
            <div className="p-4 text-sm font-semibold">Activation</div>
            {pricingPlans.map((plan) => (
              <div key={plan.plan} className="border-l border-slate-200 p-4">
                <Link
                  href={`/demo?plan=${plan.plan}`}
                  className={`inline-flex px-4 py-2.5 text-sm font-semibold ${
                    plan.plan === "growth"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {activationLabel(plan.plan)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 border-t border-slate-200 pt-6 md:grid-cols-3">
        <div>
          <p className="text-sm font-semibold">Assisted billing at launch</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">Payment confirmation is reviewed before access is activated.</p>
        </div>
        <div>
          <p className="text-sm font-semibold">No sensitive payment data</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">VeyraSec never asks for card PINs, OTPs, UPI PINs or banking passwords.</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Automatic billing later</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">Recurring checkout can be enabled after the payment account and KYC are production-ready.</p>
        </div>
      </div>
    </section>
  );
}
