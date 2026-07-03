import Link from "next/link";
import { submitSupportContactAction } from "@/app/support/actions";
import { SaaSCard } from "@/components/saas/SaaSPrimitives";
import { saasCopy } from "@/lib/saas-copy";

export function ContactSupportPanel({
  mode = "contact",
  message,
}: {
  mode?: "contact" | "success";
  message?: string;
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}
      {mode === "contact" ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <form
            action={submitSupportContactAction}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <h1 className="text-4xl font-black">{saasCopy.support.title}</h1>
            <p className="mt-4 leading-7 text-slate-600">
              {saasCopy.support.description}
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                name="fullName"
                placeholder="Full name"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <input
                name="companyName"
                placeholder="Company name"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <input
                name="websiteUrl"
                placeholder="Website URL optional"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <select
                name="topic"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="general">General</option>
                <option value="demo">Demo</option>
                <option value="pricing">Pricing</option>
                <option value="billing">Billing</option>
                <option value="technical-support">Technical support</option>
                <option value="security-report">Security report</option>
                <option value="agency">Agency</option>
                <option value="legal">Legal</option>
                <option value="abuse-report">Abuse report</option>
              </select>
              <select
                name="priority"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="normal">Normal</option>
                <option value="low">Low</option>
                <option value="high">High</option>
                <option value="urgent-review">Urgent review</option>
              </select>
            </div>
            <textarea
              name="message"
              rows={5}
              className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Describe your question. Do not paste secrets or payment data."
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
              Submit ticket
            </button>
          </form>
          <aside className="space-y-6">
            <SaaSCard
              title="Support covers"
              description="Demo, pricing, billing, reports, technical help, agency setup and legal/support questions."
            />
            <SaaSCard
              title="Safety"
              description="Do not send credentials, private keys, tokens, OTPs, card details or UPI PINs."
            />
            <SaaSCard title="Quick links">
              <div className="grid gap-3">
                <Link
                  href="/demo"
                  className="rounded-2xl bg-slate-50 p-4 text-sm font-black hover:bg-slate-100"
                >
                  Request demo
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-2xl bg-slate-50 p-4 text-sm font-black hover:bg-slate-100"
                >
                  Pricing
                </Link>
                <Link
                  href="/onboarding"
                  className="rounded-2xl bg-slate-50 p-4 text-sm font-black hover:bg-slate-100"
                >
                  Onboarding
                </Link>
              </div>
            </SaaSCard>
          </aside>
        </div>
      ) : null}
      {mode === "success" ? (
        <SaaSCard>
          <h1 className="text-4xl font-black text-emerald-950">
            Support ticket submitted
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            Your request is saved. Admin can review it and prepare a safe reply
            draft.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/public-launch"
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              Public launch
            </Link>
            <Link
              href="/demo"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black hover:bg-slate-100"
            >
              Demo
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black hover:bg-slate-100"
            >
              Pricing
            </Link>
          </div>
        </SaaSCard>
      ) : null}
    </section>
  );
}
