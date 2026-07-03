import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminRealModulesPage() {
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

  const { data: runs } = await supabase
    .from("authorized_pentest_runs")
    .select(
      "id, target_url, intensity, status, total_modules, completed_modules, failed_modules, blocked_modules, result_summary, created_at, source_scan_id",
    )
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Real module runs</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Internal view for real HTTP/TLS/DNS/service module runs stored in the
          authorized pentest run tables.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest runs</h2>
          <div className="mt-6 grid gap-4">
            {runs?.length ? (
              runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">{run.target_url}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {run.status} · {run.intensity} · completed{" "}
                        {run.completed_modules}/{run.total_modules} · failed{" "}
                        {run.failed_modules} · blocked {run.blocked_modules}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(run.created_at).toLocaleString()}
                      </p>
                    </div>

                    {run.source_scan_id ? (
                      <Link
                        href={`/report/${run.source_scan_id}/real-modules`}
                        className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                      >
                        Open evidence
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No runs found yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
