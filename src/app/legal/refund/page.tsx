import { Navbar } from "@/components/Navbar";
import { LegalDocumentPage, legalDocs } from "@/components/LegalTemplates";

export default function RefundPage() {
  const doc = legalDocs.refund;
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-14">
        <LegalDocumentPage title={doc.title}>
          <div className="divide-y divide-slate-200">
            {doc.sections.map((section, index) => (
              <section key={section} className="py-6 first:pt-0 last:pb-0">
                <h2 className="text-sm font-semibold text-slate-950">{index + 1}. Billing policy</h2>
                <p className="mt-2 leading-7">{section}</p>
              </section>
            ))}
          </div>
        </LegalDocumentPage>
      </section>
    </main>
  );
}
