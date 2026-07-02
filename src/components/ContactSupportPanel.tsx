import Link from "next/link";
import { submitSupportContactAction } from "@/app/support/actions";

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
        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <form
            action={submitSupportContactAction}
            className="rounded-3xl border border-slate-200 bg-white p-8"
          >
            <p className="text-sm font-black text-blue-700">Mega Part 75</p>
            <h1 className="mt-2 text-4xl font-black">
              Contact SecureMSME AI Support
            </h1>
            <p className="mt-4 leading-7 text-slate-600">
              Send a support request, demo question, billing question or
              technical issue. Do not paste secrets or payment data.
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
                Email
                <input
                  name="email"
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
                Website URL optional
                <input
                  name="websiteUrl"
                  placeholder="https://example.com"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Topic
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
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Priority
                <select
                  name="priority"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                  <option value="high">High</option>
                  <option value="urgent-review">Urgent review</option>
                </select>
              </label>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-black text-slate-700">
              Message
              <textarea
                name="message"
                rows={5}
                className="rounded-2xl border border-slate-300 px-4 py-3"
                placeholder="Describe your issue only. Do not paste secrets, OTPs, private keys or payment data."
              />
            </label>

            <div className="mt-5 grid gap-3">
              <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                <input name="consentToContact" type="checkbox" />
                <span>I agree to be contacted about this support request.</span>
              </label>
              <label className="flex gap-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                <input name="noSensitiveDataConfirmed" type="checkbox" />
                <span>
                  I confirm I am not sending passwords, OTPs, UPI PINs, card
                  data, API tokens, private keys or other secrets.
                </span>
              </label>
            </div>
            <button className="mt-6 rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
              Submit Support Request
            </button>
          </form>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black">Support topics</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Demo",
                  "Pricing",
                  "Billing",
                  "Technical",
                  "Security Report",
                  "Agency",
                  "Legal",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-black text-amber-950">Safety note</h2>
              <p className="mt-3 text-sm font-bold leading-6 text-amber-900">
                Do not send credentials, private keys, tokens, OTPs, card
                details or UPI PINs.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black">Quick links</h2>
              <div className="mt-4 grid gap-3">
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
            </div>
          </aside>
        </div>
      ) : null}

      {mode === "success" ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
          <h1 className="text-4xl font-black text-emerald-950">
            Support ticket submitted ✅
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-emerald-900">
            Your support request is saved. The team can review it from the admin
            support inbox and prepare a safe reply draft.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/public-launch"
              className="rounded-full bg-emerald-950 px-6 py-3 text-sm font-black text-white hover:bg-emerald-900"
            >
              Public Launch
            </Link>
            <Link
              href="/demo"
              className="rounded-full bg-white px-6 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-100"
            >
              Demo
            </Link>
            <Link
              href="/pricing"
              className="rounded-full bg-white px-6 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-100"
            >
              Pricing
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
