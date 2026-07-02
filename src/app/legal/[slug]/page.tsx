import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { LegalDocumentPage, legalDocs } from "@/components/LegalTemplates";

export default async function LegalSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = legalDocs[slug];
  if (!doc) notFound();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <LegalDocumentPage title={doc.title}>
          {doc.sections.map((section, index) => (
            <section key={section} className="rounded-2xl bg-slate-50 p-5">
              <h2 className="text-lg font-black">Section {index + 1}</h2>
              <p className="mt-2 leading-7">{section}</p>
            </section>
          ))}
        </LegalDocumentPage>
      </section>
    </main>
  );
}
