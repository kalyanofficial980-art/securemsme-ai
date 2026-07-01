import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { addWebsite } from "@/app/websites/actions";
import { createClient } from "@/lib/supabase/server";

type NewWebsitePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewWebsitePage({
  searchParams,
}: NewWebsitePageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to add website");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/websites" className="text-sm font-bold text-slate-600">
          Back to websites
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Add website</p>
          <h1 className="mt-2 text-4xl font-black">Save a website</h1>
          <p className="mt-3 text-slate-600">
            Save a public business website once, then scan it repeatedly and
            track history over time.
          </p>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <form action={addWebsite} className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">
                Website name
              </span>
              <input
                name="name"
                className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
                placeholder="My business website"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">
                Website URL
              </span>
              <input
                name="url"
                required
                className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
                placeholder="https://example.com"
              />
            </label>

            <button className="rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800">
              Save website
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
