import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const rules = [
  "Technology detected does not automatically mean vulnerable.",
  "Exact version is needed before making CVE-specific claims.",
  "No version means no CVE certainty.",
  "Developers should confirm versions from source code, hosting panels, or vendor dashboards.",
  "Upgrade recommendations should be given without claiming exploitation.",
  "Retest after upgrades to create before/after proof.",
];

export default function KnownRisksPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Known technology risks
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          CVE-aware guidance without scary overclaims
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI reviews detected website technologies and gives safe
          developer upgrade guidance. It does not claim a specific CVE applies
          unless exact versions and affected ranges are validated.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/tools"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Advanced checks
          </Link>
        </div>

        <div className="mt-12 rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h2 className="text-2xl font-black text-amber-950">
            Safe CVE certainty rules
          </h2>
          <div className="mt-5 grid gap-3">
            {rules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl bg-white/70 p-4 font-bold text-amber-900"
              >
                {rule}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">What customers get</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              "Detected technology list",
              "Version visibility status",
              "Safe known-risk explanation",
              "Developer upgrade recommendation",
              "Can claim / cannot claim rules",
              "Retest guidance after upgrades",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
