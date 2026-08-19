import Link from "next/link";
import { redirect } from "next/navigation";
import { MonitoringBadge } from "@/components/MonitoringBadge";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/monitoring";

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
    .select(
      "id, name, url, created_at, monitoring_enabled, scan_frequency, last_scan_at, next_scan_at, latest_score, latest_risk_level, latest_scan_id",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: scans } = await supabase
    .from("scans")
    .select("id, website_url, score, risk_level, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const { count: totalScans } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: totalWebsites } = await supabase
    .from("websites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const latestScans = scans ?? [];
  const savedWebsites = websites ?? [];

  const averageScore = latestScans.length
    ? Math.round(
        latestScans.reduce(
          (total, scan) => total + Number(scan.score || 0),
          0,
        ) / latestScans.length,
      )
    : 0;

  const highRiskCount = latestScans.filter(
    (scan) => scan.risk_level === "High",
  ).length;

  const dueWebsites = savedWebsites.filter((website) => {
    if (!website.monitoring_enabled || !website.next_scan_at) return false;
    return new Date(website.next_scan_at).getTime() <= Date.now();
  });

  const activeMonitoringCount = savedWebsites.filter(
    (website) => website.monitoring_enabled,
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-bold text-slate-500">
              Monitoring dashboard
            </p>
            <h1 className="mt-2 text-4xl font-black">
              {profile?.full_name || user.email}
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Track websites, monitoring status, latest risk, and scan history.
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
              className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold hover:bg-slate-100"
            >
              Run scan
            </Link>
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
            <p className="text-sm text-slate-500">Due rescans</p>
            <p className="mt-2 text-4xl font-black">{dueWebsites.length}</p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Monitoring overview</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Active monitoring</p>
              <p className="mt-2 text-3xl font-black">
                {activeMonitoringCount}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">High risk recent</p>
              <p className="mt-2 text-3xl font-black">{highRiskCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Plan</p>
              <p className="mt-2 text-3xl font-black capitalize">
                {profile?.plan || "free"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Website monitoring</h2>
              <p className="mt-2 text-slate-600">
                Latest score, risk, frequency, and next scan date.
              </p>
            </div>
            <Link href="/websites" className="text-sm font-black">
              View all
            </Link>
          </div>

          {savedWebsites.length ? (
            <div className="mt-6 grid gap-4">
              {savedWebsites.map((website) => (
                <div
                  key={website.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <h3 className="font-black">
                        {website.name || "Website"}
                      </h3>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        {website.url}
                      </p>
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        Frequency: {website.scan_frequency || "weekly"} · Next:{" "}
                        {formatDate(website.next_scan_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <MonitoringBadge
                        monitoringEnabled={website.monitoring_enabled}
                        lastScanAt={website.last_scan_at}
                        nextScanAt={website.next_scan_at}
                      />
                      {website.latest_risk_level ? (
                        <RiskBadge riskLevel={website.latest_risk_level} />
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">
                      Score {website.latest_score ?? "--"}
                    </span>
                    <Link
                      href={`/websites/${website.id}`}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100"
                    >
                      Open
                    </Link>
                    <Link
                      href={`/scan?websiteId=${website.id}`}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100"
                    >
                      Scan
                    </Link>
                    {website.latest_scan_id ? (
                      <Link
                        href={`/report/${website.latest_scan_id}`}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100"
                      >
                        Report
                      </Link>
                    ) : null}
                  </div>
                </div>
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
          <h2 className="text-2xl font-black">Recent scan timeline</h2>

          {latestScans.length ? (
            <div className="mt-6 space-y-4">
              {latestScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-5 md:flex-row md:items-center"
                >
                  <div>
                    <p className="break-all font-black">{scan.website_url}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(scan.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">
                      Score {scan.score}
                    </span>
                    <RiskBadge riskLevel={scan.risk_level} />
                    <Link
                      href={`/report/${scan.id}`}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100"
                    >
                      View report
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-slate-600">No scans yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
