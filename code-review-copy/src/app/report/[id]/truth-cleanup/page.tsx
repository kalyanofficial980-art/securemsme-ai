import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportTruthCleanupPanel } from "@/components/ReportTruthCleanupPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function TruthCleanupPage({
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

  if (!user) redirect("/login?message=Please login to view report cleanup");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_id, website_url, score, risk_level")
    .eq("id", id);

  if (profile?.role !== "admin") scanQuery = scanQuery.eq("user_id", user.id);

  const { data: scan } = await scanQuery.single();
  if (!scan) redirect("/dashboard?message=Report cleanup not found");

  const { data: reviews } = await supabase
    .from("report_truth_reviews")
    .select(
      "id, website_url, engine_version, review_status, truth_score, fake_risk_level, generic_text_count, repeated_fix_count, missing_evidence_count, cleaned_fix_count, manual_review_count, review_summary, truth_warnings, customer_safe_claims, blocked_claims, created_at",
    )
    .eq("source_scan_id", scan.id)
    .eq("user_id", scan.user_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const latestReviewId = reviews?.[0]?.id;

  const { data: fixes } = latestReviewId
    ? await supabase
        .from("report_truth_fix_items")
        .select(
          "id, issue_key, category, title, severity, confidence, evidence_status, original_text, evidence_summary, why_it_matters, exact_developer_fix, validation_steps, safe_customer_wording, cannot_claim, source_module",
        )
        .eq("review_id", latestReviewId)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: true })
        .limit(200)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/scan-consistency`}
              className="text-sm font-bold text-slate-600"
            >
              Back to score explanation
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Report Truth Cleanup
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Reduce fake-looking generic report language with evidence-specific
              fixes and safe claims.
            </p>
          </div>

          <Link
            href={`/report/${scan.id}`}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Security report
          </Link>
        </div>

        <ReportTruthCleanupPanel
          scanId={scan.id}
          websiteUrl={scan.website_url}
          score={scan.score || 0}
          riskLevel={scan.risk_level || "Unknown risk"}
          reviews={reviews || []}
          fixes={fixes || []}
          message={message}
        />
      </section>
    </main>
  );
}
