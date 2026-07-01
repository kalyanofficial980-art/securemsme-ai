import { Navbar } from "@/components/Navbar";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <article className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">Legal</p>
        <h1 className="mt-2 text-4xl font-black">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: July 1, 2026
        </p>

        <div className="mt-10 space-y-8 leading-7 text-slate-700">
          <section>
            <h2 className="text-2xl font-black text-slate-950">
              Information we collect
            </h2>
            <p className="mt-3">
              We store account information, saved website URLs, scan results,
              generated reports, and payment records when payments are added.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">
              How we use data
            </h2>
            <p className="mt-3">
              We use data to provide reports, show dashboard history, improve
              the product, prevent abuse, and support customers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">Security</h2>
            <p className="mt-3">
              We use account-based access control and Supabase row level
              security. Admin access is limited to operational needs.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
