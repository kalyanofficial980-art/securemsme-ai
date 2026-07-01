import { Navbar } from "@/components/Navbar";
import { PricingCard } from "@/components/PricingCard";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-black tracking-tight">Simple pricing</h1>
          <p className="mt-4 text-lg text-slate-600">
            Start free. Upgrade when you need full reports and saved scan
            history.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <PricingCard
            name="Free"
            price="₹0"
            description="For testing one website."
            features={[
              "1 website scan",
              "Basic score",
              "Limited fixes",
              "No saved history",
            ]}
          />

          <PricingCard
            name="Starter"
            price="₹499"
            description="For small business owners."
            highlighted
            features={[
              "Full website report",
              "Security checklist",
              "Privacy checklist",
              "Saved scan history",
            ]}
          />

          <PricingCard
            name="Business"
            price="₹999"
            description="For clinics, schools, and agencies."
            features={[
              "Multiple website scans",
              "Full report history",
              "Monthly monitoring",
              "Priority support",
            ]}
          />
        </div>
      </section>
    </main>
  );
}
