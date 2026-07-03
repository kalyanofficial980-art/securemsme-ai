import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["active", "completed", "passed"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["ready", "running", "needs-review"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["failed", "blocked", "revoked", "expired"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminRetestClientPortalProPage() {
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
  const { data: runs } = await supabase
    .from("retest_runs_v2")
    .select(
      "id, target_url, run_status, total_items, passed_items, failed_items, pass_rate, client_readiness_score, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const { data: links } = await supabase
    .from("client_portal_pro_links_v2")
    .select(
      "id, target_url, status, executive_score, fix_progress_score, retest_pass_rate, client_readiness_score, expires_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Retest + Client Portal Pro Admin
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor retest runs, verified-fix proof and shareable Client Portal
          Pro links.
        </p>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent retest runs</h2>
          <div className="mt-6 grid gap-4">
            {runs?.length ? (
              runs.map((run: any) => (
                <div
                  key={run.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row">
                    <div>
                      <p className="break-all font-black">{run.target_url}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        items {run.total_items} · passed {run.passed_items} ·
                        failed {run.failed_items}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        pass rate {run.pass_rate}% · readiness{" "}
                        {run.client_readiness_score}/100
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
              <p className="text-slate-600">No retest runs yet.</p>
            )}
          </div>
        </div>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Client Portal Pro links</h2>
          <div className="mt-6 grid gap-4">
            {links?.length ? (
              links.map((link: any) => (
                <div
                  key={link.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row">
                    <div>
                      <p className="break-all font-black">{link.target_url}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        executive {link.executive_score}/100 · fix{" "}
                        {link.fix_progress_score}/100 · retest{" "}
                        {link.retest_pass_rate}%
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        client readiness {link.client_readiness_score}/100
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(link.status)}`}
                    >
                      {link.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No Client Portal Pro links yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
