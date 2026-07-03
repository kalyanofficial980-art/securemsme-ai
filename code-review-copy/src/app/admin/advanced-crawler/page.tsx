import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function typeClass(type: string) {
  if (["admin", "login"].includes(type)) return "bg-red-100 text-red-950";
  if (["checkout", "payment", "api", "documentation"].includes(type))
    return "bg-amber-100 text-amber-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminAdvancedCrawlerPage() {
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
    .from("advanced_crawler_runs")
    .select(
      "id, target_url, run_status, crawler_mode, crawled_page_count, form_count, login_surface_count, admin_surface_count, api_surface_count, coverage_score, asset_risk_score, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: assets } = await supabase
    .from("discovered_assets_v2")
    .select("id, asset_url, asset_type, http_status, risk_tags, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Advanced Crawler Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor crawler runs, asset discovery, forms, login/admin/API surfaces
          and coverage.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent crawler runs</h2>
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
                        {run.crawled_page_count} pages · {run.form_count} forms
                        · login {run.login_surface_count} · admin{" "}
                        {run.admin_surface_count} · api {run.api_surface_count}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        coverage {run.coverage_score}/100 · asset risk{" "}
                        {run.asset_risk_score}/100
                      </p>
                    </div>
                    <span className="h-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                      {run.crawler_mode}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No crawler runs yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent discovered assets</h2>
          <div className="mt-6 grid gap-4">
            {assets?.length ? (
              assets.map((asset: any) => (
                <div
                  key={asset.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">{asset.asset_url}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        status {asset.http_status || "unknown"} · tags{" "}
                        {(asset.risk_tags || []).join(", ") || "none"}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${typeClass(asset.asset_type)}`}
                    >
                      {asset.asset_type}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No assets yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
