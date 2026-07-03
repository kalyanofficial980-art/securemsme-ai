import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAuthenticatedCrawlerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login as admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin")
    redirect("/dashboard?message=Admin access required");

  const { data: runs } = await supabase
    .from("authenticated_crawler_runs")
    .select(
      "id, target_url, run_status, execution_mode, authenticated_route_count, blocked_route_count, form_count, input_count, auth_signal_count, sensitive_route_count, private_evidence_block_count, high_risk_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Authenticated crawler observability
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor authenticated route inventory, blocked routes, forms, auth
          signals and private evidence protection.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">
            Latest authenticated crawler runs
          </h2>
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
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(run.created_at).toLocaleString()} ·{" "}
                        {run.execution_mode}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">
                      {run.run_status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Routes</p>
                      <p className="text-2xl font-black">
                        {run.authenticated_route_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Blocked</p>
                      <p className="text-2xl font-black">
                        {run.blocked_route_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Forms</p>
                      <p className="text-2xl font-black">{run.form_count}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Sensitive</p>
                      <p className="text-2xl font-black">
                        {run.sensitive_route_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Private blocked</p>
                      <p className="text-2xl font-black">
                        {run.private_evidence_block_count}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">
                No authenticated crawler runs yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
