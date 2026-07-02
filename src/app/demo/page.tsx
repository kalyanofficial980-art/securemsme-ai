import { Navbar } from "@/components/Navbar";
import { PublicLandingPricingDemoPanel } from "@/components/PublicLandingPricingDemoPanel";

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
