import { Navbar } from "@/components/Navbar";
import { LegalIndex } from "@/components/LegalTemplates";

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <LegalIndex />
      </section>
    </main>
  );
}
