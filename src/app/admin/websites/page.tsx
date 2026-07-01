import Link from "next/link";
import { MonitoringBadge } from "@/components/MonitoringBadge";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { requireAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/monitoring";

export default async function AdminWebsitesPage() {
  const { supabase } = await requireAdmin();

  const { data: websites } = await supabase
    .from("websites")
    .select(
      "id, user_id, name, url, monitoring_enabled, scan_frequency, last_scan_at, next_scan_at, latest_score, latest_risk_level, latest_scan_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Link href="/admin" className="text-sm font-bold text-slate-600">
          Back to admin
        </Link>

        <h1 className="mt-6 text-4xl font-black">All websites</h1>

        <div className="mt-8 grid gap-4">
          {websites?.length ? (
            websites.map((website) => (
              <div
                key={website.id}
                className="rounded-3xl border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <h2 className="font-black">{website.name || "Website"}</h2>
                    <p className="mt-2 break-all text-sm text-slate-600">
                      {website.url}
                    </p>
                    <p className="mt-2 font-mono text-xs text-slate-500">
                      Owner: {website.user_id}
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

                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">
                    Score {website.latest_score ?? "--"}
                  </span>
                  {website.latest_scan_id ? (
                    <Link
                      href={`/report/${website.latest_scan_id}`}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100"
                    >
                      Latest report
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-600">No websites yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
