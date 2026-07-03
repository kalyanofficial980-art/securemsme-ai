import { Navbar } from "@/components/Navbar";

export default function ResponsibleDisclosurePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <article className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">Legal</p>
        <h1 className="mt-2 text-4xl font-black">Responsible Disclosure</h1>

        <div className="mt-10 space-y-8 leading-7 text-slate-700">
          <section>
            <h2 className="text-2xl font-black text-slate-950">Scope</h2>
            <p className="mt-3">
              Report security issues in SecureMSME AI itself. Do not test
              customer websites, third-party systems, or infrastructure without
              written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">
              Safe reporting
            </h2>
            <p className="mt-3">
              Do not access, change, delete, download, or expose user data. Send
              clear reproduction steps and impact details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">Contact</h2>
            <p className="mt-3">
              Security reports can be sent to the business support email once
              the production support inbox is configured.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
