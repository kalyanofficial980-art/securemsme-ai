import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ProductionLaunchPanel } from "@/components/ProductionLaunchPanel";
import { createClient } from "@/lib/supabase/server";

export default async function ProductionLaunchPage({
  searchParams,
}: {
  searchParams: Promise<{
    benchmark?: string;
    snapshot?: string;
    message?: string;
  }>;
}) {
  const {
    benchmark: selectedBenchmarkId,
    snapshot: selectedSnapshotId,
    message,
  } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to view production launch dashboard");

  const { data: scans } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: benchmarks } = await supabase
    .from("accuracy_benchmark_runs_v2")
    .select(
      "id, total_case_count, passed_case_count, failed_case_count, warning_case_count, manual_review_count, accuracy_score, evidence_score, false_positive_control_score, claim_safety_score, benchmark_confidence_score, executive_summary, developer_summary, client_safe_summary, limitations_summary, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const selectedBenchmark = selectedBenchmarkId
    ? benchmarks?.find((item: any) => item.id === selectedBenchmarkId) ||
      benchmarks?.[0]
    : benchmarks?.[0];

  const { data: benchmarkCases } = selectedBenchmark?.id
    ? await supabase
        .from("accuracy_benchmark_cases_v2")
        .select(
          "id, case_title, case_category, case_status, severity, expected_result, actual_result, evidence_summary, remediation_action, client_safe_note, blocked_claim, case_score",
        )
        .eq("benchmark_run_id", selectedBenchmark.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };

  const { data: checks } = await supabase
    .from("production_launch_checks_v2")
    .select(
      "id, check_key, check_title, check_group, check_status, severity, owner_note, evidence_summary, required_action, client_safe_note, blocker_reason",
    )
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  const { data: snapshots } = await supabase
    .from("production_launch_snapshots_v2")
    .select(
      "id, snapshot_status, total_check_count, passed_check_count, warning_check_count, failed_check_count, blocked_check_count, launch_readiness_score, security_hardening_score, operational_readiness_score, quality_confidence_score, customer_trust_score, executive_summary, launch_blocker_summary, hardening_summary, final_recommendation, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const selectedSnapshot = selectedSnapshotId
    ? snapshots?.find((item: any) => item.id === selectedSnapshotId) ||
      snapshots?.[0]
    : snapshots?.[0];

  const { data: releaseNotes } = selectedSnapshot?.id
    ? await supabase
        .from("production_release_notes_v2")
        .select("id, note_type, note_title, note_body, severity")
        .eq("snapshot_id", selectedSnapshot.id)
        .eq("user_id", user.id)
        .order("display_order", { ascending: true })
        .limit(50)
    : { data: [] };

  const { data: events } = await supabase
    .from("launch_hardening_events_v2")
    .select("id, title, details, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <ProductionLaunchPanel
          scans={scans || []}
          benchmarks={benchmarks || []}
          selectedBenchmark={selectedBenchmark}
          benchmarkCases={benchmarkCases || []}
          checks={checks || []}
          snapshots={snapshots || []}
          selectedSnapshot={selectedSnapshot}
          releaseNotes={releaseNotes || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
