import { submitSupportRequestAction } from "@/app/launch-ready/actions";
import { Navbar } from "@/components/Navbar";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-4xl px-6 py-16">
        {message ? (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
            {message}
          </div>
        ) : null}
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <p className="text-sm font-black text-blue-700">Support</p>
          <h1 className="mt-2 text-4xl font-black text-blue-950">
            Contact SecureMSME AI
          </h1>
          <p className="mt-4 leading-8 text-blue-900">
            Send support, billing, sales, legal or responsible disclosure
            requests.
          </p>
        </div>
        <form
          action={submitSupportRequestAction}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-8"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-black text-slate-700">
              Request type
              <select
                name="requestType"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              >
                <option value="support">Support</option>
                <option value="billing">Billing</option>
                <option value="security-disclosure">Security disclosure</option>
                <option value="legal">Legal</option>
                <option value="sales">Sales</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-700">
              Priority
              <select
                name="priority"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              >
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Low">Low</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">
              Contact email
              <input
                name="contactEmail"
                type="email"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">
              Subject
              <input
                name="subject"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">
              Message
              <textarea
                name="message"
                rows={7}
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>
          </div>
          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Submit Request
          </button>
        </form>
      </section>
    </main>
  );
}
