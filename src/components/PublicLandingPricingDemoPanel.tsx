import Link from "next/link";
import {
  submitDemoRequestAction,
  submitPricingInterestAction,
} from "@/app/demo/actions";
import { pricingPlans } from "@/lib/public-launch-funnel-engine";

function PlanCard({ plan }: { plan: (typeof pricingPlans)[number] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black">{plan.name}</h3>
          <p className="mt-2 text-sm font-bold text-slate-500">
            {plan.bestFor}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
          {plan.priceLabel}
        </span>
      </div>
      <p className="mt-4 min-h-14 leading-7 text-slate-600">
        {plan.description}
      </p>
      <ul className="mt-5 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="text-sm font-bold text-slate-700">
            ✅ {feature}
          </li>
        ))}
      </ul>
      <form action={submitPricingInterestAction} className="mt-6 grid gap-3">
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
        <select
          name="priceSensitivity"
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
        >
          <option value="medium">Medium budget sensitivity</option>
          <option value="high">High budget sensitivity</option>
          <option value="low">Low budget sensitivity</option>
          <option value="unknown">Unknown</option>
        </select>
        <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          {plan.cta}
        </button>
      </form>
      <p className="mt-4 text-xs font-bold leading-5 text-amber-800">
        {plan.safetyNote}
      </p>
    </div>
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
    <section className="space-y-12">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      {mode === "landing" ? (
        <>
          <div className="rounded-[2rem] border border-blue-200 bg-blue-50 p-8 md:p-12">
            <p className="text-sm font-black text-blue-700">SecureMSME AI</p>
            <h1 className="mt-4 max-w-5xl text-5xl font-black tracking-tight text-blue-950 md:text-6xl">
              AI security workflow for MSMEs, startups and agencies.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-blue-900">
              Run authorized website checks, generate client-safe reports, guide
              developer fixes, schedule monitoring, review repo risks and
              prepare cloud config before launch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900"
              >
                Request Demo
              </Link>
              <Link
                href="/pricing"
                className="rounded-full bg-white px-6 py-3 text-sm font-black text-blue-950 hover:bg-blue-100"
              >
                View Pricing
              </Link>
              <Link
                href="/onboarding"
                className="rounded-full border border-blue-900 px-6 py-3 text-sm font-black text-blue-950 hover:bg-blue-100"
              >
                Start Onboarding
              </Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              [
                "For founders",
                "Get a simple first security review without confusing technical noise.",
              ],
              [
                "For developers",
                "Turn findings into fix tasks, retest proof and safe client explanations.",
              ],
              [
                "For agencies",
                "Manage client-safe workflows across reports, monitoring and admin views.",
              ],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-3xl border border-slate-200 bg-white p-6"
              >
                <h2 className="text-xl font-black">{title}</h2>
                <p className="mt-3 leading-7 text-slate-600">{body}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-3xl font-black">Launch-safe workflow</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {[
                "Authorize website",
                "Run safe scan",
                "Review AI report",
                "Fix and monitor",
              ].map((step, index) => (
                <div key={step} className="rounded-2xl bg-slate-50 p-5">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                    Step {index + 1}
                  </span>
                  <p className="mt-4 font-black">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {mode === "pricing" ? (
        <>
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h1 className="text-4xl font-black">Pricing</h1>
            <p className="mt-4 max-w-3xl leading-7 text-slate-600">
              Manual billing during launch. No card, UPI PIN, OTP or banking
              password is collected inside the product.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            {pricingPlans.map((plan) => (
              <PlanCard key={plan.plan} plan={plan} />
            ))}
          </div>
        </>
      ) : null}

      {mode === "demo" ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <form
            action={submitDemoRequestAction}
            className="rounded-3xl border border-slate-200 bg-white p-8"
          >
            <h1 className="text-4xl font-black">Request a demo</h1>
            <p className="mt-4 leading-7 text-slate-600">
              Tell us what you need. Do not paste secrets, passwords, tokens,
              OTPs or payment data.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Full name
                <input
                  name="fullName"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Work email
                <input
                  name="workEmail"
                  type="email"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Company name
                <input
                  name="companyName"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Website URL
                <input
                  name="websiteUrl"
                  placeholder="https://example.com"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Country
                <input
                  name="country"
                  defaultValue="India"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Business type
                <select
                  name="businessType"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="msme">MSME</option>
                  <option value="startup">Startup</option>
                  <option value="agency">Agency</option>
                  <option value="freelancer">Freelancer</option>
                  <option value="ngo">NGO</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Team size
                <select
                  name="teamSize"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="1-5">1-5</option>
                  <option value="1">1</option>
                  <option value="6-20">6-20</option>
                  <option value="21-50">21-50</option>
                  <option value="51-200">51-200</option>
                  <option value="200+">200+</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Main need
                <select
                  name="primaryNeed"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="first-security-check">
                    First security check
                  </option>
                  <option value="client-report">Client report</option>
                  <option value="developer-fixes">Developer fixes</option>
                  <option value="scheduled-monitoring">
                    Scheduled monitoring
                  </option>
                  <option value="repo-security">Repo security</option>
                  <option value="cloud-config">Cloud config</option>
                  <option value="agency-workflow">Agency workflow</option>
                  <option value="not-sure">Not sure</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Requested plan
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
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Urgency
                <select
                  name="urgency"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="this-month">This month</option>
                  <option value="this-week">This week</option>
                  <option value="today">Today</option>
                  <option value="researching">Researching</option>
                </select>
              </label>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-black text-slate-700">
              Message optional
              <textarea
                name="message"
                rows={4}
                className="rounded-2xl border border-slate-300 px-4 py-3"
                placeholder="Describe goal only. Do not paste secrets."
              />
            </label>

            <div className="mt-5 grid gap-3">
              <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                <input name="consentToContact" type="checkbox" />
                <span>I agree to be contacted about this demo request.</span>
              </label>
              <label className="flex gap-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                <input name="noSensitiveDataConfirmed" type="checkbox" />
                <span>
                  I confirm I am not sending card data, OTP, UPI PIN, passwords,
                  API tokens or private keys.
                </span>
              </label>
            </div>

            <button className="mt-6 rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
              Submit Demo Request
            </button>
          </form>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black">What happens next?</h2>
              <ol className="mt-4 space-y-3 text-sm font-bold leading-6 text-slate-700">
                <li>1. We review your demo request.</li>
                <li>2. You complete onboarding and authorization.</li>
                <li>3. You run a safe first scan.</li>
                <li>4. You review report, fixes and billing options.</li>
              </ol>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-black text-amber-950">Safety note</h2>
              <p className="mt-3 text-sm font-bold leading-6 text-amber-900">
                SecureMSME AI gives security review workflows. It does not
                guarantee all vulnerabilities are found and is not a legal
                compliance certificate.
              </p>
            </div>
          </aside>
        </div>
      ) : null}

      {mode === "success" ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
          <h1 className="text-4xl font-black text-emerald-950">
            Demo request submitted ✅
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-emerald-900">
            Your demo request is saved. Next, start onboarding, confirm
            authorization and prepare your first safe scan.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="rounded-full bg-emerald-950 px-6 py-3 text-sm font-black text-white hover:bg-emerald-900"
            >
              Start Onboarding
            </Link>
            <Link
              href="/pricing"
              className="rounded-full bg-white px-6 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-100"
            >
              View Pricing
            </Link>
            <Link
              href="/manual-billing"
              className="rounded-full bg-white px-6 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-100"
            >
              Manual Billing
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
