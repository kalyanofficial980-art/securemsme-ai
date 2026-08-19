import Link from "next/link";
import { redirect } from "next/navigation";
import { DeepScanButton } from "@/components/DeepScanButton";
import { MonitoringBadge } from "@/components/MonitoringBadge";
import { Navbar } from "@/components/Navbar";
import { RescanButton } from "@/components/RescanButton";
import { RiskBadge } from "@/components/RiskBadge";
import { VerificationStatusBadge } from "@/components/VerificationStatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/monitoring";

export default async function WebsitesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to view websites");

  const { data: websites } = await supabase.from("websites").select("id, name, url, monitoring_enabled, scan_frequency, last_scan_at, next_scan_at, latest_score, latest_risk_level, latest_scan_id, verification_status, deep_scan_enabled").eq("user_id", user.id).order("created_at", { ascending: false });
  const savedWebsites = websites ?? [];
  const verifiedCount = savedWebsites.filter((website) => website.verification_status === "verified").length;
  const scannedCount = savedWebsites.filter((website) => website.latest_scan_id).length;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Asset inventory</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Websites</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Ownership, latest security posture, review cadence and retest actions in one place.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/scan" className="border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Run scan</Link>
            <Link href="/websites/new" className="bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Add website</Link>
          </div>
        </div>

        <div className="grid border-x border-b border-slate-200 sm:grid-cols-3">
          {[["Saved", savedWebsites.length], ["Scanned", scannedCount], ["Verified", verifiedCount]].map(([label, value], index) => (
            <div key={label} className={`p-5 ${index < 2 ? "sm:border-r sm:border-slate-200" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
            </div>
          ))}
        </div>

        {savedWebsites.length ? (
          <div className="mt-8 divide-y divide-slate-200 border border-slate-200">
            {savedWebsites.map((website) => {
              const deepScanUnlocked = website.verification_status === "verified" && website.deep_scan_enabled;
              return (
                <article key={website.id} className="p-5 sm:p-6">
                  <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-base font-semibold">{website.name || "Website"}</h2>
                        <VerificationStatusBadge status={website.verification_status} deepScanEnabled={website.deep_scan_enabled} />
                        <MonitoringBadge monitoringEnabled={website.monitoring_enabled} lastScanAt={website.last_scan_at} nextScanAt={website.next_scan_at} />
                      </div>
                      <p className="mt-1 break-all text-sm text-slate-500">{website.url}</p>

                      <dl className="mt-5 grid gap-px bg-slate-200 sm:grid-cols-4">
                        <div className="bg-white p-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Score</dt><dd className="mt-1 text-xl font-semibold">{website.latest_score ?? "—"}</dd></div>
                        <div className="bg-white p-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Risk</dt><dd className="mt-2">{website.latest_risk_level ? <RiskBadge riskLevel={website.latest_risk_level} /> : <span className="text-xs text-slate-500">Not scanned</span>}</dd></div>
                        <div className="bg-white p-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Last scan</dt><dd className="mt-1 text-xs font-medium text-slate-700">{formatDate(website.last_scan_at)}</dd></div>
                        <div className="bg-white p-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Next review</dt><dd className="mt-1 text-xs font-medium text-slate-700">{formatDate(website.next_scan_at)}</dd></div>
                      </dl>
                    </div>

                    <div className="border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold">{deepScanUnlocked ? "Authorized deeper review available" : "Ownership gate required"}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{deepScanUnlocked ? "Ownership and permission are confirmed for the deeper passive workflow." : "Verify ownership before deeper passive review is enabled."}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/websites/${website.id}`} className="border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Details</Link>
                        <Link href={`/websites/${website.id}/verify`} className="border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">{website.verification_status === "verified" ? "Ownership" : "Verify ownership"}</Link>
                        {website.latest_scan_id ? <Link href={`/report/${website.latest_scan_id}`} className="border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Latest report</Link> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <RescanButton websiteId={website.id} label={website.latest_scan_id ? "Retest after fixes" : "Run first scan"} />
                        <DeepScanButton websiteId={website.id} disabled={!deepScanUnlocked} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 border border-dashed border-slate-300 p-10">
            <h2 className="text-lg font-semibold">No websites saved</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Add a public website to start a safe scan and create its security history.</p>
            <Link href="/websites/new" className="mt-5 inline-flex bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Add first website</Link>
          </div>
        )}
      </section>
    </main>
  );
}
