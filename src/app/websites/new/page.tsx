import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import { addWebsite } from "../actions";

export default async function NewWebsitePage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login before adding website");

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Navbar />
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1fr_340px]">
        <div>
          <Link href="/websites" className="text-sm font-semibold text-blue-700">← Websites</Link>
          <div className="mt-6 border-b border-slate-200 pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">New asset</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Add a website</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Save the public URL once. Scan history, ownership state and retest evidence will stay attached to this website.</p>
          </div>

          <form action={addWebsite} className="mt-6 border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold">Website details</div>
            <div className="space-y-5 p-5 sm:p-6">
              {message ? <div className="border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900">{message}</div> : null}
              <div>
                <label htmlFor="name" className="text-sm font-semibold">Website name</label>
                <p className="mt-1 text-xs text-slate-500">A label your team will recognize.</p>
                <input id="name" name="name" placeholder="Acme marketing site" className="mt-2 w-full border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-blue-600" />
              </div>
              <div>
                <label htmlFor="url" className="text-sm font-semibold">Public website URL</label>
                <p className="mt-1 text-xs text-slate-500">Include the full https:// URL.</p>
                <input id="url" name="url" required inputMode="url" placeholder="https://example.com" className="mt-2 w-full border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-blue-600" />
              </div>
              <div className="border-t border-slate-200 pt-5">
                <button className="bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Save website</button>
              </div>
            </div>
          </form>
        </div>

        <aside className="border border-slate-200 self-start">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold">After saving</div>
          <ol className="divide-y divide-slate-200 text-sm">
            <li className="p-5"><p className="font-semibold">01 · Run a public scan</p><p className="mt-1 leading-6 text-slate-500">Create the first score and finding baseline.</p></li>
            <li className="p-5"><p className="font-semibold">02 · Verify ownership</p><p className="mt-1 leading-6 text-slate-500">Required before deeper passive review.</p></li>
            <li className="p-5"><p className="font-semibold">03 · Fix and retest</p><p className="mt-1 leading-6 text-slate-500">Compare results and document what changed.</p></li>
          </ol>
          <div className="border-t border-amber-200 bg-amber-50 p-5 text-xs leading-5 text-amber-900">Only add websites you own, manage, or are explicitly authorized to review.</div>
        </aside>
      </section>
    </main>
  );
}
