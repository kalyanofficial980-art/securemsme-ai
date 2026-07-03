import { Navbar } from "@/components/Navbar";

const checklist = [
  "Supabase RLS enabled for every customer table",
  "Admin role created and limited to founder account",
  "Security headers configured in next.config.ts",
  "Legal pages added",
  "Trust center added",
  "Responsible disclosure page added",
  "Robots and sitemap added",
  "Razorpay not enabled yet",
  "Free scan limits are still development limits",
  "Production domain and NEXT_PUBLIC_SITE_URL still need final setup",
  "Email support inbox still needs final setup",
  "Automated cron monitoring still pending",
];

export default function ProductionChecklistPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">Production hardening</p>
        <h1 className="mt-2 text-4xl font-black">Launch readiness checklist</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          This page tracks what is ready and what still must be completed before
          real paid customer launch.
        </p>

        <div className="mt-10 grid gap-4">
          {checklist.map((item, index) => (
            <div
              key={item}
              className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-6"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                {index + 1}
              </span>
              <p className="font-bold">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
