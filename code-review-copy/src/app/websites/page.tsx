import Link from "next/link";
import { redirect } from "next/navigation";
import { MonitoringBadge } from "@/components/MonitoringBadge";
import { Navbar } from "@/components/Navbar";
import { RescanButton } from "@/components/RescanButton";
import { RiskBadge } from "@/components/RiskBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/monitoring";

export default async function WebsitesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view websites");
  }

  const { data: websites } = await supabase
    .from("websites")
    .select(
      "id, name, url, monitoring_enabled, scan_frequency, last_scan_at, next_scan_at, latest_score, latest_risk_level, latest_scan_id",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-bold text-slate-500">
              Multi-website monitoring
            </p>
            <h1 className="mt-2 text-4xl font-black">Saved websites</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Monitor saved websites manually and track latest score history.
            </p>
          </div>
          <Link
            href="/websites/new"
            className="rounded-full bg-slate-950 px-5 py-3 text-center font-bold text-white hover:bg-slate-800"
          >
            Add website
          </Link>
        </div>

        {websites?.length ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {websites.map((website) => (
              <div
                key={website.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <h2 className="text-xl font-black">
                      {website.name || "Website"}
                    </h2>
                    <p className="mt-2 break-all text-sm text-slate-600">
                      {website.url}
                    </p>
                  </div>
                  <MonitoringBadge
                    monitoringEnabled={website.monitoring_enabled}
                    lastScanAt={website.last_scan_at}
                    nextScanAt={website.next_scan_at}
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Latest score</p>
                    <p className="mt-2 text-3xl font-black">
                      {website.latest_score ?? "--"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Latest risk</p>
                    <div className="mt-2">
                      {website.latest_risk_level ? (
                        <RiskBadge riskLevel={website.latest_risk_level} />
                      ) : (
                        <span className="text-sm font-black text-slate-500">
                          Not scanned
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Last scan</p>
                    <p className="mt-2 text-sm font-black">
                      {formatDate(website.last_scan_at)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Next scan</p>
                    <p className="mt-2 text-sm font-black">
                      {formatDate(website.next_scan_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/websites/${website.id}`}
                    className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-slate-100"
                  >
                    Open
                  </Link>
                  <Link
                    href={`/scan?websiteId=${website.id}`}
                    className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-slate-100"
                  >
                    Scan page
                  </Link>
                  {website.latest_scan_id ? (
                    <Link
                      href={`/report/${website.latest_scan_id}`}
                      className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-slate-100"
                    >
                      Latest report
                    </Link>
                  ) : null}
                  <RescanButton websiteId={website.id} label="Rescan" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-2xl font-black">No websites saved yet</h2>
            <Link
              href="/websites/new"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 font-bold text-white"
            >
              Add first website
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
