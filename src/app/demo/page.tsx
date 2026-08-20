import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { PublicLandingPricingDemoPanel } from "@/components/PublicLandingPricingDemoPanel";

export const metadata: Metadata = {
  title: "Request a VeyraSec Demo",
  description:
    "Request a demo for an authorized website security review workflow. Do not submit passwords, OTPs, API tokens or payment data.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Request a VeyraSec Demo",
    description: "Demo request for an authorized website security workflow.",
    url: "/demo",
    siteName: "VeyraSec",
    type: "website",
  },
};

const paidPlans = new Set(["starter", "growth", "agency"]);

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; plan?: string }>;
}) {
  const { message, plan } = await searchParams;

  if (plan && paidPlans.has(plan)) {
    redirect(`/manual-billing?plan=${encodeURIComponent(plan)}`);
  }

  if (plan === "enterprise-review") {
    redirect("/contact");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <PublicLandingPricingDemoPanel
          mode="demo"
          message={message}
          selectedPlan="starter"
        />
      </section>
    </main>
  );
}
