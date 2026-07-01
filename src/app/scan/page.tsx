import { Navbar } from "@/components/Navbar";

export default function ScanPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-4xl font-black">Scan website</h1>
          <p className="mt-3 text-slate-600">
            Scanner engine will be added in Part 5. For now this page is UI
            only.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <input
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="https://example.com"
            />
            <button className="rounded-full bg-slate-950 px-6 py-3 font-bold text-white">
              Scan now
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
