import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import { addWebsite } from "../actions";

export default async function NewWebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login before adding website");
  }

  return (
    <main className="min-h-screen text-slate-950">
      <Navbar />

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:py-14 lg:grid-cols-[1fr_0.72fr] lg:items-start">
        <form
          action={addWebsite}
          className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9"
        >
          <Link href="/websites" className="text-sm font-black text-sky-700 hover:text-sky-900">
            ← Back to websites
          </Link>

          <div className="mt-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
            +
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-sky-700">Add website</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Create a website workspace</h1>
          <p className="mt-3 max-w-xl leading-7 text-slate-600">
            Save the public URL once. Scans, reports, ownership verification, and retests will stay attached to this website.
          </p>

          {message ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
              {message}
            </div>
          ) : null}

          <div className="mt-8 grid gap-6">
            <div>
              <label htmlFor="name" className="text-sm font-black text-slate-800">Website name</label>
              <p className="mt-1 text-sm text-slate-500">A friendly label for your workspace.</p>
              <input
                id="name"
                name="name"
                placeholder="Acme marketing site"
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label htmlFor="url" className="text-sm font-black text-slate-800">Public website URL</label>
              <p className="mt-1 text-sm text-slate-500">Use the real public homepage, including https://.</p>
              <input
                id="url"
                name="url"
                required
                inputMode="url"
                placeholder="https://example.com"
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>

          <button className="mt-8 w-full rounded-full bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/10 hover:-translate-y-0.5 hover:bg-slate-800">
            Save website and continue
          </button>
        </form>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl shadow-slate-950/10">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-300">After you save it</p>
            <ol className="mt-5 space-y-5">
              {[
                ["1", "Run a safe public scan", "Get the first score and prioritized findings."],
                ["2", "Verify ownership", "Use DNS, HTML file, or meta tag proof when deeper review is needed."],
                ["3", "Fix and retest", "Compare the before-and-after result instead of creating disconnected reports."],
              ].map(([step, title, body]) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white">{step}</span>
                  <div>
                    <p className="font-black">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-black text-amber-950">Authorization matters</p>
            <p className="mt-2 text-sm leading-6 text-amber-900/80">
              Only add websites you own, manage, or are explicitly authorized to review. Deeper passive checks stay locked until ownership or permission is confirmed.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
