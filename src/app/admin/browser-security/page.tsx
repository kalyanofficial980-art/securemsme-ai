import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminBrowserSecurityPage() {
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

  const { data: inventories } = await supabase
    .from("browser_security_inventories")
    .select(
      "id, target_url, analyzer_status, browser_security_score, page_count, finding_count, csp_finding_count, cors_finding_count, cookie_finding_count, clickjacking_finding_count, mixed_content_count, external_script_count, high_risk_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Browser security observability
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor browser security scores, CSP/CORS/cookie findings,
          clickjacking, mixed content and external script surface.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest browser security runs</h2>
          <div className="mt-6 grid gap-4">
            {inventories?.length ? (
              inventories.map((inventory) => (
                <div
                  key={inventory.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">
                        {inventory.target_url}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(inventory.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">
                      {inventory.analyzer_status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Score</p>
                      <p className="text-2xl font-black">
                        {inventory.browser_security_score}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Findings</p>
                      <p className="text-2xl font-black">
                        {inventory.finding_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">CSP</p>
                      <p className="text-2xl font-black">
                        {inventory.csp_finding_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">CORS</p>
                      <p className="text-2xl font-black">
                        {inventory.cors_finding_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Cookies</p>
                      <p className="text-2xl font-black">
                        {inventory.cookie_finding_count}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No browser security runs yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
