import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptLegalDocumentsAction } from "@/app/launch-ready/actions";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function LegalAcceptancePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to accept legal terms");

  const docs = [
    ["terms", "Terms and Conditions", "/legal/terms"],
    ["privacy", "Privacy Policy", "/legal/privacy"],
    ["acceptableUse", "Acceptable Use Policy", "/legal/acceptable-use"],
    ["refund", "Refund Policy", "/legal/refund"],
    ["dataProcessing", "Data Processing Notice", "/legal/data-processing"],
    ["disclaimer", "Disclaimer", "/legal/disclaimer"],
  ];

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
            Required before launch use
          </p>
          <h1 className="mt-2 text-4xl font-black text-blue-950">
            Legal Acceptance
          </h1>
          <p className="mt-4 leading-8 text-blue-900">
            Accept required documents before using paid/manual billing and scan
            workflows.
          </p>
        </div>
        <form
          action={acceptLegalDocumentsAction}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-8"
        >
          <div className="grid gap-4">
            {docs.map(([name, label, href]) => (
              <label
                key={name}
                className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700"
              >
                <input name={name} type="checkbox" className="mt-1" />
                <span>
                  I agree to the{" "}
                  <Link href={href} className="text-blue-700 underline">
                    {label}
                  </Link>
                  .
                </span>
              </label>
            ))}
          </div>
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
            You must not use SecureMSME AI for unauthorized testing, brute
            force, exploitation or data extraction.
          </div>
          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Accept Required Legal Documents
          </button>
        </form>
      </section>
    </main>
  );
}
