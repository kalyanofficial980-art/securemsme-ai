import { Navbar } from "@/components/Navbar";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Legal</p>
        <h1 className="mt-2 text-4xl font-black">Privacy Policy</h1>
        <div className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-8 leading-8 text-slate-700">
          <p>
            SecureMSME AI stores account details, saved websites, scan history,
            report evidence, and security posture data needed to provide the
            service.
          </p>
          <p>
            We do not claim to access private website data through public scans.
            Reports are generated from safe public evidence unless the customer
            unlocks authorized deeper scanning.
          </p>
          <p>
            Customers should only add websites they own, manage, or have
            permission to assess.
          </p>
        </div>
      </section>
    </main>
  );
}
