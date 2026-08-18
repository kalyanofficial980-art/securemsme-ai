import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const workflow = [
  "HTTPS and security headers",
  "Public exposure and configuration signals",
  "Prioritized security findings",
  "Developer-ready fixes",
  "Ownership verification",
  "Retest and monitoring workflow",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Website security workflow for agencies
          </p>

          <h1 className="text-5xl font-black tracking-tight md:text-6xl">
            Find website risks. Fix them. Prove the improvement.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            VeyraSec helps agencies manage client website security with safe
            public checks, prioritized findings, developer-ready fixes,
            ownership verification, and clear reports.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/websites/new"
              className="rounded-full bg-slate-950 px-6 py-3 text-center font-bold text-white hover:bg-slate-800"
            >
              Add client website
            </Link>

            <Link
              href="/scan"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center font-bold text-slate-950 hover:bg-slate-100"
            >
              Run security scan
            </Link>
          </div>

          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-500">
            Normal scans use safe public checks. Deeper workflows require
            verified ownership or explicit permission. No destructive testing.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-2xl bg-slate-950 p-6 text-white">
            <p className="text-sm font-bold text-slate-300">
              VeyraSec workflow
            </p>
            <p className="mt-3 text-3xl font-black">
              Scan → Fix → Retest
            </p>
            <p className="mt-3 leading-6 text-slate-300">
              Turn technical website signals into an actionable security
              workflow your team can use.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {workflow.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3"
              >
                <span className="text-sm font-medium">{item}</span>
                <span className="text-xs font-black text-slate-500">
                  VEYRASEC
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-6">
            <p className="text-sm font-black text-slate-500">01</p>
            <h2 className="mt-2 text-xl font-black">Add client websites</h2>
            <p className="mt-3 leading-6 text-slate-600">
              Keep customer websites and their security history organized in
              one workspace.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-50 p-6">
            <p className="text-sm font-black text-slate-500">02</p>
            <h2 className="mt-2 text-xl font-black">Scan and prioritize</h2>
            <p className="mt-3 leading-6 text-slate-600">
              Identify public security gaps and convert findings into
              developer-ready remediation steps.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-50 p-6">
            <p className="text-sm font-black text-slate-500">03</p>
            <h2 className="mt-2 text-xl font-black">Fix and retest</h2>
            <p className="mt-3 leading-6 text-slate-600">
              Apply fixes, rescan, and show clients how their security posture
              changed over time.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
