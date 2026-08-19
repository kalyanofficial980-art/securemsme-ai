import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { PublicPricingPlans } from "@/components/PublicPricingPlans";

export const metadata: Metadata = {
  title: "VeyraSec Pricing — Monthly Security Plans",
  description:
    "Monthly VeyraSec plans for authorized website security scans, reports, ownership-verified deep passive review and retests.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "VeyraSec Pricing",
    description:
      "Monthly launch plans for authorized website security review workflows.",
    url: "/pricing",
    siteName: "VeyraSec",
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
        <PublicPricingPlans message={message} />
      </section>
    </main>
  );
}
