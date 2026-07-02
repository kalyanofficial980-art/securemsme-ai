import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "Queue table for background jobs",
  "Due job picker",
  "Job locking",
  "Attempt history",
  "Retry/failure tracking",
  "Worker events",
  "Manual development execution",
  "Cron-ready architecture",
];

export default function BackgroundWorkerPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Background Job Queue + Worker Scheduler
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Queue and process monitoring jobs safely
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI uses queue-ready architecture for monitoring jobs,
          retries, locking, attempts and worker events. Manual execution works
          now; automatic cron trigger comes next.
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
                This makes monitoring scalable and prepares the SaaS for
                scheduled background execution.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-2xl font-black text-blue-950">Current scope</h2>
          <p className="mt-4 max-w-3xl leading-8 text-blue-900">
            This layer executes due queue jobs manually in development. Do not
            call it full autonomous monitoring until cron/API trigger is added.
          </p>
        </div>
      </section>
    </main>
  );
}
