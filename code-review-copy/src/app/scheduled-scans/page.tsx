import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ScheduledScansPanel } from "@/components/ScheduledScansPanel";
import { createClient } from "@/lib/supabase/server";

export default async function ScheduledScansPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; message?: string }>;
}) {
  const { target: selectedTargetId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to use scheduled scans");

  const { data: scans } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: prefs } = await supabase
    .from("email_alert_preferences_v2")
    .select(
      "alert_email, alert_status, send_scan_summary, send_high_risk_alerts, send_regression_alerts, send_billing_alerts, send_weekly_digest, quiet_hours_enabled, quiet_hours_start, quiet_hours_end",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: targets } = await supabase
    .from("scheduled_scan_targets_v2")
    .select(
      "id, target_url, target_name, schedule_status, schedule_frequency, next_run_at, last_run_at, email_alerts_enabled, risk_threshold",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const selectedTarget = selectedTargetId
    ? targets?.find((item: any) => item.id === selectedTargetId) || targets?.[0]
    : targets?.[0];

  const { data: runs } = selectedTarget?.id
    ? await supabase
        .from("scheduled_scan_runs_v2")
        .select(
          "id, run_status, risk_level, risk_score, summary, detected_change_summary, safe_next_action, email_should_send, email_reason, created_at",
        )
        .eq("schedule_target_id", selectedTarget.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const { data: alerts } = selectedTarget?.id
    ? await supabase
        .from("scheduled_scan_alerts_v2")
        .select(
          "id, alert_type, alert_status, severity, alert_title, client_safe_summary, developer_action, created_at",
        )
        .eq("schedule_target_id", selectedTarget.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const { data: emails } = selectedTarget?.id
    ? await supabase
        .from("email_alert_queue_v2")
        .select(
          "id, recipient_email, email_subject, email_type, delivery_status, created_at",
        )
        .eq("schedule_target_id", selectedTarget.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <ScheduledScansPanel
          scans={scans || []}
          targets={targets || []}
          selectedTarget={selectedTarget}
          runs={runs || []}
          alerts={alerts || []}
          emails={emails || []}
          prefs={prefs}
          message={message}
        />
      </section>
    </main>
  );
}
