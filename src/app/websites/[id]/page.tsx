import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MonitoringBadge } from "@/components/MonitoringBadge";
import { Navbar } from "@/components/Navbar";
import { RescanButton } from "@/components/RescanButton";
import { RiskBadge } from "@/components/RiskBadge";
import {
  deleteWebsite,
  updateMonitoringSettings,
} from "@/app/websites/actions";
import { createClient } from "@/lib/supabase/server";
import {
  formatDate,
  formatDateTime,
  getScoreTrend,
  getTrendClass,
} from "@/lib/monitoring";

type WebsiteDetailPageProps = {
  params: Promise<{ id: string }>;
};

type ReportJson = {
  topFixes?: {
    name: string;
    severity?: string;
    fixRecommendation?: string;
  }[];
  severityCounts?: {
    critical?: number;
    high?: number;
    medium?: number;
  };
};

export default async function WebsiteDetailPage({
  params,
}: WebsiteDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view website");
  }

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, name, url, created_at, monitoring_enabled, scan_frequency, last_scan_at, next_scan_at, latest_score, latest_risk_level, latest_scan_id",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!website) notFound();

  const { data: scans } = await supabase
    .from("scans")
    .select("id, score, risk_level, created_at, report")
    .eq("user_id", user.id)
    .eq("website_id", website.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const scanHistory = scans ?? [];
  const latestScan = scanHistory[0];
  const trend = getScoreTrend(scanHistory);
  const latestReport = latestScan?.report as ReportJson | undefined;
  const latestTopFixes = latestReport?.topFixes ?? [];
  const latestSeverity = latestReport?.severityCounts ?? {};
  const chartScans = [...scanHistory].reverse().slice(-10);

  const averageScore = scanHistory.length
    ? Math.round(
        scanHistory.reduce(
          (total, scan) => total + Number(scan.score || 0),
          0,
        ) / scanHistory.length,
      )
    : 0;

  const highRiskCount = scanHistory.filter(
    (scan) => scan.risk_level === "High",
  ).length;

  const bestScore = scanHistory.length
    ? Math.max(...scanHistory.map((scan) => Number(scan.score || 0)))
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Link href="/websites" className="text-sm font-bold text-slate-600">
          Back to websites
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">
                Website monitoring profile
              </p>
              <h1 className="mt-2 text-4xl font-black">
                {website.name || "Website"}
              </h1>
              <p className="mt-3 break-all text-slate-600">{website.url}</p>
              <p className="mt-2 text-sm text-slate-500">
                Added on {formatDate(website.created_at)}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <MonitoringBadge
                  monitoringEnabled={website.monitoring_enabled}
                  lastScanAt={website.last_scan_at}
                  nextScanAt={website.next_scan_at}
                />
                {website.latest_risk_level ? (
                  <RiskBadge riskLevel={website.latest_risk_level} />
                ) : null}
                <span
                  className={`rounded-full px-4 py-2 text-sm font-black ${getTrendClass(
                    trend.direction,
                  )}`}
                >
                  {trend.label}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <RescanButton websiteId={website.id} />
              <Link
                href={`/scan?websiteId=${website.id}`}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold hover:bg-slate-100"
              >
                Scan page
              </Link>
              {latestScan ? (
                <Link
                  href={`/report/${latestScan.id}`}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold hover:bg-slate-100"
                >
                  Latest report
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Latest score</p>
              <p className="mt-2 text-4xl font-black">
                {latestScan?.score ?? "--"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Average score</p>
              <p className="mt-2 text-4xl font-black">{averageScore || "--"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Best score</p>
              <p className="mt-2 text-4xl font-black">{bestScore || "--"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Total scans</p>
              <p className="mt-2 text-4xl font-black">{scanHistory.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 lg:col-span-2">
            <h2 className="text-2xl font-black">Score trend</h2>
            {chartScans.length ? (
              <div className="mt-8 flex h-56 items-end gap-3 rounded-2xl bg-slate-50 p-5">
                {chartScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="flex h-40 w-full items-end rounded-xl bg-white p-1">
                      <div
                        className="w-full rounded-lg bg-slate-950"
                        style={{
                          height: `${Math.max(Number(scan.score || 0), 5)}%`,
                        }}
                        title={`Score ${scan.score}`}
                      />
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {new Date(scan.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-slate-600">No scan trend yet.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Monitoring settings</h2>

            <form action={updateMonitoringSettings} className="mt-6 grid gap-4">
              <input type="hidden" name="websiteId" value={website.id} />

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  name="monitoringEnabled"
                  defaultChecked={Boolean(website.monitoring_enabled)}
                  className="h-5 w-5"
                />
                <span className="font-bold">Monitoring enabled</span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Scan frequency
                </span>
                <select
                  name="scanFrequency"
                  defaultValue={website.scan_frequency || "weekly"}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="manual">Manual only</option>
                </select>
              </label>

              <button className="rounded-full bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">
                Save settings
              </button>
            </form>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
              <p>
                <strong>Last scan:</strong>{" "}
                {formatDateTime(website.last_scan_at)}
              </p>
              <p className="mt-2">
                <strong>Next scan:</strong>{" "}
                {formatDateTime(website.next_scan_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Risk summary</h2>
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">High risk scans</p>
                <p className="mt-2 text-3xl font-black">{highRiskCount}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Critical latest</p>
                <p className="mt-2 text-3xl font-black text-red-950">
                  {latestSeverity.critical ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">High latest</p>
                <p className="mt-2 text-3xl font-black text-red-700">
                  {latestSeverity.high ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 lg:col-span-2">
            <h2 className="text-2xl font-black">Latest priority fixes</h2>
            {latestTopFixes.length ? (
              <div className="mt-6 space-y-4">
                {latestTopFixes.slice(0, 5).map((fix) => (
                  <div
                    key={fix.name}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {fix.severity || "Priority"}
                    </p>
                    <h3 className="mt-1 font-black">{fix.name}</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {fix.fixRecommendation || "Fix recommended."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-slate-600">
                No priority fixes yet. Run a scan first.
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Scan history</h2>
          {scanHistory.length ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Risk</th>
                    <th className="px-4 py-3">Change</th>
                    <th className="px-4 py-3">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {scanHistory.map((scan, index) => {
                    const nextOlderScan = scanHistory[index + 1];
                    const change = nextOlderScan
                      ? Number(scan.score || 0) -
                        Number(nextOlderScan.score || 0)
                      : 0;

                    return (
                      <tr key={scan.id} className="border-t border-slate-200">
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(scan.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-black">{scan.score}</td>
                        <td className="px-4 py-3">
                          <RiskBadge riskLevel={scan.risk_level} />
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {nextOlderScan
                            ? change > 0
                              ? `+${change}`
                              : String(change)
                            : "--"}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/report/${scan.id}`}
                            className="font-black text-slate-950 underline"
                          >
                            View report
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-bold">No scans for this website yet.</p>
              <div className="mt-4 flex justify-center">
                <RescanButton websiteId={website.id} label="Run first scan" />
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Danger zone</h2>
          <form action={deleteWebsite} className="mt-5">
            <input type="hidden" name="websiteId" value={website.id} />
            <button className="rounded-full border border-red-200 bg-white px-5 py-3 font-bold text-red-700 hover:bg-red-100">
              Delete website
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
