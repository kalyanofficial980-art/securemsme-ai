import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";
import { createClient } from "@/lib/supabase/server";

export default async function EvidenceHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view evidence history");
  }

  const { data: scans } = await supabase
    .from("scans")
    .select("id, website_url, score, risk_level, report, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items =
    scans?.map((scan) => {
      const report = (scan.report || {}) as Record<string, unknown>;
      const audit =
        (report.advancedAudit as
          ReturnType<typeof buildAdvancedSecurityAudit> | undefined) ||
        buildAdvancedSecurityAudit({
          ...report,
          score: scan.score,
          riskLevel: scan.risk_level,
        });

      return {
        scan,
        audit,
        source:
          typeof report.source === "string" ? report.source : "native-scan",
        toolName:
          typeof report.toolName === "string"
            ? report.toolName
            : "SecureMSME AI",
      };
    }) || [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">Evidence history</p>
        <h1 className="mt-2 text-4xl font-black">Audit evidence timeline</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Track native scans and imported passive testing reports in one
          evidence-driven SaaS workflow.
        </p>

        <div className="mt-10 grid gap-5">
          {items.length ? (
            items.map((item) => (
              <div
                key={item.scan.id}
                className="rounded-3xl border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="break-all text-xl font-black">
                      {item.scan.website_url}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {new Date(item.scan.created_at).toLocaleString()} ·{" "}
                      {item.toolName} · {item.source}
                    </p>
                    <p className="mt-3 font-bold">
                      {item.audit.maturityLevel} · {item.audit.startupGrade} ·{" "}
                      {item.audit.evidenceRecords.length} evidence records
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">
                      Score {item.scan.score}
                    </span>
                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">
                      Maturity {item.audit.maturityScore}
                    </span>
                    <RiskBadge riskLevel={item.scan.risk_level} />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/report/${item.scan.id}`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100"
                  >
                    Normal report
                  </Link>
                  <Link
                    href={`/report/${item.scan.id}/advanced`}
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
                  >
                    Advanced report
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
              <p className="text-slate-600">No evidence history yet.</p>
              <Link
                href="/scan"
                className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800"
              >
                Start first scan
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
