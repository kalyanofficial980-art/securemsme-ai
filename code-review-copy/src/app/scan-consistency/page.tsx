import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "Latest scan badge",
  "Previous scan comparison",
  "Score delta explanation",
  "Risk transition tracking",
  "Engine version per explanation",
  "Why score changed section",
  "Can claim / cannot claim safety",
  "Customer-safe score explanation",
];

export default function ScanConsistencyPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Scan Consistency + Score Explanation
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Explain why security scores change between scans
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI helps customers understand scan history, current
          baseline, old-vs-new score differences, engine version and safe
          claims.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/retest-proof"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Retest proof
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
                Reduces customer confusion when old and new scan records show
                different results.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-2xl font-black text-blue-950">Trust language</h2>
          <p className="mt-4 max-w-3xl leading-8 text-blue-900">
            The score is a security posture score for one scan record. It is not
            a guarantee that every vulnerability was found or that the site is
            fully safe.
          </p>
        </div>
      </section>
    </main>
  );
}
