import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const trustItems = [
  "Safe public website checks only",
  "No exploit attempts",
  "No brute force, password guessing, or unauthorized access",
  "Customer reports are private to logged-in account",
  "Security report disclaimer included",
  "Admin-only monitoring dashboard protected by Supabase RLS",
];

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">Trust center</p>
        <h1 className="mt-2 text-4xl font-black">How SecureMSME AI works</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          SecureMSME AI gives MSMEs simple public website security visibility.
          It is designed for safe, non-invasive checks and business-friendly
          reporting.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {trustItems.map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <p className="font-black">{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h2 className="text-2xl font-black text-amber-950">
            Important disclaimer
          </h2>
          <p className="mt-3 leading-7 text-amber-900">
            Reports are based on safe public checks only. They are not a full
            penetration test, legal audit, compliance certification, or bug
            bounty report.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/legal/privacy"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold hover:bg-slate-100"
          >
            Privacy policy
          </Link>
          <Link
            href="/legal/terms"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold hover:bg-slate-100"
          >
            Terms
          </Link>
          <Link
            href="/legal/responsible-disclosure"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold hover:bg-slate-100"
          >
            Responsible disclosure
          </Link>
        </div>
      </section>
    </main>
  );
}
