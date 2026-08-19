import Link from "next/link";
import { submitSupportContactAction } from "@/app/support/actions";
import { saasCopy } from "@/lib/saas-copy";

export function ContactSupportPanel({ mode = "contact", message }: { mode?: "contact" | "success"; message?: string }) {
  return (
    <section>
      {message ? <div className="mb-6 border-l-2 border-blue-700 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-950">{message}</div> : null}

      {mode === "contact" ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <form action={submitSupportContactAction} className="border border-slate-300 bg-white">
            <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Support & contact</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">{saasCopy.support.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{saasCopy.support.description}</p>
            </div>

            <div className="grid gap-5 p-6 sm:p-8 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Full name<input name="fullName" required className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600" /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Email<input name="email" type="email" required className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600" /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Company<input name="companyName" className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600" /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Website <span className="font-normal text-slate-400">optional</span><input name="websiteUrl" inputMode="url" className="border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600" placeholder="https://example.com" /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Topic<select name="topic" className="border border-slate-300 bg-white px-3.5 py-3 font-normal outline-none focus:border-blue-600"><option value="general">General</option><option value="demo">Demo</option><option value="pricing">Pricing</option><option value="billing">Billing</option><option value="technical-support">Technical support</option><option value="security-report">Security report</option><option value="agency">Agency</option><option value="legal">Legal</option><option value="abuse-report">Abuse report</option></select></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Priority<select name="priority" className="border border-slate-300 bg-white px-3.5 py-3 font-normal outline-none focus:border-blue-600"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent-review">Urgent review</option></select></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">Message<textarea name="message" required rows={6} className="resize-none border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600" placeholder="Describe the issue. Do not paste credentials or payment secrets." /></label>
            </div>

            <div className="border-t border-slate-200 px-6 py-5 sm:px-8">
              <div className="grid gap-3 text-sm text-slate-700">
                <label className="flex items-start gap-3"><input name="consentToContact" type="checkbox" className="mt-1" /><span>I agree to be contacted about this request.</span></label>
                <label className="flex items-start gap-3"><input name="noSensitiveDataConfirmed" type="checkbox" className="mt-1" /><span>I confirm I am not sending passwords, OTPs, card data, UPI PINs, access tokens or private keys.</span></label>
              </div>
              <div className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
                <p className="max-w-2xl text-xs leading-5 text-slate-500">Tickets are stored in the VeyraSec support queue so billing and technical requests remain traceable.</p>
                <button className="bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Submit request</button>
              </div>
            </div>
          </form>

          <aside className="space-y-5">
            <div className="border border-slate-300 bg-white p-5"><p className="text-sm font-semibold">Support covers</p><p className="mt-2 text-sm leading-6 text-slate-600">Pricing, assisted billing, scan/report questions, technical issues, agency onboarding and legal/support requests.</p></div>
            <div className="border border-slate-300 bg-slate-950 p-5 text-white"><p className="text-sm font-semibold">Security boundary</p><p className="mt-2 text-sm leading-6 text-slate-300">Never submit credentials, OTPs, payment secrets, private keys, session cookies or access tokens.</p></div>
            <div className="border border-slate-300 bg-white">
              <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold">Quick links</div>
              <div className="divide-y divide-slate-200 text-sm"><Link href="/pricing" className="block px-5 py-3 font-medium hover:bg-slate-50">Pricing →</Link><Link href="/billing" className="block px-5 py-3 font-medium hover:bg-slate-50">Billing workspace →</Link><Link href="/legal" className="block px-5 py-3 font-medium hover:bg-slate-50">Legal & policies →</Link></div>
            </div>
          </aside>
        </div>
      ) : null}

      {mode === "success" ? (
        <div className="border border-slate-300 bg-white p-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Request received</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Support ticket submitted</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Your request is saved in the support queue for admin review. Do not send additional sensitive information in follow-up messages.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/dashboard" className="bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Dashboard</Link><Link href="/pricing" className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Pricing</Link></div>
        </div>
      ) : null}
    </section>
  );
}
