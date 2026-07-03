import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { SeoReadinessPanel } from "@/components/SeoReadinessPanel";
import {
  buildJsonLd,
  summarizeSeoReadiness,
} from "@/lib/seo-launch-analytics-engine";

export const metadata: Metadata = {
  title: "SecureMSME AI SEO Readiness",
  description:
    "Public SEO readiness and launch safety summary for SecureMSME AI.",
  alternates: {
    canonical: "/seo-readiness",
  },
};

export default function SeoReadinessPage() {
  const readiness = summarizeSeoReadiness();
  const jsonLd = buildJsonLd();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-slate-500">
              Public launch SEO
            </p>
            <h1 className="mt-2 text-4xl font-black">SEO Readiness</h1>
            <p className="mt-4 max-w-3xl leading-7 text-slate-600">
              Sitemap, robots, public metadata and launch-safe SEO copy review.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sitemap.xml"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              Sitemap
            </Link>
            <Link
              href="/robots.txt"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Robots
            </Link>
          </div>
        </div>

        <SeoReadinessPanel readiness={readiness} />
      </section>
    </main>
  );
}
