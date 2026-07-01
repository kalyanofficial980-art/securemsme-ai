import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const checks = [
  "security.txt presence",
  "robots.txt and sitemap.xml",
  "admin/login surface signals",
  "API documentation exposure",
  "debug/config path status",
  ".git/config status",
  "sensitive-path body storage blocked",
  "can/cannot claim rules",
];

export default function RealSafeTemplatesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Real safe template checks
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Real path evidence without exploit payloads
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI can run safe GET/HEAD template checks on verified
          websites. Sensitive-path response bodies are not stored.
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
          {checks.map((check) => (
            <div
              key={check}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black">{check}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                Real verified response evidence is checked with safe storage and
                clear claim controls.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Safety boundary</h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            No exploit payloads, brute force, login bypass, form submission,
            destructive testing, or private data collection. Sensitive-path
            bodies are not stored.
          </p>
        </div>
      </section>
    </main>
  );
}
