import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const modules = [
  {
    title: "HTTP security headers",
    text: "Checks real public response headers and redirect behavior.",
  },
  {
    title: "SSL/TLS certificate",
    text: "Checks certificate trust, expiry, protocol, and cipher evidence.",
  },
  {
    title: "DNS and email protection",
    text: "Checks A/AAAA, MX, SPF, and DMARC records.",
  },
  {
    title: "Controlled service discovery",
    text: "Uses low-rate TCP connection checks only on verified public scope.",
  },
];

export default function RealSecurityChecksPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Real backend security checks
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Real evidence, safe scope, no exploit payloads
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI can run real HTTP, TLS, DNS, and controlled service
          checks after website ownership verification and permission
          attestation.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/authorized-pentest"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Authorized review
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {modules.map((module) => (
            <div
              key={module.title}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black">{module.title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{module.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Safety boundary</h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            These checks do not run brute force, exploit payloads, login bypass,
            form submission, destructive testing, private data collection, or
            denial-of-service testing.
          </p>
        </div>
      </section>
    </main>
  );
}
