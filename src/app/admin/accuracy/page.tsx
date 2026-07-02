import { redirect } from "next/navigation";
import { AccuracyFoundationPanel } from "@/components/AccuracyFoundationPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAccuracyPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login as admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    redirect("/dashboard?message=Admin access required");

  const { data: assessments } = await supabase
    .from("finding_accuracy_assessments")
    .select(
      "id, taxonomy_key, category, severity, accuracy_status, confidence_score, false_positive_risk, evidence_count, required_evidence_met, evidence_quality, accuracy_reason, client_safe_claim, blocked_claim, needs_expert_review, expert_review_status, validation_notes, created_at",
    )
    .or("needs_expert_review.eq.true,expert_review_status.eq.queued")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: metric } = await supabase
    .from("finding_accuracy_metrics")
    .select(
      "total_assessments, confirmed_count, high_confidence_count, potential_count, needs_review_count, false_positive_count, accepted_risk_count, confirmed_accuracy_target, estimated_confirmed_accuracy, false_positive_rate",
    )
    .order("metric_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <AccuracyFoundationPanel
          assessments={assessments || []}
          metric={metric}
          message={message}
          returnPath="/admin/accuracy"
          allowValidation
        />
      </section>
    </main>
  );
}
