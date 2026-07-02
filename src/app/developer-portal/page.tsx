import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { developerPortalBlockedClaims } from "@/lib/developer-portal-v2-engine";

const features = [
  "Developer fix portal",
  "Fix task board",
  "Task status workflow",
  "Evidence-linked tasks",
  "Safe developer comments",
  "Retest request workflow",
  "Developer readiness score",
  "Fix progress score",
  "Client-safe remediation notes",
  "Admin collaboration observability",
];

export default function DeveloperPortalInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Fix collaboration</p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Developer Portal + Fix Collaboration v2
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          Turn security findings into developer-friendly tasks, track
          remediation, collect safe comments and request retests without
          exposing secrets or exploit payloads.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Open Dashboard
          </Link>
          <Link
            href="/client-report-v4"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Client Report v4
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
                Built for defensive remediation and safe developer
                collaboration.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">
            Blocked developer content
          </h2>
          <div className="mt-5 grid gap-3">
            {developerPortalBlockedClaims.map((claim) => (
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
