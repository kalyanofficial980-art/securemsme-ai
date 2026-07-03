import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "OpenAPI/Swagger document discovery",
  "REST endpoint inventory",
  "API method classification",
  "Auth requirement signal review",
  "Sensitive API path detection",
  "API Top 10 mapping",
  "Mutation method inventory without execution",
  "Normalized evidence output",
];

export default function ApiSecurityScannerPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          API Discovery + OpenAPI Security Scanner
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Discover and prioritize API security surfaces safely
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI reviews OpenAPI/Swagger/GraphQL signals, inventories API
          endpoints, maps API Top 10 risks, and blocks destructive API actions.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/attack-surface-discovery"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Attack surface discovery
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
                API evidence is stored as safe metadata and connected to the
                normalized evidence warehouse.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Safety boundary</h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            No API POST/PUT/PATCH/DELETE execution, no authentication bypass, no
            destructive API calls, no private response body storage, and no
            credential/session storage.
          </p>
        </div>
      </section>
    </main>
  );
}
