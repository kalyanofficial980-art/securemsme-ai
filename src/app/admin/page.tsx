import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { requireAdmin } from "@/lib/admin";

export default async function AdminPage() {
  const { supabase, profile } = await requireAdmin();

  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const { count: totalWebsites } = await supabase
    .from("websites")
    .select("id", { count: "exact", head: true });

  const { count: totalScans } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true });

  const { count: highRiskScans } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("risk_level", "High");

  const { data: latestScans } = await supabase
    .from("scans")
    .select("id, website_url, score, risk_level, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: latestUsers } = await supabase
    .from("profiles")
    .select("id, full_name, plan, role, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-300 pb-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Admin control room</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">VeyraSec operations</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Signed in as {profile.full_name || "Admin"}. Review users, assets, scans, risk and launch operations from one workspace.
            </p>
          </div>
          <Link href="/production-checklist" className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Production checklist
          </Link>
        </div>

        <section className="grid border-x border-b border-slate-300 bg-white sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Users", totalUsers ?? 0, "Customer accounts"],
            ["Websites", totalWebsites ?? 0, "Tracked assets"],
            ["Scans", totalScans ?? 0, "Stored review records"],
            ["High-risk scans", highRiskScans ?? 0, "Needs operator attention"],
          ].map(([label, value, helper], index) => (
            <div key={String(label)} className={`p-5 ${index < 3 ? "xl:border-r xl:border-slate-200" : ""} ${index % 2 === 0 ? "sm:border-r sm:border-slate-200 xl:border-r" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-semibold tracking-[-0.04em] ${label === "High-risk scans" && Number(value) > 0 ? "text-red-700" : "text-slate-950"}`}>{value}</p>
              <p className="mt-1 text-xs text-slate-500">{helper}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 border border-slate-300 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold">Operations</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Users", "/admin/users", "Accounts, plans and roles"],
              ["Websites", "/admin/websites", "Assets and ownership state"],
              ["Scans", "/admin/scans", "Review records and risk"],
              ["Audit", "/admin/audit", "Administrative event history"],
            ].map(([label, href, helper], index) => (
              <Link key={href} href={href} className={`p-5 hover:bg-slate-50 ${index < 3 ? "border-b border-slate-200 lg:border-b-0 lg:border-r" : ""} ${index === 0 ? "sm:border-r sm:border-slate-200" : ""}`}>
                <p className="font-semibold text-slate-950">{label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <section>
            <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-3">
              <div>
                <h2 className="text-lg font-semibold">Latest scans</h2>
                <p className="mt-1 text-sm text-slate-500">Most recent customer security reviews.</p>
              </div>
              <Link href="/admin/scans" className="text-sm font-semibold text-blue-700">View all →</Link>
            </div>

            {latestScans?.length ? (
              <div className="divide-y divide-slate-200 border-x border-b border-slate-300 bg-white">
                {latestScans.map((scan) => (
                  <div key={scan.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-semibold">{scan.website_url}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(scan.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold">Score {scan.score}</span>
                      <RiskBadge riskLevel={scan.risk_level} />
                      <Link href={`/report/${scan.id}`} className="text-xs font-semibold text-blue-700">Report →</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-slate-300 bg-white p-6 text-sm text-slate-500">No scans yet.</div>
            )}
          </section>

          <section>
            <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-3">
              <div>
                <h2 className="text-lg font-semibold">Latest users</h2>
                <p className="mt-1 text-sm text-slate-500">Recently created customer accounts.</p>
              </div>
              <Link href="/admin/users" className="text-sm font-semibold text-blue-700">View all →</Link>
            </div>

            {latestUsers?.length ? (
              <div className="divide-y divide-slate-200 border-x border-b border-slate-300 bg-white">
                {latestUsers.map((user) => (
                  <div key={user.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{user.full_name || "User"}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{user.id}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold capitalize">{user.plan || "free"}</span>
                        <span className="border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold capitalize">{user.role || "user"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-slate-300 bg-white p-6 text-sm text-slate-500">No users yet.</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
