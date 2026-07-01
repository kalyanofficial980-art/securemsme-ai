import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { requireAdmin } from "@/lib/admin";

export default async function AdminToolRunsPage() {
  const { supabase } = await requireAdmin();

  const { data: runs } = await supabase
    .from("audit_tool_runs")
    .select(
      "id, user_id, scan_id, website_url, tool_name, tool_mode, status, evidence_count, high_count, medium_count, low_count, info_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Link href="/admin" className="text-sm font-bold text-slate-600">
          Back to admin
        </Link>

        <p className="mt-6 text-sm font-bold text-slate-500">
          External testing tools
        </p>
        <h1 className="mt-2 text-4xl font-black">Passive audit tool runs</h1>

        <div className="mt-8 grid gap-4">
          {runs?.length ? (
            runs.map((run) => (
              <div
                key={run.id}
                className="rounded-3xl border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="break-all font-black">{run.website_url}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {run.tool_name} · {run.tool_mode} · {run.status} ·{" "}
                      {new Date(run.created_at).toLocaleString()}
                    </p>
                    <p className="mt-2 font-mono text-xs text-slate-500">
                      User: {run.user_id}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-800">
                      High {run.high_count}
                    </span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                      Medium {run.medium_count}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                      Evidence {run.evidence_count}
                    </span>
                  </div>
                </div>

                {run.scan_id ? (
                  <Link
                    href={`/report/${run.scan_id}/advanced`}
                    className="mt-5 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100"
                  >
                    Advanced report
                  </Link>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
              No external tool runs yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
