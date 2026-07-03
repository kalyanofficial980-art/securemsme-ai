import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { PublicLandingPricingDemoPanel } from "@/components/PublicLandingPricingDemoPanel";

export const metadata: Metadata = {
  title: "Request SecureMSME AI Demo",
  description:
    "Request a demo for an authorized website security review workflow. Do not submit passwords, OTPs, API tokens or payment data.",
  alternates: {
    canonical: "/demo",
  },
  openGraph: {
    title: "Request SecureMSME AI Demo",
    description: "Demo request for authorized AI security workflow.",
    url: "/demo",
    siteName: "SecureMSME AI",
    type: "website",
  },
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; plan?: string }>;
}) {
  const { message, plan } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <PublicLandingPricingDemoPanel
          mode="demo"
          message={message}
          selectedPlan={plan || "starter"}
        />
      </section>
    </main>
  );
}
