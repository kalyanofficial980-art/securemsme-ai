import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const benefits = [
  "Compare before and after security scores",
  "Detect fixed issues",
  "Detect improved issues",
  "Detect still-open issues",
  "Detect new issues after changes",
  "Create developer next actions",
  "Show customer-safe proof statements",
  "Avoid 100% secure overclaims",
];

export default function RetestProofPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Retest proof automation
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Show what improved after your developer fixed issues
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI compares older scan evidence with a new retest and
          generates a before/after proof report for business owners and
          developers.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/real-security-checks"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Real security evidence
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {benefits.map((benefit) => (
            <div
              key={benefit}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black">{benefit}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                Evidence is compared safely and explained in simple
                customer-friendly language.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h2 className="text-2xl font-black text-amber-950">
            Safe claim boundary
          </h2>
          <p className="mt-4 max-w-3xl leading-8 text-amber-900">
            Retest proof can show observed improvement, but it does not claim
            every vulnerability is fixed or that the website is 100% secure.
          </p>
        </div>
      </section>
    </main>
  );
}
