import { Navbar } from "@/components/Navbar";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Legal</p>
        <h1 className="mt-2 text-4xl font-black">Terms of Service</h1>
        <div className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-8 leading-8 text-slate-700">
          <p>
            SecureMSME AI provides safe public security posture reports,
            vulnerability intelligence, evidence calibration, and developer fix
            guidance.
          </p>
          <p>
            Reports are based on public evidence and safe automated checks. They
            are not full penetration tests, compliance certificates, or
            guarantees that no vulnerabilities exist.
          </p>
          <p>
            Deeper scans require website ownership verification and permission
            attestation.
          </p>
        </div>
      </section>
    </main>
  );
}
