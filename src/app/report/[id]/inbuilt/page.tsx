import Link from "next/link";
import { redirect } from "next/navigation";
import { InbuiltAuditPanel } from "@/components/InbuiltAuditPanel";
import { Navbar } from "@/components/Navbar";
import type { InbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import { createClient } from "@/lib/supabase/server";

export default async function InbuiltReportPage({
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
    redirect("/login?message=Please login to view this inbuilt audit");
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
    redirect("/dashboard?message=Inbuilt audit not found");
  }

  const report = (scan.report || {}) as Record<string, unknown>;
  const inbuiltAudit = report.inbuiltAdvancedAudit as
    InbuiltAdvancedAudit | undefined;

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
              Inbuilt advanced audit
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Scan date: {new Date(scan.created_at).toLocaleString()}
            </p>
          </div>

          <Link
            href={`/report/${scan.id}/advanced`}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            OWASP/ASVS-aligned mapping
          </Link>
        </div>

        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="font-black">Diagnostic module — not the overall score</p>
          <p className="mt-2 text-slate-600">
            Canonical customer score: {scan.score}/100 · {scan.risk_level}.
            The module score below is supporting passive evidence only, not a
            penetration test or certification.
          </p>
        </div>

        {inbuiltAudit ? (
          <InbuiltAuditPanel audit={inbuiltAudit} />
        ) : (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
            <h2 className="text-2xl font-black text-amber-950">
              Inbuilt audit not available for this old scan
            </h2>
            <p className="mt-3 leading-7 text-amber-900">
              Run a new scan or rescan this website. New scans will include the
              customer-ready inbuilt advanced audit automatically.
            </p>
            <Link
              href="/scan"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800"
            >
              Run new scan
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
