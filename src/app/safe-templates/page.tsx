import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const checkGroups = [
  "Security headers",
  "Email domain protection",
  "Public admin/login surface",
  "Technology exposure",
  "Trust pages and security contact",
  "Evidence confidence and safe claims",
];

export default function SafeTemplatesPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Advanced website checks
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Extra checks that support your security report
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI uses safe internal check rules to match public website
          evidence and show what can be confidently reported.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/passive-worker"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Website review evidence
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {checkGroups.map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black">{item}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                Safe public evidence is reviewed and converted into simple
                customer and developer guidance.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">
            What we do not do
          </h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            We do not run brute force, exploit payloads, login bypass,
            destructive tests, or private data access. Deeper checks require
            ownership verification and permission.
          </p>
        </div>
      </section>
    </main>
  );
}
