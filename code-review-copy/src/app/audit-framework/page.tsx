import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const layers = [
  {
    title: "Layer 1: Inbuilt public posture scan",
    description:
      "HTTPS, HSTS, security headers, browser protections, mixed content, public assets, and visible form/session signals.",
  },
  {
    title: "Layer 2: Customer trust readiness",
    description:
      "Privacy, terms, contact, security process, robots, sitemap, and customer-visible trust signals.",
  },
  {
    title: "Layer 3: Evidence-based scoring",
    description:
      "Every result becomes an evidence record with customer impact and practical fix guidance.",
  },
  {
    title: "Layer 4: OWASP/ASVS-style intelligence",
    description:
      "Findings are mapped into higher-level risk and control areas for serious business reporting.",
  },
  {
    title: "Layer 5: SaaS workflow, not freelancer checklist",
    description:
      "Customer adds a website, clicks scan, and gets automated reports without Docker, JSON paste, or manual setup.",
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
          Inbuilt advanced security audit for MSMEs
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          SecureMSME AI is designed as a productized cybersecurity SaaS. The
          customer should not install external tools or paste scanner reports.
          The platform performs safe inbuilt audits and produces evidence-based
          reports automatically.
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
            Customer-side promise
          </h2>
          <p className="mt-3 leading-7 text-emerald-900">
            No Docker. No JSON paste. No external setup. No exploitation. Just
            safe inbuilt scanning, evidence, scoring, and business-friendly
            reports.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800"
          >
            Start inbuilt audit
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
