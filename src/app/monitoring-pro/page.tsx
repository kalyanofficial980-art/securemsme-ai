import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { monitoringProBlockedClaims } from "@/lib/monitoring-pro-agency-soc-engine";

const features = [
  "Monitoring Pro v2",
  "Passive regression watch",
  "Fix regression alerts",
  "Client readiness monitoring",
  "Retest proof monitoring",
  "Developer task monitoring",
  "Agency SOC dashboard",
  "Client risk watchlist",
  "Operations summary",
  "Admin observability",
];

export default function MonitoringProInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Monitoring + SOC</p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Monitoring Pro + Agency SOC
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          Watch security posture after reports, developer fixes and retests.
          Detect regressions, client readiness drops and monitoring gaps with
          passive-safe signals.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Open Dashboard
          </Link>
          <Link
            href="/agency-soc"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Agency SOC
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-xl font-black">{feature}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Built for passive-safe monitoring and internal prioritization.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">
            Blocked monitoring claims
          </h2>
          <div className="mt-5 grid gap-3">
            {monitoringProBlockedClaims.map((claim) => (
              <div
                key={claim}
                className="rounded-2xl bg-white/80 p-4 text-sm font-bold text-red-900"
              >
                {claim}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
