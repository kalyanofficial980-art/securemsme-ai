import Link from "next/link";
import { redirect } from "next/navigation";
import { ScanConsistencyPanel } from "@/components/ScanConsistencyPanel";
import { Navbar } from "@/components/Navbar";
import { normalizeRisk } from "@/lib/scan-consistency-engine";
import { createClient } from "@/lib/supabase/server";

export default async function ScanConsistencyPage({
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

  if (!user) redirect("/login?message=Please login to view score explanation");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, created_at",
    )
    .eq("id", id);

  if (profile?.role !== "admin") scanQuery = scanQuery.eq("user_id", user.id);

  const { data: scan } = await scanQuery.single();
  if (!scan) redirect("/dashboard?message=Score explanation report not found");

  const { data: reports } = await supabase
    .from("scan_consistency_reports")
    .select(
      "id, website_url, engine_version, current_score, previous_score, score_delta, current_risk, previous_risk, risk_transition, confidence_level, score_explanation, score_breakdown, delta_analysis, consistency_warnings, latest_scan_badge, customer_summary, created_at",
    )
    .eq("source_scan_id", scan.id)
    .eq("user_id", scan.user_id)
    .order("created_at", { ascending: false })
    .limit(10);

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
              Back to security report
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Scan Consistency + Score Explanation
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Explain why this score appears and how it compares with the
              previous scan.
            </p>
          </div>

          <Link
            href="/admin/scans"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Scan history
          </Link>
        </div>

        <ScanConsistencyPanel
          scanId={scan.id}
          websiteUrl={scan.website_url}
          currentScore={scan.score || 0}
          currentRisk={
            scan.risk_level || normalizeRisk(scan.risk_level, scan.score)
          }
          createdAt={scan.created_at}
          reports={reports || []}
          message={message}
        />
      </section>
    </main>
  );
}
