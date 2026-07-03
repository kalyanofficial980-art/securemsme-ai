import { Navbar } from "@/components/Navbar";

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">Security policy</p>
        <h1 className="mt-2 text-4xl font-black">
          Security and privacy posture
        </h1>

        <div className="mt-10 grid gap-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Scanning safety</h2>
            <p className="mt-3 leading-7 text-slate-600">
              SecureMSME AI performs safe public checks such as HTTPS, security
              headers, DNS email security, public policy pages, robots.txt,
              sitemap, security.txt, and common exposure indicators.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">What we do not do</h2>
            <p className="mt-3 leading-7 text-slate-600">
              We do not exploit vulnerabilities, bypass login pages, brute
              force, access private systems, or perform intrusive testing
              without written authorization.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Customer data</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Reports are stored in the customer account. Admin access is
              reserved for operational support, abuse prevention, and production
              monitoring.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
