import Link from "next/link";
import {
  submitDemoRequestAction,
  submitPricingInterestAction,
} from "@/app/demo/actions";
import { SaaSBadge, SaaSCard } from "@/components/saas/SaaSPrimitives";
import { pricingPlans } from "@/lib/public-launch-funnel-engine";
import { saasCopy, shortSafetyLine } from "@/lib/saas-copy";

function PlanCard({ plan }: { plan: (typeof pricingPlans)[number] }) {
  return (
    <SaaSCard className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black">{plan.name}</h3>
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
      <form
        action={submitPricingInterestAction}
        className="mt-auto grid gap-3 pt-6"
      >
        <input type="hidden" name="selectedPlan" value={plan.plan} />
        <select
          name="expectedUsage"
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
        >
          <option value="single-website">Single website</option>
          <option value="multiple-websites">Multiple websites</option>
          <option value="agency-clients">Agency clients</option>
          <option value="enterprise-review">Enterprise review</option>
          <option value="not-sure">Not sure</option>
        </select>
        <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          {plan.cta}
        </button>
      </form>
      <p className="mt-4 text-xs font-bold leading-5 text-slate-500">
        {plan.safetyNote}
      </p>
    </SaaSCard>
  );
}

export function PublicLandingPricingDemoPanel({
  mode = "landing",
  message,
  selectedPlan = "starter",
}: {
  mode?: "landing" | "pricing" | "demo" | "success";
  message?: string;
  selectedPlan?: string;
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      {mode === "landing" ? (
        <>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm md:p-12">
            <SaaSBadge tone="blue">{saasCopy.publicHero.eyebrow}</SaaSBadge>
            <h1 className="mt-5 max-w-5xl text-5xl font-black tracking-tight md:text-6xl">
              {saasCopy.publicHero.title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-600">
              {saasCopy.publicHero.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                Request demo
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black hover:bg-slate-100"
              >
                View pricing
              </Link>
              <Link
                href="/onboarding"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black hover:bg-slate-100"
              >
                Start onboarding
              </Link>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              [
                "Scan",
                "Run safe authorized checks on owned or approved websites.",
              ],
              ["Report", "Create client-ready reports with fix priorities."],
              [
                "Operate",
                "Manage support, leads, monitoring and beta customers.",
              ],
            ].map(([title, body]) => (
              <SaaSCard key={title} title={title} description={body} />
            ))}
          </div>
          <SaaSCard title="Launch-safe by design" description={shortSafetyLine}>
            <div className="grid gap-4 md:grid-cols-4">
              {["Authorize", "Scan", "Fix", "Monitor"].map((step, index) => (
                <div key={step} className="rounded-2xl bg-slate-50 p-5">
                  <SaaSBadge>{index + 1}</SaaSBadge>
                  <p className="mt-4 font-black">{step}</p>
                </div>
              ))}
            </div>
          </SaaSCard>
        </>
      ) : null}

      {mode === "pricing" ? (
        <>
          <SaaSCard
            title={saasCopy.pricing.title}
            description={saasCopy.pricing.description}
          />
          <div className="grid gap-6 lg:grid-cols-4">
            {pricingPlans.map((plan) => (
              <PlanCard key={plan.plan} plan={plan} />
            ))}
          </div>
        </>
      ) : null}

      {mode === "demo" ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <form
            action={submitDemoRequestAction}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <h1 className="text-4xl font-black">{saasCopy.demo.title}</h1>
            <p className="mt-4 leading-7 text-slate-600">
              {saasCopy.demo.description}
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                name="fullName"
                placeholder="Full name"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <input
                name="workEmail"
                type="email"
                placeholder="Work email"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <input
                name="companyName"
                placeholder="Company name"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <input
                name="websiteUrl"
                placeholder="Website URL"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <select
                name="primaryNeed"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="first-security-check">
                  First security check
                </option>
                <option value="client-report">Client report</option>
                <option value="developer-fixes">Developer fixes</option>
                <option value="scheduled-monitoring">Monitoring</option>
                <option value="repo-security">Repo security</option>
                <option value="cloud-config">Cloud config</option>
                <option value="agency-workflow">Agency workflow</option>
              </select>
              <select
                name="requestedPlan"
                defaultValue={selectedPlan}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="agency">Agency</option>
                <option value="enterprise-review">Enterprise review</option>
                <option value="not-sure">Not sure</option>
              </select>
              <select
                name="businessType"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="msme">MSME</option>
                <option value="startup">Startup</option>
                <option value="agency">Agency</option>
                <option value="freelancer">Freelancer</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                name="urgency"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="this-month">This month</option>
                <option value="this-week">This week</option>
                <option value="today">Today</option>
                <option value="researching">Researching</option>
              </select>
            </div>
            <textarea
              name="message"
              rows={4}
              className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Goal or context only. Do not paste secrets."
            />
            <div className="mt-5 grid gap-3">
              <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                <input name="consentToContact" type="checkbox" />
                <span>I agree to be contacted about this request.</span>
              </label>
              <label className="flex gap-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                <input name="noSensitiveDataConfirmed" type="checkbox" />
                <span>
                  I confirm I am not sending passwords, OTPs, payment data,
                  tokens or private keys.
                </span>
              </label>
            </div>
            <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Submit request
            </button>
          </form>
          <aside className="space-y-6">
            <SaaSCard title="Next steps">
              <ol className="space-y-3 text-sm font-bold leading-6 text-slate-700">
                <li>1. We review your request.</li>
                <li>2. You complete authorization.</li>
                <li>3. You run a safe first scan.</li>
                <li>4. You review report and fixes.</li>
              </ol>
            </SaaSCard>
            <SaaSCard
              title="Safety"
              description="Security workflow, not a legal compliance certificate or guarantee that all issues are found."
            />
          </aside>
        </div>
      ) : null}

      {mode === "success" ? (
        <SaaSCard>
          <h1 className="text-4xl font-black text-emerald-950">
            Demo request submitted
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            Start onboarding when you are ready to prepare the first authorized
            scan.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              Start onboarding
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black hover:bg-slate-100"
            >
              View pricing
            </Link>
          </div>
        </SaaSCard>
      ) : null}
    </section>
  );
}
