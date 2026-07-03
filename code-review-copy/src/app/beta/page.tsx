import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SecureMSME AI Beta Customer Mode",
  description:
    "Beta customer mode for SecureMSME AI launch testing and feedback.",
  alternates: { canonical: "/beta" },
};

export default function BetaPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <p className="text-sm font-black text-blue-700">Beta mode</p>
          <h1 className="mt-2 text-4xl font-black text-blue-950">
            SecureMSME AI Beta Customer Mode
          </h1>
          <p className="mt-4 max-w-3xl leading-8 text-blue-900">
            Use beta mode for first real users. Start with authorized scans
            only, collect feedback, avoid big promises and improve workflows
            before full public launch.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900"
            >
              Contact Support
            </Link>
            <Link
              href="/demo"
              className="rounded-full bg-white px-6 py-3 text-sm font-black text-blue-950 hover:bg-blue-100"
            >
              Request Demo
            </Link>
            <Link
              href="/onboarding"
              className="rounded-full border border-blue-900 px-6 py-3 text-sm font-black text-blue-950 hover:bg-blue-100"
            >
              Start Onboarding
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Safe first scan</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Only scan websites owned by the user or approved in writing.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Manual support</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Use admin support inbox and manual reply queue for early users.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Feedback loop</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Track issues, pricing questions and report clarity before full
              launch.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
