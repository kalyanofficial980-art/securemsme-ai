import Link from "next/link";
import { MonitoringBadge } from "@/components/MonitoringBadge";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { requireAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/monitoring";

export default async function AdminWebsitesPage() {
  const { supabase } = await requireAdmin();

  const { data: websites } = await supabase
    .from("admin_customer_websites_v1")
    .select(
      "id, user_id, name, url, monitoring_enabled, scan_frequency, last_scan_at, next_scan_at, latest_score, latest_risk_level, latest_scan_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/admin" className="text-sm font-semibold text-blue-700">← Admin</Link>

        <div className="mt-6 flex flex-col justify-between gap-4 border-b border-slate-300 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Asset operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Websites</h1>
            <p className="mt-2 text-sm text-slate-600">Review customer assets, monitoring state, latest score and report access. Admin-owned legacy assets are excluded.</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{websites?.length ?? 0} loaded</span>
        </div>

        {websites?.length ? (
          <div className="mt-8 divide-y divide-slate-200 border border-slate-300 bg-white">
            {websites.map((website) => (
              <article key={website.id} className="p-5 sm:p-6">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-sm font-semibold text-slate-950">{website.name || "Website"}</h2>
                      <MonitoringBadge monitoringEnabled={website.monitoring_enabled} lastScanAt={website.last_scan_at} nextScanAt={website.next_scan_at} />
                      {website.latest_risk_level ? <RiskBadge riskLevel={website.latest_risk_level} /> : null}
                    </div>
                    <p className="mt-2 break-all text-sm text-slate-600">{website.url}</p>
                    <p className="mt-2 break-all font-mono text-[11px] text-slate-400">Owner {website.user_id}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold">Score {website.latest_score ?? "—"}</span>
                    {website.latest_scan_id ? <Link href={`/report/${website.latest_scan_id}`} className="text-xs font-semibold text-blue-700">Latest report →</Link> : <span className="text-xs text-slate-400">No report yet</span>}
                  </div>
                </div>

                <dl className="mt-4 grid border-t border-slate-200 pt-4 text-xs sm:grid-cols-3">
                  <div className="py-2 sm:pr-4"><dt className="font-semibold uppercase tracking-[0.08em] text-slate-400">Frequency</dt><dd className="mt-1 font-medium text-slate-700 capitalize">{website.scan_frequency || "weekly"}</dd></div>
                  <div className="py-2 sm:border-l sm:border-slate-200 sm:px-4"><dt className="font-semibold uppercase tracking-[0.08em] text-slate-400">Last scan</dt><dd className="mt-1 font-medium text-slate-700">{formatDate(website.last_scan_at)}</dd></div>
                  <div className="py-2 sm:border-l sm:border-slate-200 sm:pl-4"><dt className="font-semibold uppercase tracking-[0.08em] text-slate-400">Next review</dt><dd className="mt-1 font-medium text-slate-700">{formatDate(website.next_scan_at)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 border border-slate-300 bg-white p-8 text-sm text-slate-500">No customer websites yet.</div>
        )}
      </section>
    </main>
  );
}
