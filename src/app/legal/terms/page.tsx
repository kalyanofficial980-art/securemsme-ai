import { Navbar } from "@/components/Navbar";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-black">Terms</h1>
        <p className="mt-5 leading-8 text-slate-600">
          SecureMSME AI provides evidence-based website security posture
          reports. Reports are not a guarantee that every vulnerability was
          found, not a full pentest certificate, and not a compliance
          certification.
        </p>
      </section>
    </main>
  );
}
