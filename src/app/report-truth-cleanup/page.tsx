import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "Generic report text detection",
  "Repeated fix warning",
  "Missing evidence warning",
  "Evidence-specific developer fixes",
  "Validation steps for each issue",
  "Safe customer wording",
  "Cannot-claim guardrails",
  "Truth score for report trust",
];

export default function ReportTruthCleanupPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Report Truth Cleanup
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Replace fake-looking report text with evidence-specific fixes
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI detects generic report wording and creates cleaner,
          safer, evidence-specific explanations that developers and customers
          can trust.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/scan-consistency"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Score explanation
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
                Every issue should explain evidence, impact, exact fix,
                validation and safe claims.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">No fake claims</h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            The cleanup engine does not invent vulnerabilities. It rewrites old
            generic wording into safer, clearer, evidence-specific wording and
            marks weak evidence as needs-review.
          </p>
        </div>
      </section>
    </main>
  );
}
