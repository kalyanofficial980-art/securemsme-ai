import { Navbar } from "@/components/Navbar";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto flex max-w-md flex-col px-6 py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black">Login</h1>
          <p className="mt-2 text-slate-600">
            Supabase login will be added in Part 4.
          </p>

          <div className="mt-8 space-y-4">
            <input
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Email address"
            />
            <button className="w-full rounded-full bg-slate-950 px-4 py-3 font-bold text-white">
              Continue
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
