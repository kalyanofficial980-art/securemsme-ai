import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const pillars = [
  "Universal scan job orchestration",
  "Module pipeline and stage planning",
  "Normalized security evidence warehouse",
  "Vulnerability lifecycle tracking",
  "OWASP WSTG / ASVS / API Top 10 / NIST SSDF mapping",
  "Coverage matrix and blocked-module transparency",
  "Future worker, queue, retry and monitoring ready architecture",
  "Safe authorization-first execution model",
];

export default function InternationalSecurityEnginePublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          International security engine core
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Advanced backend foundation for international-standard security SaaS
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI is evolving from a report generator into an advanced
          security engine with job orchestration, module pipeline, normalized
          evidence, lifecycle tracking, and standards-aware coverage.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/authenticated-scan"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Authenticated scan foundation
          </Link>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {pillars.map((pillar) => (
            <div
              key={pillar}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black">{pillar}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                Built as a real SaaS engine layer, not just a display page.
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Safety boundary</h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            Advanced does not mean unsafe. Unauthorized scanning, brute force,
            password guessing, login bypass, private data extraction,
            destructive testing, payment/order mutation, and out-of-scope
            testing remain blocked.
          </p>
        </div>
      </section>
    </main>
  );
}
