import { Navbar } from "@/components/Navbar";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-black">Dashboard</h1>
        <p className="mt-3 text-slate-600">
          Auth-protected scan history dashboard will be added in later parts.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Total scans</p>
            <p className="mt-2 text-4xl font-black">0</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Average score</p>
            <p className="mt-2 text-4xl font-black">--</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Plan</p>
            <p className="mt-2 text-4xl font-black">Free</p>
          </div>
        </div>
      </section>
    </main>
  );
}
