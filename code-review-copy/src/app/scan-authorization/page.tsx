import { redirect } from "next/navigation";
import { confirmScanAuthorizationAction } from "@/app/launch-ready/actions";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ScanAuthorizationPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect("/login?message=Please login to confirm scan authorization");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-4xl px-6 py-16">
        {message ? (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
            {message}
          </div>
        ) : null}
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <p className="text-sm font-black text-blue-700">
            Required before scanning
          </p>
          <h1 className="mt-2 text-4xl font-black text-blue-950">
            Scan Authorization
          </h1>
          <p className="mt-4 leading-8 text-blue-900">
            Confirm you own the target or have written permission before using
            SecureMSME AI.
          </p>
        </div>
        <form
          action={confirmScanAuthorizationAction}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-8"
        >
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Target website
            <input
              name="targetUrl"
              placeholder="example.com"
              className="rounded-2xl border border-slate-300 px-4 py-3"
            />
          </label>
          <label className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <input
              name="ownsOrHasPermission"
              type="checkbox"
              className="mt-1"
            />
            <span>
              I confirm I own this website or have written permission to scan
              it.
            </span>
          </label>
          <label className="mt-3 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <input name="safeChecksOnly" type="checkbox" className="mt-1" />
            <span>
              I request safe public checks only and understand this is not
              destructive testing.
            </span>
          </label>
          <label className="mt-3 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <input
              name="noUnauthorizedTesting"
              type="checkbox"
              className="mt-1"
            />
            <span>
              I will not use SecureMSME AI for unauthorized testing, brute
              force, exploitation or data extraction.
            </span>
          </label>
          <label className="mt-5 grid gap-2 text-sm font-black text-slate-700">
            Permission/evidence note optional
            <textarea
              name="evidenceNote"
              rows={4}
              className="rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Example: I own this domain / client approved scan by email."
            />
          </label>
          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Confirm Authorization
          </button>
        </form>
      </section>
    </main>
  );
}
