import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { requireAdmin } from "@/lib/admin";
import { AdminScanLabControls } from "./AdminScanLabControls";

const ADMIN_SELF_SCAN_URL = "https://securemsme-ai-live.vercel.app";

export default async function AdminScanLabPage() {
  const { supabase, user } = await requireAdmin();

  const { data: website } = await supabase
    .from("websites")
    .select("id, url")
    .eq("user_id", user.id)
    .eq("url", ADMIN_SELF_SCAN_URL)
    .maybeSingle();

  const { data: latestScans } = website?.id
    ? await supabase
        .from("scans")
        .select("id, score, risk_level, created_at, report")
        .eq("user_id", user.id)
        .eq("website_id", website.id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="border-b border-slate-300 pb-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Admin scan lab</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">VeyraSec production self-scan</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Internal founder assessment for the fixed VeyraSec production domain. Customer ownership verification,
            paid-plan, and quota rules remain unchanged everywhere else.
          </p>
        </div>

        <section className="mt-8 border border-slate-300 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Locked target</p>
          </div>
          <div className="p-5">
            <p className="break-all text-base font-semibold">{ADMIN_SELF_SCAN_URL}</p>
            <p className="mt-2 text-sm text-slate-500">
              The target is not editable. Deep Scan bypass is allowed only for this admin-owned production URL.
            </p>
          </div>
        </section>

        <section className="mt-6 border border-slate-300 bg-white p-5">
          <AdminScanLabControls />
          <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500 md:grid-cols-3">
            <p><span className="font-semibold text-slate-700">Normal:</span> canonical public report and score.</p>
            <p><span className="font-semibold text-slate-700">Retest:</span> compares against the previous saved scan.</p>
            <p><span className="font-semibold text-slate-700">Deep:</span> passive advanced assessment without customer ownership verification for this locked admin target.</p>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-3">
            <div>
              <h2 className="text-lg font-semibold">Recent self-scans</h2>
              <p className="mt-1 text-sm text-slate-500">Use three Normal scans to test report stability.</p>
            </div>
            <Link href="/admin/scans" className="text-sm font-semibold text-blue-700">All scans →</Link>
          </div>

          {latestScans?.length ? (
            <div className="divide-y divide-slate-200 border-x border-b border-slate-300 bg-white">
              {latestScans.map((scan) => {
                const report = scan.report as { adminScan?: { mode?: string } } | null;
                return (
                  <div key={scan.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold capitalize">{report?.adminScan?.mode || "scan"}</span>
                        <span className="text-xs text-slate-500">{new Date(scan.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold">Score {scan.score}</span>
                      <RiskBadge riskLevel={scan.risk_level} />
                      <Link href={`/report/${scan.id}`} className="text-xs font-semibold text-blue-700">Report →</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-slate-300 bg-white p-6 text-sm text-slate-500">No admin self-scans yet.</div>
          )}
        </section>
      </section>
    </main>
  );
}
