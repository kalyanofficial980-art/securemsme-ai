import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "CSP weakness analysis",
  "CORS misconfiguration signals",
  "Cookie/session flag review",
  "Clickjacking protection review",
  "HSTS and HTTPS browser hardening",
  "Referrer-Policy and Permissions-Policy review",
  "Mixed content signal detection",
  "External script supply-chain surface review",
];

export default function BrowserSecurityAnalyzerPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Advanced Browser Security Analyzer v2
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Review browser-side security controls with safe evidence
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI analyzes CSP, CORS, cookies, clickjacking, HSTS,
          referrer controls, browser permissions, mixed content and third-party
          script surface.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/api-security-scanner"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            API security scanner
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black">{feature}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                Stored as safe browser security evidence and connected to the
                normalized evidence warehouse.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Safety boundary</h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            GET-only, no form submission, no exploit payloads, no private body
            storage, no credential/session storage, and no destructive testing.
          </p>
        </div>
      </section>
    </main>
  );
}
