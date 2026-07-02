import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "Token-based shareable report access",
  "Client-safe report snapshot",
  "No raw scanner evidence exposed",
  "Link expiry",
  "Link revoke",
  "View count tracking",
  "Access events",
  "Agency client delivery foundation",
];

export default function ClientPortalInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Client Portal</p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Share client-safe security reports without exposing internal tools
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI client portal creates safe share links for customers,
          with expiry, revoke, access events and blocked-claim guardrails.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/organizations"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Manage organizations
          </Link>
          <Link
            href="/agency-dashboard"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Agency dashboard
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
                The portal is designed for customer delivery, not internal admin
                investigation.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Blocked claims</h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            The portal must not claim 100% security, complete vulnerability
            coverage, confirmed exploitation, full pentest certification or
            compliance certification.
          </p>
        </div>
      </section>
    </main>
  );
}
