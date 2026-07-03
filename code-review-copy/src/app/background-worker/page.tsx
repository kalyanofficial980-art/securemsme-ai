import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "Due job picker",
  "Batch processor",
  "Job locking",
  "Retry scheduling",
  "Failure tracking",
  "Cron API trigger",
  "Admin queue dashboard",
  "Monitoring worker execution",
];

export default function BackgroundWorkerPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Background Job Queue + Cron Worker
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Process due security monitoring jobs in controlled batches
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI can pick due monitoring jobs, lock them, process safe
          monitoring evaluations, retry failures and track worker events.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/monitoring-worker"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Monitoring worker
          </Link>
          <Link
            href="/scan"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Start website check
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
                This is the backend automation layer required before paid
                continuous monitoring can become real.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-2xl font-black text-blue-950">Cron API</h2>
          <p className="mt-4 max-w-3xl leading-8 text-blue-900">
            Future cron systems can call POST /api/cron/worker with the
            CRON_WORKER_SECRET. In local development, use the admin queue page
            to enqueue and run batches manually.
          </p>
        </div>
      </section>
    </main>
  );
}
