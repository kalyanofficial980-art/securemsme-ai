import Link from "next/link";
import { RazorpaySubscribeButton } from "@/components/RazorpaySubscribeButton";
import { SaaSBadge, SaaSCard } from "@/components/saas/SaaSPrimitives";
import { pricingPlans } from "@/lib/public-launch-funnel-engine";
import { saasCopy } from "@/lib/saas-copy";

type SelfServePlan = "starter" | "growth" | "agency";

function isSelfServePlan(plan: string): plan is SelfServePlan {
  return plan === "starter" || plan === "growth" || plan === "agency";
}

export function PublicPricingPlans({ message }: { message?: string }) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <SaaSCard
        title={saasCopy.pricing.title}
        description={saasCopy.pricing.description}
      >
        <p className="mt-4 text-sm font-bold leading-6 text-slate-600">
          Cancel through the supported billing workflow. Access follows the paid
          billing period and payment status. The Free plan remains available for
          light evaluation.
        </p>
      </SaaSCard>

      <div className="grid gap-6 lg:grid-cols-4">
        {pricingPlans.map((plan) => (
          <SaaSCard key={plan.plan} className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">{plan.name}</h2>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {plan.bestFor}
                </p>
              </div>
              <SaaSBadge tone="blue">{plan.priceLabel}</SaaSBadge>
            </div>

            <p className="mt-4 leading-7 text-slate-600">{plan.description}</p>

            <ul className="mt-5 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="text-sm font-bold text-slate-700">
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              {isSelfServePlan(plan.plan) ? (
                <RazorpaySubscribeButton plan={plan.plan} label={plan.cta} />
              ) : (
                <Link
                  href="/demo?plan=enterprise-review"
                  className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                >
                  {plan.cta}
                </Link>
              )}
            </div>

            <p className="mt-4 text-xs font-bold leading-5 text-slate-500">
              {plan.safetyNote}
            </p>
          </SaaSCard>
        ))}
      </div>
    </section>
  );
}
