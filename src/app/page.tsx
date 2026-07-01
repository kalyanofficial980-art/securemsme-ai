import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const checks = [
  "HTTPS / SSL status",
  "Security headers",
  "Privacy policy page",
  "Terms page",
  "Contact page",
  "Basic admin exposure check",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            AI website safety reports for Indian small businesses
          </p>

          <h1 className="text-5xl font-black tracking-tight md:text-6xl">
            Check your business website safety in minutes.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            SecureMSME AI helps small businesses check HTTPS, basic security
            settings, privacy pages, and simple DPDP readiness with a clear
            score and action report.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/scan"
              className="rounded-full bg-slate-950 px-6 py-3 text-center font-bold text-white hover:bg-slate-800"
            >
              Start free scan
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center font-bold text-slate-950 hover:bg-slate-100"
            >
              View pricing
            </Link>
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Safe public checks only. No exploit testing. Use only with
            permission.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-2xl bg-slate-950 p-6 text-white">
            <p className="text-sm text-slate-300">Sample score</p>
            <div className="mt-3 text-6xl font-black">72</div>
            <p className="mt-2 text-slate-300">Medium risk</p>
          </div>

          <div className="mt-6 space-y-3">
            {checks.map((check) => (
              <div
                key={check}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <span className="text-sm font-medium">{check}</span>
                <span className="text-sm font-bold text-slate-700">Check</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-6">
            <h2 className="text-xl font-bold">For clinics</h2>
            <p className="mt-2 text-slate-600">
              Check website privacy basics and patient enquiry form safety.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-6">
            <h2 className="text-xl font-bold">For schools</h2>
            <p className="mt-2 text-slate-600">
              Improve student/parent data handling and website trust.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-6">
            <h2 className="text-xl font-bold">For local businesses</h2>
            <p className="mt-2 text-slate-600">
              Get a simple action report before your customers lose trust.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
