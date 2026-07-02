import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["approved", "completed", "validated", "pass"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["blocked", "needs-fix", "needs-review"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminAuthenticatedSafeReviewPage() {
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

  const { data: contexts } = await supabase
    .from("authenticated_review_contexts")
    .select(
      "id, target_url, test_account_label, authorization_status, credential_storage_status, review_depth, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: runs } = await supabase
    .from("authenticated_safe_review_runs")
    .select(
      "id, target_url, run_status, total_pages_reviewed, role_comparison_count, coverage_score, auth_risk_score, needs_expert_review_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Authenticated Safe Review Admin
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor test-account scope metadata, safe review runs, role comparison
          signals and expert-review needs.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent contexts</h2>
          <div className="mt-6 grid gap-4">
            {contexts?.length ? (
              contexts.map((context: any) => (
                <div
                  key={context.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">
                        {context.target_url}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {context.test_account_label || "no label"} ·{" "}
                        {context.credential_storage_status} ·{" "}
                        {context.review_depth}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(context.authorization_status)}`}
                    >
                      {context.authorization_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No contexts yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent runs</h2>
          <div className="mt-6 grid gap-4">
            {runs?.length ? (
              runs.map((run: any) => (
                <div
                  key={run.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">{run.target_url}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        pages {run.total_pages_reviewed} · roles{" "}
                        {run.role_comparison_count} · coverage{" "}
                        {run.coverage_score}/100 · risk {run.auth_risk_score}
                        /100
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        Needs expert review: {run.needs_expert_review_count}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(run.run_status)}`}
                    >
                      {run.run_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No runs yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
