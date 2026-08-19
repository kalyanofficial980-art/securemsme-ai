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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view websites");
  }

  const { data: websites } = await supabase
    .from("websites")
    .select(
      "id, name, url, monitoring_enabled, scan_frequency, last_scan_at, next_scan_at, latest_score, latest_risk_level, latest_scan_id, verification_status, deep_scan_enabled",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const savedWebsites = websites ?? [];
  const verifiedCount = savedWebsites.filter(
    (website) => website.verification_status === "verified",
  ).length;
  const scannedCount = savedWebsites.filter((website) => website.latest_scan_id).length;

  return (
    <main className="min-h-screen text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-sky-800">
              Website workspace
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
              Your websites
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Keep each website, its latest posture, ownership state, and retest history in one clean workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/scan"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Run scan
            </Link>
            <Link
              href="/websites/new"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10 hover:-translate-y-0.5 hover:bg-slate-800"
            >
              + Add website
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Saved", savedWebsites.length, "Websites in workspace"],
            ["Scanned", scannedCount, "With at least one report"],
            ["Verified", verifiedCount, "Ownership-confirmed"],
          ].map(([label, value, helper]) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-black tracking-[-0.04em]">{value}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">{helper}</p>
            </div>
          ))}
        </div>

        {savedWebsites.length ? (
          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {savedWebsites.map((website) => {
              const deepScanUnlocked =
                website.verification_status === "verified" && website.deep_scan_enabled;

              return (
                <article
                  key={website.id}
                  className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                >
                  <div className="p-6 sm:p-7">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                          {(website.name || website.url || "W").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-black tracking-[-0.02em]">
                            {website.name || "Website"}
                          </h2>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                            {website.url}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <MonitoringBadge
                          monitoringEnabled={website.monitoring_enabled}
                          lastScanAt={website.last_scan_at}
                          nextScanAt={website.next_scan_at}
                        />
                        <VerificationStatusBadge
                          status={website.verification_status}
                          deepScanEnabled={website.deep_scan_enabled}
                        />
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold text-slate-400">Score</p>
                        <p className="mt-1 text-3xl font-black tracking-[-0.04em]">
                          {website.latest_score ?? "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold text-slate-400">Risk</p>
                        <div className="mt-2">
                          {website.latest_risk_level ? (
                            <RiskBadge riskLevel={website.latest_risk_level} />
                          ) : (
                            <span className="text-xs font-black text-slate-500">Not scanned</span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold text-slate-400">Last scan</p>
                        <p className="mt-2 text-xs font-black leading-5 text-slate-700">
                          {formatDate(website.last_scan_at)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold text-slate-400">Next review</p>
                        <p className="mt-2 text-xs font-black leading-5 text-slate-700">
                          {formatDate(website.next_scan_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <Link
                        href={`/websites/${website.id}`}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        Website details
                      </Link>
                      <Link
                        href={`/websites/${website.id}/verify`}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        {website.verification_status === "verified" ? "Review ownership" : "Verify ownership"}
                      </Link>
                      {website.latest_scan_id ? (
                        <Link
                          href={`/report/${website.latest_scan_id}`}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                        >
                          Latest report
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/80 p-5 sm:px-7">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <div>
                        <p className="text-sm font-black text-slate-800">
                          {deepScanUnlocked ? "Authorized deeper review unlocked" : "Deeper review locked"}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                          {deepScanUnlocked
                            ? "Ownership and permission are confirmed for the current deeper passive workflow."
                            : "Verify ownership and permission before running deeper passive checks."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <RescanButton
                          websiteId={website.id}
                          label={website.latest_scan_id ? "Retest after fixes" : "Run first scan"}
                        />
                        <DeepScanButton websiteId={website.id} disabled={!deepScanUnlocked} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm sm:p-14">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-white">+</div>
            <h2 className="mt-5 text-2xl font-black tracking-[-0.03em]">Add your first website</h2>
            <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-500">
              Save one public website, run a safe scan, and VeyraSec will start building its security history.
            </p>
            <Link
              href="/websites/new"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10"
            >
              Add first website
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
