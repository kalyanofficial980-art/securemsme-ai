import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { PassiveAuditImportForm } from "@/components/PassiveAuditImportForm";
import { createClient } from "@/lib/supabase/server";

export default async function PassiveAuditImportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login before importing passive audits");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">
          External passive audit connector
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black leading-tight">
          Connect external passive testing reports to SecureMSME AI
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Import passive scanner JSON and convert it into SaaS-grade maturity
          score, evidence records, OWASP-style mapping, and customer-ready
          advanced report.
        </p>

        <div className="mt-10">
          <PassiveAuditImportForm />
        </div>
      </section>
    </main>
  );
}
