import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const layers = [
  {
    title: "Layer 1: Public posture",
    description:
      "HTTPS, TLS certificate, HSTS, security headers, public policy pages, robots, sitemap, and security.txt.",
  },
  {
    title: "Layer 2: Trust and compliance signals",
    description:
      "Privacy policy, terms, contact, responsible disclosure, email domain trust, and customer-readable risk summaries.",
  },
  {
    title: "Layer 3: OWASP-style mapping",
    description:
      "Findings are mapped to major web risk categories without claiming unsafe exploit validation.",
  },
  {
    title: "Layer 4: ASVS-style controls",
    description:
      "Controls are grouped by architecture, authentication, session management, communications, and configuration.",
  },
  {
    title: "Layer 5: Evidence-based reports",
    description:
      "Each result is converted into evidence records, risk statements, and recommended business actions.",
  },
];

export default function AuditFrameworkPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">
          SecureMSME AI audit framework
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black leading-tight">
          Advanced automated security audit for MSMEs
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          This SaaS is designed to replace basic manual freelance checklists
          with repeatable, evidence-based, safe public website audits.
        </p>

        <div className="mt-10 grid gap-5">
          {layers.map((layer) => (
            <div
              key={layer.title}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <h2 className="text-2xl font-black">{layer.title}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                {layer.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
          <h2 className="text-2xl font-black text-emerald-950">
            Safe by design
          </h2>
          <p className="mt-3 leading-7 text-emerald-900">
            The platform uses passive public checks only. It does not exploit,
            brute force, bypass login, or access private systems. Deeper
            authenticated testing should be added only with written
            authorization.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800"
          >
            Start audit
          </Link>
          <Link
            href="/trust"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-bold hover:bg-slate-100"
          >
            Trust center
          </Link>
        </div>
      </section>
    </main>
  );
}
