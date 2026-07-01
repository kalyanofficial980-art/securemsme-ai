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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/websites" className="text-sm font-bold text-slate-600">
          Back to websites
        </Link>

        <form
          action={addWebsite}
          className="mt-10 rounded-3xl border border-slate-200 bg-white p-8"
        >
          <p className="text-sm font-black text-slate-500">Add website</p>
          <h1 className="mt-2 text-4xl font-black">Save a website</h1>
          <p className="mt-3 text-slate-600">
            Save a public business website once, then scan it repeatedly and
            track history over time.
          </p>

          {message ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
              {message}
            </div>
          ) : null}

          <label className="mt-8 block text-sm font-black text-slate-700">
            Website name
          </label>
          <input
            name="name"
            placeholder="My business website"
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
          />

          <label className="mt-6 block text-sm font-black text-slate-700">
            Website URL
          </label>
          <input
            name="url"
            required
            placeholder="https://example.com"
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
          />

          <button className="mt-8 w-full rounded-full bg-slate-950 px-6 py-4 font-black text-white hover:bg-slate-800">
            Save website
          </button>
        </form>
      </section>
    </main>
  );
}
