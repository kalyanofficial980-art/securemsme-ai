import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  AUTHENTICATED_SCAN_BLOCKED_ACTIONS,
  getAuthenticatedScanSafetyChecklist,
} from "@/lib/authenticated-scan-foundation";

const capabilities = [
  "Low-privilege test account workflow",
  "Verified website scope required",
  "Customer permission attestations",
  "Allowed and blocked path planning",
  "No password storage",
  "No destructive mutation policy",
  "Admin review before enabling",
  "Session-safe crawling foundation",
];

export default function AuthenticatedScanPublicPage() {
  const checklist = getAuthenticatedScanSafetyChecklist();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Authenticated customer scan
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Safe foundation for login-protected page review
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI prepares an authenticated scan workflow for verified
          websites using customer-provided low-privilege test accounts. This
          foundation does not store passwords or perform login crawling yet.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/ownership-verification"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Ownership verification
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {capabilities.map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black">{item}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                Built for controlled customer-authorized testing, not
                unauthorized access or destructive actions.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-2xl font-black text-blue-950">
            Test account checklist
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {checklist.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white/70 p-4 font-bold text-blue-900"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Always blocked</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {AUTHENTICATED_SCAN_BLOCKED_ACTIONS.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white/70 p-4 font-bold text-red-900"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
