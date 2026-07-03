import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function InternalEnginesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login as admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard?message=Admin access required");
  }

  const { data: scans } = await supabase
    .from("scans")
    .select("id, website_url, score, risk_level, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Internal security engines</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          This page is for technical review only. Customer-facing pages use
          simple business language, while internal pages keep tool details, job
          logs, and engine evidence.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest scans</h2>
          <div className="mt-6 grid gap-4">
            {(scans || []).map((scan) => (
              <div
                key={scan.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="break-all font-black">{scan.website_url}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Score {scan.score} · {scan.risk_level} ·{" "}
                      {new Date(scan.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/report/${scan.id}/tool-runner`}
                      className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                    >
                      Tool logs
                    </Link>
                    <Link
                      href={`/report/${scan.id}/safe-templates`}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black hover:bg-slate-100"
                    >
                      Check engine
                    </Link>
                    <Link
                      href={`/report/${scan.id}/passive-worker`}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black hover:bg-slate-100"
                    >
                      Passive review
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {scans?.length ? null : (
              <p className="text-slate-600">No scans found yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
