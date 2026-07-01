import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const boundaries = [
  "Safe public review only",
  "No form submission",
  "No login attempts",
  "No brute force",
  "No exploit payloads",
  "No destructive testing",
  "No private data access",
  "Clear can/cannot claim rules",
];

export default function PassiveWorkerPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Website review evidence
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Public website observations explained clearly
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI reviews safe public signals and converts them into
          business-friendly evidence, developer tasks, and report confidence.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/safe-templates"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Advanced checks
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <p className="text-sm font-black text-slate-500">
              Public safe mode
            </p>
            <h2 className="mt-2 text-3xl font-black">Low-limit review</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Used before ownership verification. Only limited public evidence
              is reviewed.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <p className="text-sm font-black text-slate-500">Verified mode</p>
            <h2 className="mt-2 text-3xl font-black">Deeper safe review</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Used after website ownership verification and permission
              attestation. Still safe and non-destructive.
            </p>
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Safety boundary</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {boundaries.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white/70 p-4 font-bold text-red-900"
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
