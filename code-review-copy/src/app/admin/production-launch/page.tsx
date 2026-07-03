import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["pass", "ready", "Info", "Low"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["warning", "pending", "needs-review", "Medium"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["fail", "blocked", "Critical", "High"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminProductionLaunchPage() {
  const supabase = (await createClient()) as any;

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

  const { data: benchmarks } = await supabase
    .from("accuracy_benchmark_runs_v2")
    .select(
      "id, benchmark_title, accuracy_score, benchmark_confidence_score, passed_case_count, total_case_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: snapshots } = await supabase
    .from("production_launch_snapshots_v2")
    .select(
      "id, snapshot_status, launch_readiness_score, security_hardening_score, blocked_check_count, executive_summary, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: checks } = await supabase
    .from("production_launch_checks_v2")
    .select(
      "id, check_title, check_group, check_status, severity, blocker_reason, created_at",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Production Launch Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor final benchmarks, launch readiness snapshots and production
          blockers.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Launch snapshots</h2>
          <div className="mt-6 grid gap-4">
            {snapshots?.length ? (
              snapshots.map((snapshot: any) => (
                <div
                  key={snapshot.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">
                        Launch {snapshot.launch_readiness_score}/100
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {snapshot.executive_summary}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        security {snapshot.security_hardening_score}/100 ·
                        blockers {snapshot.blocked_check_count}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(snapshot.snapshot_status)}`}
                    >
                      {snapshot.snapshot_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No launch snapshots yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Benchmarks</h2>
          <div className="mt-6 grid gap-4">
            {benchmarks?.length ? (
              benchmarks.map((benchmark: any) => (
                <div
                  key={benchmark.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="font-black">{benchmark.benchmark_title}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    accuracy {benchmark.accuracy_score}/100 · confidence{" "}
                    {benchmark.benchmark_confidence_score}/100
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    passed {benchmark.passed_case_count}/
                    {benchmark.total_case_count}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No benchmarks yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Production checks</h2>
          <div className="mt-6 grid gap-4">
            {checks?.length ? (
              checks.map((check: any) => (
                <div
                  key={check.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{check.check_title}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {check.blocker_reason || check.check_group}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(check.check_status)}`}
                      >
                        {check.check_status}
                      </span>
                      <span
                        className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(check.severity)}`}
                      >
                        {check.severity}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No launch checks yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
