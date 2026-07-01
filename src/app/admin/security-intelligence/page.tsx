import Link from "next/link";
import { AdvancedAuditPanel } from "@/components/AdvancedAuditPanel";
import { Navbar } from "@/components/Navbar";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";
import { requireAdmin } from "@/lib/admin";

export default async function SecurityIntelligencePage() {
  const { supabase } = await requireAdmin();

  const { data: scans } = await supabase
    .from("scans")
    .select("id, website_url, score, risk_level, report, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const audits =
    scans?.map((scan) => {
      const report = (scan.report || {}) as Record<string, unknown>;
      return {
        scan,
        audit:
          (report.advancedAudit as
            ReturnType<typeof buildAdvancedSecurityAudit> | undefined) ||
          buildAdvancedSecurityAudit({
            ...report,
            score: scan.score,
            riskLevel: scan.risk_level,
          }),
      };
    }) || [];

  const averageMaturity = audits.length
    ? Math.round(
        audits.reduce((total, item) => total + item.audit.maturityScore, 0) /
          audits.length,
      )
    : 0;

  const weakWebsites = audits.filter(
    (item) => item.audit.maturityScore < 60,
  ).length;
  const strongWebsites = audits.filter(
    (item) => item.audit.maturityScore >= 80,
  ).length;
  const latest = audits[0];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Link href="/admin" className="text-sm font-bold text-slate-600">
          Back to admin
        </Link>

        <p className="mt-6 text-sm font-bold text-slate-500">
          Advanced security intelligence
        </p>
        <h1 className="mt-2 text-4xl font-black">Portfolio audit view</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Founder-level view of customer website maturity, weak posture, and
          report quality.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Audits analyzed</p>
            <p className="mt-2 text-4xl font-black">{audits.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Average maturity</p>
            <p className="mt-2 text-4xl font-black">{averageMaturity}</p>
          </div>
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">Weak posture</p>
            <p className="mt-2 text-4xl font-black text-red-950">
              {weakWebsites}
            </p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm text-emerald-700">Strong posture</p>
            <p className="mt-2 text-4xl font-black text-emerald-950">
              {strongWebsites}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest advanced audits</h2>
          <div className="mt-6 grid gap-4">
            {audits.map((item) => (
              <div
                key={item.scan.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-5 md:flex-row md:items-center"
              >
                <div>
                  <p className="break-all font-black">
                    {item.scan.website_url}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(item.scan.created_at).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm font-bold">
                    {item.audit.maturityLevel} · {item.audit.startupGrade}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">
                    Maturity {item.audit.maturityScore}
                  </span>
                  <Link
                    href={`/report/${item.scan.id}/advanced`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100"
                  >
                    Advanced report
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {latest ? (
          <div className="mt-10">
            <AdvancedAuditPanel audit={latest.audit} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
