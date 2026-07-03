import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "Same-origin route discovery",
  "JavaScript/SPA route extraction",
  "API endpoint signal discovery",
  "Form and input inventory",
  "URL parameter inventory",
  "Script and third-party surface visibility",
  "Blocked route policy",
  "Normalized evidence output",
];

export default function AttackSurfaceDiscoveryPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Advanced crawler + attack surface discovery
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Discover the website surface before deeper vulnerability testing
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          The discovery engine maps routes, JavaScript routes, API signals,
          forms, inputs, parameters, and scripts using a safe verified-scope
          crawler.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/international-security-engine"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Security engine core
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
                Stored as safe metadata and connected to the normalized evidence
                warehouse.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Safety boundary</h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            GET/HEAD only, same-origin only, no form submission, no
            POST/PUT/PATCH/DELETE, no login attempt, no private body storage,
            and no destructive testing.
          </p>
        </div>
      </section>
    </main>
  );
}
