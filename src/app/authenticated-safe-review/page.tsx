import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { authenticatedReviewBlockedActions } from "@/lib/authenticated-safe-review-v2";

const features = [
  "Test-account scope metadata",
  "No password storage",
  "Authenticated page observation inventory",
  "Session/cookie checklist",
  "Role access comparison workflow",
  "Customer-data page signals",
  "Account-action page signals",
  "Developer fix guidance",
  "Client-safe summaries",
  "Admin observability",
];

export default function AuthenticatedSafeReviewInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Authorized Account-Area Security Review
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Authenticated Safe Review v2
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          Review login-protected account areas with approved test-account scope,
          safe manual observations, role comparisons and client-ready developer
          guidance.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Open Dashboard
          </Link>
          <Link
            href="/advanced-crawler"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Advanced Crawler
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
                Designed for authorized defensive review only.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Blocked actions</h2>
          <div className="mt-5 grid gap-3">
            {authenticatedReviewBlockedActions.map((action) => (
              <div
                key={action}
                className="rounded-2xl bg-white/80 p-4 text-sm font-bold text-red-900"
              >
                {action}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
