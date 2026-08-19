import Link from "next/link";
import { redirect } from "next/navigation";
import { MonitoringBadge } from "@/components/MonitoringBadge";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/monitoring";

type DashboardPageProps = {
  searchParams?: Promise<{ message?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const message = params?.message;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to view dashboard");

  const { data: profile } = await supabase.from("profiles").select("full_name, plan").eq("id", user.id).single();
  const { data: websites } = await supabase.from("websites").select("id, name, url, created_at, monitoring_enabled, scan_frequency, last_scan_at, next_scan_at, latest_score, latest_risk_level, latest_scan_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8);
  const { data: scans } = await supabase.from("scans").select("id, website_url, score, risk_level, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12);
  const { count: totalScans } = await supabase.from("scans").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  const { count: totalWebsites } = await supabase.from("websites").select("id", { count: "exact", head: true }).eq("user_id", user.id);

  const latestScans = scans ?? [];
  const savedWebsites = websites ?? [];
  const averageScore = latestScans.length ? Math.round(latestScans.reduce((total, scan) => total + Number(scan.score || 0), 0) / latestScans.length) : 0;
  const highRiskCount = latestScans.filter((scan) => scan.risk_level === "High").length;
  const activeMonitoringCount = savedWebsites.filter((website) => website.monitoring_enabled).length;
  const displayName = profile?.full_name || user.email?.split("@")[0] || "Workspace";
  const plan = profile?.plan || "free";

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-300 pb-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Security operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{displayName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Monitor website posture, review findings, and track remediation evidence.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/scan" className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Run scan</Link>
            <Link href="/websites/new" className="bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Add website</Link>
          </div>
        </div>

        {message ? (
          <div className="mt-6 border-l-2 border-blue-700 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-950">
            {message}
          </div>
        ) : null}

        <div className="grid border-x border-b border-slate-300 bg-white sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Websites", totalWebsites ?? 0, "Tracked assets"],
            ["Scans", totalScans ?? 0, "Reports generated"],
            ["Average score", averageScore || "—", latestScans.length ? "Recent scans" : "No scans yet"],
            ["Monitoring", activeMonitoringCount, activeMonitoringCount ? "Active schedules" : "Not enabled"],
          ].map(([label, value, helper], index) => (
            <div key={label} className={`p-5 ${index < 3 ? "xl:border-r xl:border-slate-200" : ""} ${index % 2 === 0 ? "sm:border-r sm:border-slate-200 xl:border-r" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{helper}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.4fr_0.6fr]">
          <section>
            <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-3">
              <div>
                <h2 className="text-lg font-semibold">Website posture</h2>
                <p className="mt-1 text-sm text-slate-500">Latest score, risk and next review.</p>
              </div>
              <Link href="/websites" className="text-sm font-semibold text-blue-700">View all →</Link>
            </div>

            {savedWebsites.length ? (
              <div className="divide-y divide-slate-200 border-x border-b border-slate-300 bg-white">
                {savedWebsites.map((website) => (
                  <div key={website.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 shrink-0 bg-blue-700" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{website.name || "Website"}</p>
                          <p className="mt-0.5 truncate text-sm text-slate-500">{website.url}</p>
                        </div>
                      </div>
                      <p className="mt-2 pl-5 text-xs text-slate-500">{website.scan_frequency || "weekly"} · next {formatDate(website.next_scan_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold">Score {website.latest_score ?? "—"}</span>
                      <MonitoringBadge monitoringEnabled={website.monitoring_enabled} lastScanAt={website.last_scan_at} nextScanAt={website.next_scan_at} />
                      {website.latest_risk_level ? <RiskBadge riskLevel={website.latest_risk_level} /> : null}
                      <Link href={`/websites/${website.id}`} className="text-xs font-semibold text-blue-700">Open →</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-slate-300 bg-white p-8">
                <p className="font-semibold">No websites yet</p>
                <p className="mt-2 text-sm text-slate-500">Add a public website to start a security history.</p>
                <Link href="/websites/new" className="mt-4 inline-flex bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Add website</Link>
              </div>
            )}
          </section>

          <aside>
            <div className="border border-slate-300 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold">Workspace status</h2>
              </div>
              <dl className="divide-y divide-slate-200 text-sm">
                <div className="flex justify-between px-5 py-4"><dt className="text-slate-500">Plan</dt><dd className="font-semibold capitalize">{plan}</dd></div>
                <div className="flex justify-between px-5 py-4"><dt className="text-slate-500">Active monitoring</dt><dd className="font-semibold">{activeMonitoringCount}</dd></div>
                <div className="flex justify-between px-5 py-4"><dt className="text-slate-500">High-risk recent</dt><dd className="font-semibold">{highRiskCount}</dd></div>
              </dl>
              <Link href="/billing" className="block border-t border-slate-200 px-5 py-3 text-sm font-semibold text-blue-700">Manage plan & billing →</Link>
            </div>
          </aside>
        </div>

        <section className="mt-8">
          <div className="border-b border-slate-300 pb-3">
            <h2 className="text-lg font-semibold">Recent scan activity</h2>
          </div>
          {latestScans.length ? (
            <div className="divide-y divide-slate-200 border-x border-b border-slate-300 bg-white">
              {latestScans.map((scan) => (
                <div key={scan.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{scan.website_url}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(scan.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold">Score {scan.score}</span>
                    <RiskBadge riskLevel={scan.risk_level} />
                    <Link href={`/report/${scan.id}`} className="text-xs font-semibold text-blue-700">Report →</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-slate-300 bg-white p-5 text-sm text-slate-500">No scan activity yet.</div>
          )}
        </section>
      </section>
    </main>
  );
}
