import Link from "next/link";
import { redirect } from "next/navigation";
import { DeepScanButton } from "@/components/DeepScanButton";
import { MonitoringBadge } from "@/components/MonitoringBadge";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { VerificationStatusBadge } from "@/components/VerificationStatusBadge";
import { formatDate, getScoreTrend } from "@/lib/monitoring";
import { createClient } from "@/lib/supabase/server";

export default async function WebsiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
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
      "id, url, name, monitoring_enabled, scan_frequency, last_scan_at, next_scan_at, latest_score, latest_risk_level, latest_scan_id, verification_status, verified_at, permission_attested_at, deep_scan_enabled",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!website) {
    redirect("/websites?message=Website not found");
  }

  const { data: scans } = await supabase
    .from("scans")
    .select("id, website_url, score, risk_level, created_at")
    .eq("website_id", website.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const trend = getScoreTrend(scans || []);
  const verified =
    website.verification_status === "verified" && website.deep_scan_enabled;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <Link href="/websites" className="text-sm font-semibold text-slate-600 hover:text-blue-700">
          ← Websites
        </Link>

        <div className="mt-6 grid gap-8 border-b border-slate-300 pb-8 lg:grid-cols-[1fr_230px] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Website workspace</p>
            <h1 className="mt-3 break-all text-4xl font-semibold tracking-[-0.035em]">
              {website.name || website.url}
            </h1>
            <a
              href={website.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-all text-sm text-slate-500 hover:text-blue-700"
            >
              {website.url} ↗
            </a>

            <div className="mt-6 flex flex-wrap gap-3">
              <MonitoringBadge
                monitoringEnabled={website.monitoring_enabled}
                lastScanAt={website.last_scan_at}
                nextScanAt={website.next_scan_at}
              />
              <VerificationStatusBadge
                status={website.verification_status}
                deepScanEnabled={website.deep_scan_enabled}
              />
              {website.latest_risk_level ? <RiskBadge riskLevel={website.latest_risk_level} /> : null}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/scan?websiteId=${website.id}`}
                className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Run public scan
              </Link>
              <Link
                href={`/websites/${website.id}/verify`}
                className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                Verify ownership
              </Link>
              <DeepScanButton websiteId={website.id} disabled={!verified} />
            </div>
          </div>

          <div className="border border-slate-300 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">Latest score</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-5xl font-semibold tracking-[-0.05em]">{website.latest_score ?? "--"}</span>
              {website.latest_score != null ? <span className="pb-1 text-sm text-slate-500">/100</span> : null}
            </div>
            <p className="mt-2 text-sm text-slate-600">{trend.label}</p>
            {website.latest_scan_id ? (
              <Link href={`/report/${website.latest_scan_id}`} className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900">
                Open latest report →
              </Link>
            ) : null}
          </div>
        </div>

        {message ? (
          <div className="mt-6 border-l-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
            {message}
          </div>
        ) : null}

        {!verified ? (
          <div className="mt-6 grid gap-3 border border-amber-200 bg-amber-50 p-5 sm:grid-cols-[180px_1fr_auto] sm:items-center">
            <p className="font-semibold text-amber-950">Authorized deep scan locked</p>
            <p className="text-sm leading-6 text-amber-900/80">
              Verify ownership with DNS TXT, HTML file or meta tag before deeper review is enabled.
            </p>
            <Link href={`/websites/${website.id}/verify`} className="text-sm font-semibold text-amber-950 underline underline-offset-4">
              Verify now
            </Link>
          </div>
        ) : null}

        <section className="mt-8 border border-slate-300 bg-white">
          <div className="grid md:grid-cols-4">
            {[
              ["Scan frequency", website.scan_frequency || "weekly"],
              ["Last scan", formatDate(website.last_scan_at)],
              ["Next scan", formatDate(website.next_scan_at)],
              ["Verified at", formatDate(website.verified_at)],
            ].map(([label, value], index) => (
              <div
                key={label}
                className={`p-5 ${index < 3 ? "border-b border-slate-200 md:border-b-0 md:border-r" : ""}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-2 text-base font-semibold capitalize text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 border border-slate-300 bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-semibold">Scan history</h2>
              <p className="mt-1 text-sm text-slate-500">Latest security reviews for this website.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {scans?.length || 0} recent scans
            </span>
          </div>

          {scans?.length ? (
            <div className="divide-y divide-slate-200">
              <div className="hidden grid-cols-[1fr_120px_130px_180px] gap-4 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 md:grid">
                <span>Date</span>
                <span>Score</span>
                <span>Risk</span>
                <span>Actions</span>
              </div>
              {scans.map((scan) => (
                <div key={scan.id} className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_120px_130px_180px] md:items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{new Date(scan.created_at).toLocaleString()}</p>
                    <p className="mt-1 text-xs text-slate-400 md:hidden">Scan record</p>
                  </div>
                  <p className="text-lg font-semibold">{scan.score}/100</p>
                  <div><RiskBadge riskLevel={scan.risk_level} /></div>
                  <div className="flex gap-4 text-sm">
                    <Link href={`/report/${scan.id}`} className="font-semibold text-blue-700 hover:text-blue-900">
                      Report
                    </Link>
                    <Link href={`/report/${scan.id}/vulnerability-intelligence`} className="font-semibold text-slate-700 hover:text-blue-700">
                      Intelligence
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="font-semibold text-slate-800">No scans yet</p>
              <p className="mt-2 text-sm text-slate-500">Run the first public scan to establish a baseline report.</p>
              <Link href={`/scan?websiteId=${website.id}`} className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
                Run first scan
              </Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
