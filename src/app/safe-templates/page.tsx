import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { getSafeTemplateCatalog } from "@/lib/safe-template-engine";

export default function SafeTemplatesPublicPage() {
  const templates = getSafeTemplateCatalog();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Safe Nuclei-style templates
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Template-based checks without unsafe exploit scanning
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI uses safe local templates to match public evidence,
          normalize findings, and control claims. Customers do not install
          Nuclei or any local scanner.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start scan
          </Link>
          <Link
            href="/tools"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Tool runner
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <p className="text-xs font-black uppercase text-slate-500">
                {template.category} · {template.scope}
              </p>
              <h2 className="mt-2 text-2xl font-black">{template.name}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                {template.description}
              </p>
              <p className="mt-4 text-sm font-bold text-slate-500">
                Severity: {template.severity}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
