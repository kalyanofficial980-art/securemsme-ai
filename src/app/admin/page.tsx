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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div>
          <p className="text-sm font-bold text-slate-500">Admin control room</p>
          <h1 className="mt-2 text-4xl font-black">SecureMSME AI Admin</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Logged in as {profile.full_name || "Admin"}. Monitor users,
            websites, scans, risks, and production readiness.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Users</p>
            <p className="mt-2 text-4xl font-black">{totalUsers ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Websites</p>
            <p className="mt-2 text-4xl font-black">{totalWebsites ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Scans</p>
            <p className="mt-2 text-4xl font-black">{totalScans ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">High risk scans</p>
            <p className="mt-2 text-4xl font-black text-red-950">
              {highRiskScans ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          <Link
            href="/admin/users"
            className="rounded-3xl border border-slate-200 bg-white p-6 font-black hover:bg-slate-100"
          >
            Users
          </Link>
          <Link
            href="/admin/websites"
            className="rounded-3xl border border-slate-200 bg-white p-6 font-black hover:bg-slate-100"
          >
            Websites
          </Link>
          <Link
            href="/admin/scans"
            className="rounded-3xl border border-slate-200 bg-white p-6 font-black hover:bg-slate-100"
          >
            Scans
          </Link>
          <Link
            href="/production-checklist"
            className="rounded-3xl border border-slate-200 bg-white p-6 font-black hover:bg-slate-100"
          >
            Production checklist
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Latest scans</h2>
            <div className="mt-6 space-y-4">
              {latestScans?.length ? (
                latestScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <p className="break-all font-black">{scan.website_url}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(scan.created_at).toLocaleString()}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">
                        Score {scan.score}
                      </span>
                      <RiskBadge riskLevel={scan.risk_level} />
                      <Link
                        href={`/report/${scan.id}`}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100"
                      >
                        Report
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No scans yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Latest users</h2>
            <div className="mt-6 space-y-4">
              {latestUsers?.length ? (
                latestUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <p className="font-black">{user.full_name || "User"}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {user.id}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize">
                        {user.plan || "free"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize">
                        {user.role || "user"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No users yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
