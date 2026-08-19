import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { legalPages } from "@/components/LegalTemplates";

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="border border-slate-300 bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Trust center</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">Security boundaries and operating policies.</h1>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            VeyraSec is built around authorized website review: safe public checks first, ownership or permission before deeper workflows, and evidence-based reporting without promising complete security.
          </p>
        </div>

        <div className="mt-8 grid border-t border-slate-300 md:grid-cols-2 lg:grid-cols-3">
          {legalPages.map((page) => (
            <Link key={page.key} href={page.href} className="border-b border-r border-slate-200 bg-white p-6 hover:bg-slate-50">
              <h2 className="text-base font-semibold">{page.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Read the current VeyraSec launch policy.</p>
            </Link>
          ))}
          <Link href="/contact" className="border-b border-r border-slate-200 bg-slate-950 p-6 text-white hover:bg-slate-900">
            <h2 className="text-base font-semibold">Support & security contact</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Billing, product support and responsible disclosure contact.</p>
          </Link>
        </div>

        <div className="mt-8 border-l-2 border-blue-700 bg-white px-6 py-5">
          <p className="text-sm font-semibold text-slate-950">Important limitation</p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            VeyraSec does not guarantee 100% security, does not guarantee every vulnerability is found, and does not provide legal compliance certification. Use the service only for targets you own, manage or are explicitly authorized to assess.
          </p>
        </div>
      </section>
    </main>
  );
}
