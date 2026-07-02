import { redirect } from "next/navigation";
import { AgencySocPanel } from "@/components/AgencySocPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AgencySocPage({
  searchParams,
}: {
  searchParams: Promise<{ snapshot?: string; message?: string }>;
}) {
  const { snapshot: selectedSnapshotId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to view Agency SOC");

  const { data: snapshots } = await supabase
    .from("agency_soc_snapshots_v2")
    .select(
      "id, total_client_count, active_monitoring_count, open_alert_count, critical_alert_count, high_alert_count, regression_count, verified_fixed_count, agency_health_score, agency_risk_score, agency_response_score, executive_summary, operations_summary, client_safe_summary, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const selectedSnapshot = selectedSnapshotId
    ? snapshots?.find((item: any) => item.id === selectedSnapshotId) ||
      snapshots?.[0]
    : snapshots?.[0];

  const { data: risks } = selectedSnapshot?.id
    ? await supabase
        .from("agency_soc_client_risks_v2")
        .select(
          "id, client_name, target_url, risk_level, risk_score, health_score, open_alert_count, regression_count, top_issue, recommended_action, client_safe_note",
        )
        .eq("snapshot_id", selectedSnapshot.id)
        .eq("user_id", user.id)
        .order("risk_score", { ascending: false })
        .limit(200)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <AgencySocPanel
          snapshots={snapshots || []}
          selectedSnapshot={selectedSnapshot}
          risks={risks || []}
          message={message}
        />
      </section>
    </main>
  );
}
