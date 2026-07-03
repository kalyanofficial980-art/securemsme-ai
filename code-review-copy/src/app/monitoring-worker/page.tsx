import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "Monitoring job foundation",
  "Daily / weekly / manual cadence",
  "Latest baseline tracking",
  "Score drift detection",
  "Risk increase detection",
  "Security regression events",
  "Monitoring dashboard",
  "Worker-ready architecture",
];

export default function MonitoringWorkerPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Continuous Monitoring Worker Foundation
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Track score drift and security regressions over time
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI creates monitoring jobs, compares scan snapshots,
          detects risk regression and stores monitoring events. Automatic
          background queue/cron comes in the next layer.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/report-truth-cleanup"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Report truth cleanup
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black">{feature}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                Monitoring makes the SaaS feel like an ongoing security service,
                not just one-time report generation.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-2xl font-black text-blue-950">Current scope</h2>
          <p className="mt-4 max-w-3xl leading-8 text-blue-900">
            This part is worker-ready foundation. It compares saved scan
            snapshots manually now. Real automatic scheduled execution will be
            handled by the upcoming background queue layer.
          </p>
        </div>
      </section>
    </main>
  );
}
