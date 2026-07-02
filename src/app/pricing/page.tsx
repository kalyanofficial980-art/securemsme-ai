import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { PublicLandingPricingDemoPanel } from "@/components/PublicLandingPricingDemoPanel";

export const metadata: Metadata = {
  title: "SecureMSME AI Pricing — Manual Billing Plans",
  description:
    "View launch pricing options for Starter, Growth, Agency and Enterprise Review. Manual billing only during launch.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "SecureMSME AI Pricing",
    description:
      "Manual billing launch plans for authorized security review workflows.",
    url: "/pricing",
    siteName: "SecureMSME AI",
    type: "website",
  },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <PublicLandingPricingDemoPanel mode="pricing" message={message} />
      </section>
    </main>
  );
}
