import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "Low-privilege route access signal review",
  "Optional dual-role metadata comparison",
  "Admin and privileged-route boundary signals",
  "Object identifier risk signals",
  "Sensitive account/order/user route review",
  "Allowed-path and blocked-path enforcement",
  "No IDOR exploitation or private body storage",
  "Evidence warehouse and vulnerability lifecycle output",
];

export default function AccessControlSignalEnginePublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Broken Access Control Signal Engine
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Detect access-control risk signals without unsafe exploitation
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI reviews low-privilege access metadata, privileged-route
          expectations, object identifier signals and optional dual-role
          differences without storing private response bodies.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/authenticated-crawler"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Authenticated safe crawler
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
                Access-control evidence is stored as safe metadata and linked to
                normalized evidence and vulnerability lifecycle records.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Safety boundary</h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            Approved request required, GET-only, allowed paths only, no IDOR
            exploitation, no form submission, no session storage, no private
            body storage and no destructive testing.
          </p>
        </div>
      </section>
    </main>
  );
}
