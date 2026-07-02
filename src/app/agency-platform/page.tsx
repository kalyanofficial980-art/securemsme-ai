import Link from "next/link";
import { Navbar } from "@/components/Navbar";
const features = [
  "Organization workspaces",
  "Team members and roles",
  "Invite foundation",
  "Team-scoped websites",
  "Team-scoped scans",
  "Agency dashboard",
  "Client workspace foundation",
  "Admin organization observability",
];
export default function AgencyPlatformPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Agency platform</p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Manage client security workspaces with team roles
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI supports organization workspaces, team roles,
          client-scoped assets and agency dashboard foundation.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/organizations"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white"
          >
            Manage organizations
          </Link>
          <Link
            href="/agency-dashboard"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black"
          >
            Agency dashboard
          </Link>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {features.map((f) => (
            <div
              key={f}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black">{f}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                This foundation moves SecureMSME AI from solo use toward agency
                and enterprise collaboration.
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h2 className="text-2xl font-black text-amber-950">
            Foundation scope
          </h2>
          <p className="mt-4 max-w-3xl leading-8 text-amber-900">
            Advanced invite email automation, billing, SSO and client portal
            come later.
          </p>
        </div>
      </section>
    </main>
  );
}
