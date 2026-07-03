import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { legalPages } from "@/components/LegalTemplates";

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <p className="text-sm font-black text-blue-700">Trust Center</p>
          <h1 className="mt-2 text-4xl font-black text-blue-950">
            SecureMSME AI Trust Center
          </h1>
          <p className="mt-4 max-w-4xl leading-8 text-blue-900">
            Security, legal, responsible disclosure, acceptable use and support
            information for safe authorized cybersecurity workflows.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {legalPages.map((page) => (
            <Link
              key={page.key}
              href={page.href}
              className="rounded-3xl border border-slate-200 bg-white p-6 hover:bg-slate-50"
            >
              <h2 className="text-xl font-black">{page.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                View current launch template.
              </p>
            </Link>
          ))}
          <Link
            href="/support"
            className="rounded-3xl border border-slate-950 bg-slate-950 p-6 text-white hover:bg-slate-800"
          >
            <h2 className="text-xl font-black">Support</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Contact support, sales, billing or security disclosure.
            </p>
          </Link>
        </div>
        <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">
            Important limitations
          </h2>
          <p className="mt-3 leading-7 text-red-900">
            SecureMSME AI does not guarantee 100% security, does not guarantee
            all vulnerabilities are found, does not provide legal compliance
            certification and must be used only with authorization.
          </p>
        </div>
      </section>
    </main>
  );
}
