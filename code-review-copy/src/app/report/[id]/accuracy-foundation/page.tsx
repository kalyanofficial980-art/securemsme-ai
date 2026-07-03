import Link from "next/link";
import { redirect } from "next/navigation";
import { AccuracyFoundationPanel } from "@/components/AccuracyFoundationPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ReportAccuracyFoundationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to view accuracy foundation");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, organization_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: assessments } = await supabase
    .from("finding_accuracy_assessments")
    .select(
      "id, taxonomy_key, category, severity, accuracy_status, confidence_score, false_positive_risk, evidence_count, required_evidence_met, evidence_quality, accuracy_reason, client_safe_claim, blocked_claim, needs_expert_review, expert_review_status, validation_notes, created_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("confidence_score", { ascending: false })
    .limit(200);

  const { data: metric } = await supabase
    .from("finding_accuracy_metrics")
    .select(
      "total_assessments, confirmed_count, high_confidence_count, potential_count, needs_review_count, false_positive_count, accepted_risk_count, confirmed_accuracy_target, estimated_confirmed_accuracy, false_positive_rate",
    )
    .eq("user_id", user.id)
    .order("metric_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8">
          <Link
            href={`/report/${scan.id}`}
            className="text-sm font-bold text-slate-600"
          >
            Back to report
          </Link>
          <p className="mt-4 break-all text-sm font-bold text-slate-500">
            {scan.website_url}
          </p>
        </div>

        <AccuracyFoundationPanel
          scanId={scan.id}
          assessments={assessments || []}
          metric={metric}
          message={message}
          returnPath={`/report/${scan.id}/accuracy-foundation`}
        />
      </section>
    </main>
  );
}
