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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl space-y-8 px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <Link href="/websites" className="text-sm font-bold text-slate-600">
            Back to websites
          </Link>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-black text-slate-500">Website asset</p>
              <h1 className="mt-2 break-all text-4xl font-black">
                {website.name || website.url}
              </h1>
              <p className="mt-3 break-all text-slate-600">{website.url}</p>

              <div className="mt-5 flex flex-wrap gap-3">
                <MonitoringBadge
                  monitoringEnabled={website.monitoring_enabled}
                  lastScanAt={website.last_scan_at}
                  nextScanAt={website.next_scan_at}
                />
                <VerificationStatusBadge
                  status={website.verification_status}
                  deepScanEnabled={website.deep_scan_enabled}
                />
                {website.latest_risk_level ? (
                  <RiskBadge riskLevel={website.latest_risk_level} />
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950 p-6 text-white">
              <p className="text-sm text-slate-300">Latest score</p>
              <p className="mt-1 text-5xl font-black">
                {website.latest_score ?? "--"}
              </p>
              <p className="mt-2 text-sm text-slate-300">{trend.label}</p>
            </div>
          </div>

          {message ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
              {message}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/scan?websiteId=${website.id}`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Normal scan
            </Link>
            <Link
              href={`/websites/${website.id}/verify`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Verify ownership
            </Link>
            <DeepScanButton websiteId={website.id} disabled={!verified} />
          </div>

          {!verified ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              <p className="font-black">Deep scan locked</p>
              <p className="mt-2">
                Verify ownership first using DNS TXT, HTML file, or meta tag.
                After verification, authorized deep scan will unlock.
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Frequency</p>
            <p className="mt-2 text-2xl font-black capitalize">
              {website.scan_frequency || "weekly"}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Last scan</p>
            <p className="mt-2 text-xl font-black">
              {formatDate(website.last_scan_at)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Next scan</p>
            <p className="mt-2 text-xl font-black">
              {formatDate(website.next_scan_at)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Verified at</p>
            <p className="mt-2 text-xl font-black">
              {formatDate(website.verified_at)}
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Scan history</h2>

          <div className="mt-6 grid gap-4">
            {scans?.length ? (
              scans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-5 md:flex-row md:items-center"
                >
                  <div>
                    <p className="font-black">
                      Score {scan.score} · {scan.risk_level} risk
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(scan.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/report/${scan.id}`}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100"
                    >
                      Report
                    </Link>
                    <Link
                      href={`/report/${scan.id}/vulnerability-intelligence`}
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
                    >
                      Intelligence
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No scans yet.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
