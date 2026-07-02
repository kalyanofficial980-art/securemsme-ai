import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { retestClientPortalBlockedClaims } from "@/lib/retest-client-portal-pro-engine";

const features = [
  "Retest Automation v2",
  "Verified Fix Proof",
  "Proof fingerprints",
  "Retest pass rate",
  "Client readiness score",
  "Shareable Client Portal Pro",
  "Executive portal summary",
  "Developer fix progress",
  "Retest proof sections",
  "Admin observability",
];

export default function RetestClientPortalProInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Retest + client sharing
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Retest + Client Portal Pro
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          Create safe retest proof, verify fixed items and generate a shareable
          client portal with executive summary, fix progress and retest proof
          sections.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Open Dashboard
          </Link>
          <Link
            href="/developer-portal"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Developer Portal
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
                Built for safe verification and client-safe reporting.
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">
            Blocked retest/client portal claims
          </h2>
          <div className="mt-5 grid gap-3">
            {retestClientPortalBlockedClaims.map((claim) => (
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
