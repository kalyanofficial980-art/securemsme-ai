import { Navbar } from "@/components/Navbar";

export default function RefundPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <article className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">Legal</p>
        <h1 className="mt-2 text-4xl font-black">Refund Policy</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: July 1, 2026
        </p>

        <div className="mt-10 space-y-8 leading-7 text-slate-700">
          <section>
            <h2 className="text-2xl font-black text-slate-950">
              Development status
            </h2>
            <p className="mt-3">
              Paid plans are not active yet. Razorpay and final paid limits will
              be added later.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">
              Future refunds
            </h2>
            <p className="mt-3">
              Once payments are enabled, refund rules should be clearly shown at
              checkout and aligned with Indian consumer protection and payment
              provider requirements.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
