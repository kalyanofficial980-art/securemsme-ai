import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  accuracyOperatingRules,
  findingTaxonomyRules,
} from "@/lib/advanced-finding-taxonomy";

export default function AccuracyFoundationInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Advanced Security Platform
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Advanced Finding Taxonomy + 99% Accuracy Foundation
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI uses taxonomy, evidence requirements, confidence
          scoring, false-positive risk and manual validation to make
          client-ready findings more accurate.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Open Dashboard
          </Link>
          <Link
            href="/vulnerability-scanner"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Vulnerability Scanner
          </Link>
        </div>

        <div className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-2xl font-black text-blue-950">
            Correct 99% target
          </h2>
          <p className="mt-4 max-w-3xl leading-8 text-blue-900">
            The professional target is 99% correctness for findings marked
            Confirmed. It is not a claim that the platform finds every possible
            vulnerability.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {findingTaxonomyRules.map((rule) => (
            <div
              key={rule.taxonomyKey}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <p className="text-xs font-black uppercase text-slate-500">
                {rule.riskDomain}
              </p>
              <h2 className="mt-2 text-xl font-black">{rule.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {rule.category} · minimum evidence: {rule.minimumEvidenceCount}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Accuracy operating rules</h2>
          <div className="mt-5 grid gap-3">
            {accuracyOperatingRules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700"
              >
                {rule}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
