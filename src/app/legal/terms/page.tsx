import { Navbar } from "@/components/Navbar";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <article className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">Legal</p>
        <h1 className="mt-2 text-4xl font-black">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: July 1, 2026
        </p>

        <div className="mt-10 space-y-8 leading-7 text-slate-700">
          <section>
            <h2 className="text-2xl font-black text-slate-950">1. Service</h2>
            <p className="mt-3">
              SecureMSME AI provides safe public website security checks and
              business-friendly reports for MSMEs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">
              2. Authorization
            </h2>
            <p className="mt-3">
              You may scan only websites you own, manage, or have permission to
              review. You are responsible for having proper authorization.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">
              3. No guarantee
            </h2>
            <p className="mt-3">
              Reports are informational and based on safe public checks only.
              They are not a full penetration test, legal audit, or compliance
              certification.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">
              4. Prohibited use
            </h2>
            <p className="mt-3">
              You may not use the service for unauthorized testing, abuse,
              harassment, brute force, exploitation, or illegal activity.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
