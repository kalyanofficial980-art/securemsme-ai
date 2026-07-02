import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "In-app security alerts",
  "Email-ready notification queue",
  "Severity threshold rules",
  "Monitoring-event based alerts",
  "Delivery attempts tracking",
  "Development simulated delivery",
  "Provider-ready architecture",
  "Customer-safe alert wording",
];

export default function AlertsNotificationsPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Alerts + Email Notification Foundation
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Send security alerts from monitoring events
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI converts monitoring events into in-app alerts and
          email-ready notification records. Real email provider integration
          comes next.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/monitoring-worker"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Monitoring worker
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
                Alerts make monitoring actionable for customers and admins.
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-2xl font-black text-blue-950">Current scope</h2>
          <p className="mt-4 max-w-3xl leading-8 text-blue-900">
            This foundation stores alerts and simulates delivery in development.
            Production email sending needs a provider key and hardened delivery
            route.
          </p>
        </div>
      </section>
    </main>
  );
}
