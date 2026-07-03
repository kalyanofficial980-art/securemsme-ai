import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { crawlerBlockedActions } from "@/lib/advanced-crawler-asset-discovery-v2";

const capabilities = [
  "Safe same-origin crawling",
  "Sitemap discovery",
  "Robots.txt discovery",
  "Internal link graph",
  "Form inventory",
  "Login/admin surface discovery",
  "API/docs signal discovery",
  "Checkout/payment surface signals",
  "Customer-data form signals",
  "Asset fingerprints",
  "Crawler coverage score",
  "Asset risk score",
];

export default function AdvancedCrawlerInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Advanced Asset Discovery
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Advanced Crawler + Asset Discovery v2
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          Discover public website assets, forms, login/admin/API/checkout
          surfaces and customer-data signals using safe same-origin GET-only
          crawling.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Open Dashboard
          </Link>
          <Link
            href="/advanced-vulnerability-engine"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Advanced Vulnerability Engine
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <div
              key={capability}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-xl font-black">{capability}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Built for authorized defensive security review and
                evidence-backed reporting.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">
            Blocked crawler actions
          </h2>
          <div className="mt-5 grid gap-3">
            {crawlerBlockedActions.map((action) => (
              <div
                key={action}
                className="rounded-2xl bg-white/80 p-4 text-sm font-bold text-red-900"
              >
                {action}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
