import Link from "next/link";
import { redirect } from "next/navigation";
import { KnownRisksPanel } from "@/components/KnownRisksPanel";
import { Navbar } from "@/components/Navbar";
import { buildCveIntelligenceReport } from "@/lib/cve-intelligence";
import { createClient } from "@/lib/supabase/server";

type SavedRiskRecord = {
  id: string;
  technology_name: string;
  risk_title: string;
  severity: string;
  confidence: string;
  created_at: string;
};

export default async function KnownRisksPage({
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
    redirect("/login?message=Please login to view known risks");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_id, website_url, report, created_at")
    .eq("id", id);

  if (profile?.role !== "admin") {
    scanQuery = scanQuery.eq("user_id", user.id);
  }

  const { data: scan } = await scanQuery.single();

  if (!scan) {
    redirect("/dashboard?message=Known risk report not found");
  }

  const knownRiskReport = buildCveIntelligenceReport({
    websiteUrl: scan.website_url,
    report: (scan.report || {}) as Record<string, unknown>,
  });

  const { data: savedRecords } = await supabase
    .from("cve_insight_records")
    .select("id, technology_name, risk_title, severity, confidence, created_at")
    .eq("scan_id", scan.id)
    .eq("user_id", scan.user_id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/security-hub`}
              className="text-sm font-bold text-slate-600"
            >
              Back to customer report hub
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Known technology risks
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              CVE-aware technology review with safe claim controls.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/report/${scan.id}/customer-value`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Fix plan
            </Link>
            <Link
              href={`/report/${scan.id}/evidence-calibration`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Evidence confidence
            </Link>
          </div>
        </div>

        <KnownRisksPanel
          scanId={scan.id}
          report={knownRiskReport}
          savedRecords={(savedRecords || []) as SavedRiskRecord[]}
          message={message}
        />
      </section>
    </main>
  );
}
