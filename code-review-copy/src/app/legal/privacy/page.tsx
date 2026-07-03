import { Navbar } from "@/components/Navbar";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-black">Privacy</h1>
        <p className="mt-5 leading-8 text-slate-600">
          SecureMSME AI stores scan records, website URLs, report evidence and
          account data needed to provide security monitoring and reports.
        </p>
      </section>
    </main>
  );
}
