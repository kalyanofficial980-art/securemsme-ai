import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, plan")
    .eq("id", user.id)
    .single();

  const { data: websites } = await supabase
    .from("websites")
    .select("id, name, url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: scans } = await supabase
    .from("scans")
    .select("id, website_id, website_url, score, risk_level, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { count: totalScans } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: totalWebsites } = await supabase
    .from("websites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const averageScore =
    scans && scans.length
      ? Math.round(
          scans.reduce((total, scan) => total + Number(scan.score || 0), 0) /
            scans.length,
        )
      : 0;

  const highRiskCount =
    scans?.filter((scan) => scan.risk_level === "High").length ?? 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-bold text-slate-500">Welcome back</p>
            <h1 className="mt-2 text-4xl font-black">
              {profile?.full_name || user.email}
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Manage multiple business websites, run public safety checks, and
              track scan history.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/websites/new"
              className="rounded-full bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800"
            >
              Add website
            </Link>

            <Link
              href="/scan"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-100"
            >
              Run scan
            </Link>

            <form action={signOut}>
              <button className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-100">
                Logout
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Saved websites</p>
            <p className="mt-2 text-4xl font-black">{totalWebsites ?? 0}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Total scans</p>
            <p className="mt-2 text-4xl font-black">{totalScans ?? 0}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Recent avg score</p>
            <p className="mt-2 text-4xl font-black">{averageScore}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">High risk recent</p>
            <p className="mt-2 text-4xl font-black">{highRiskCount}</p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Your websites</h2>
              <p className="mt-2 text-slate-600">
                Save websites once and scan them again anytime.
              </p>
            </div>

            <Link
              href="/websites"
              className="text-sm font-black text-slate-700"
            >
              View all
            </Link>
          </div>

          {websites?.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {websites.map((website) => (
                <Link
                  key={website.id}
                  href={`/websites/${website.id}`}
                  className="rounded-2xl border border-slate-200 p-5 hover:bg-slate-50"
                >
                  <h3 className="font-black">{website.name || "Website"}</h3>
                  <p className="mt-2 break-all text-sm text-slate-600">
                    {website.url}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-bold">No websites saved yet.</p>
              <Link
                href="/websites/new"
                className="mt-4 inline-flex rounded-full bg-slate-950 px-5 py-3 font-bold text-white"
              >
                Add first website
              </Link>
            </div>
          )}
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent scans</h2>

          {scans?.length ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Website</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Risk</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr key={scan.id} className="border-t border-slate-200">
                      <td className="max-w-xs break-all px-4 py-3 font-bold">
                        {scan.website_url}
                      </td>
                      <td className="px-4 py-3 font-black">{scan.score}</td>
                      <td className="px-4 py-3">
                        <RiskBadge riskLevel={scan.risk_level} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/report/${scan.id}`}
                          className="font-black text-slate-950 underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-slate-600">
              No scans yet. Add a website and run your first scan.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-black text-amber-900">Development note</p>
          <p className="mt-2 text-sm text-amber-800">
            Free plan temporarily allows 20 scans while we build advanced
            features. Final free/paid limits will be added with Razorpay at the
            end.
          </p>
        </div>
      </section>
    </main>
  );
}
