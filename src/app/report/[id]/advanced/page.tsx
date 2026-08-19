import Link from "next/link";
import { redirect } from "next/navigation";
import { AdvancedAuditPanel } from "@/components/AdvancedAuditPanel";
import { Navbar } from "@/components/Navbar";
import { buildAdvancedSecurityAudit } from "@/lib/advanced-security-audit";
import { createClient } from "@/lib/supabase/server";

export default async function AdvancedReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view this advanced audit");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_url, score, risk_level, report, created_at")
    .eq("id", id);

  if (profile?.role !== "admin") {
    scanQuery = scanQuery.eq("user_id", user.id);
  }

  const { data: scan } = await scanQuery.single();

  if (!scan) {
    redirect("/dashboard?message=Advanced audit not found");
  }

  const report = (scan.report || {}) as Record<string, unknown>;
  const advancedAudit =
    (report.advancedAudit as
      ReturnType<typeof buildAdvancedSecurityAudit> | undefined) ||
    buildAdvancedSecurityAudit({
      ...report,
      score: scan.score,
      riskLevel: scan.risk_level,
    });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}`}
              className="text-sm font-bold text-slate-600"
            >
              Back to normal report
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Advanced customer audit
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Generated from safe passive audit evidence. Scan date:{" "}
              {new Date(scan.created_at).toLocaleString()}
            </p>
          </div>

          <Link
            href={`/report/${scan.id}/print`}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Printable report
          </Link>
        </div>

        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="font-black">Control-mapping diagnostic</p>
          <p className="mt-2 text-slate-600">
            Canonical customer score: {scan.score}/100 · {scan.risk_level}.
            The maturity/control scores below are diagnostic mappings, not a
            second overall website score.
          </p>
        </div>

        <AdvancedAuditPanel audit={advancedAudit} />
      </section>
    </main>
  );
}
