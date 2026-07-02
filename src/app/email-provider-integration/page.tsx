import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  "Resend HTTP API integration",
  "Environment-only API key storage",
  "Test email verification",
  "Security alert email rendering",
  "Provider message ID tracking",
  "Failed delivery error tracking",
  "Email provider event log",
  "Cron-ready processing route",
];

export default function EmailProviderIntegrationPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Real Email Provider Integration
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Send real monitoring alerts with provider-backed email delivery
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI connects security alerts to Resend with delivery
          tracking, provider message IDs and safe alert wording.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/alerts-notifications"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Alerts foundation
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
                Email provider integration turns monitoring into a real ongoing
                customer notification service.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-2xl font-black text-blue-950">
            Required environment
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-white p-5 text-sm font-bold text-blue-900">
            {`EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
ALERT_FROM_EMAIL=alerts@yourdomain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com`}
          </pre>
        </div>

        <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Safety wording</h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            Email alerts must not claim exploitation, compromise, full pentest
            coverage, compliance certification or that every vulnerability was
            found.
          </p>
        </div>
      </section>
    </main>
  );
}
