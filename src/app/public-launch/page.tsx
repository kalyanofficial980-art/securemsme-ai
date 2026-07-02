import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { PublicLandingPricingDemoPanel } from "@/components/PublicLandingPricingDemoPanel";
import { buildJsonLd } from "@/lib/seo-launch-analytics-engine";

export const metadata: Metadata = {
  title: "SecureMSME AI — AI Security Workflow for MSMEs",
  description:
    "AI-assisted security workflow for authorized website checks, client-safe reports, developer fixes, repo review, cloud config and scheduled monitoring.",
  alternates: {
    canonical: "/public-launch",
  },
  openGraph: {
    title: "SecureMSME AI — AI Security Workflow for MSMEs",
    description:
      "Authorized website checks, client-safe reports, developer fixes, repo review, cloud config and scheduled monitoring.",
    url: "/public-launch",
    siteName: "SecureMSME AI",
    type: "website",
  },
};

export default function PublicLaunchPage() {
  const jsonLd = buildJsonLd();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <PublicLandingPricingDemoPanel mode="landing" />
      </section>
    </main>
  );
}
