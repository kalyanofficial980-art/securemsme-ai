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

  const displayName = profile?.full_name || user.email?.split("@")[0] || "there";
  const plan = profile?.plan || "free";

  return (
    <main className="min-h-screen text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-xl shadow-slate-950/10">
          <div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-sky-200">
                  Security workspace
                </span>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-black capitalize text-emerald-200">
                  {plan} plan
                </span>
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Welcome back, {displayName}
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                Review website posture, run safe scans, track remediation, and keep retest evidence in one place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href="/websites/new"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-sm hover:-translate-y-0.5 hover:bg-slate-100"
              >
                + Add website
              </Link>
              <Link
                href="/scan"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15"
              >
                Run scan
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Saved websites", totalWebsites ?? 0, "Assets in your workspace"],
            ["Total scans", totalScans ?? 0, "Reports created so far"],
            ["Recent avg score", averageScore || "—", latestScans.length ? "Across recent scans" : "Run your first scan"],
            ["Due rescans", dueWebsites.length, dueWebsites.length ? "Needs attention" : "Nothing overdue"],
          ].map(([label, value, helper]) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-500">{label}</p>
              <p className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950">{value}</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">{helper}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-sky-700">Websites</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Security posture by website</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Open a website to verify ownership, run deeper review, or inspect history.
                </p>
              </div>
              <Link href="/websites" className="text-sm font-black text-sky-700 hover:text-sky-900">
                View all websites →
              </Link>
            </div>

            {savedWebsites.length ? (
              <div className="mt-6 grid gap-3">
                {savedWebsites.map((website) => (
                  <div key={website.id} className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-5 hover:border-slate-300 hover:bg-white hover:shadow-sm">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
                            {(website.name || website.url || "W").charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate font-black text-slate-950">{website.name || "Website"}</h3>
                            <p className="mt-1 truncate text-sm text-slate-500">{website.url}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs font-bold text-slate-400">
                          {website.scan_frequency || "weekly"} review · Next {formatDate(website.next_scan_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                          Score {website.latest_score ?? "—"}
                        </span>
                        <MonitoringBadge
                          monitoringEnabled={website.monitoring_enabled}
                          lastScanAt={website.last_scan_at}
                          nextScanAt={website.next_scan_at}
                        />
                        {website.latest_risk_level ? <RiskBadge riskLevel={website.latest_risk_level} /> : null}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                      <Link href={`/websites/${website.id}`} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800">
                        Open website
                      </Link>
                      <Link href={`/scan?websiteId=${website.id}`} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
                        Scan
                      </Link>
                      {website.latest_scan_id ? (
                        <Link href={`/report/${website.latest_scan_id}`} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
                          Latest report
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-9 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-black shadow-sm ring-1 ring-slate-200">+</div>
                <h3 className="mt-4 text-lg font-black">Add your first website</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Save a website first, then run a safe public scan and build its security history.
                </p>
                <Link href="/websites/new" className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
                  Add website
                </Link>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-sky-700">Overview</p>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                  <span className="text-sm font-bold text-slate-500">Active monitoring</span>
                  <span className="text-xl font-black">{activeMonitoringCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                  <span className="text-sm font-bold text-slate-500">High-risk recent</span>
                  <span className="text-xl font-black">{highRiskCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                  <span className="text-sm font-bold text-slate-500">Current plan</span>
                  <span className="text-sm font-black capitalize">{plan}</span>
                </div>
              </div>
              <Link href="/pricing" className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">
                Compare plans
              </Link>
            </div>

            <div className="rounded-[2rem] bg-gradient-to-br from-sky-600 to-teal-600 p-6 text-white shadow-lg shadow-sky-900/10">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-sky-100">Recommended flow</p>
              <h3 className="mt-3 text-2xl font-black tracking-[-0.03em]">Scan → Fix → Retest</h3>
              <p className="mt-3 text-sm leading-6 text-sky-50/90">
                Use retest comparison to show what improved after remediation instead of sending another isolated scan.
              </p>
            </div>
          </aside>
        </div>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-sky-700">Recent activity</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Scan timeline</h2>
          </div>

          {latestScans.length ? (
            <div className="mt-6 divide-y divide-slate-100">
              {latestScans.map((scan) => (
                <div key={scan.id} className="flex flex-col justify-between gap-4 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-800">{scan.website_url}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{new Date(scan.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Score {scan.score}</span>
                    <RiskBadge riskLevel={scan.risk_level} />
                    <Link href={`/report/${scan.id}`} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
                      View report →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
              No scans yet. Run your first scan to start the timeline.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
