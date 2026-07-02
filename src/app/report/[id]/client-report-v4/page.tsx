import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientReportV4Panel } from "@/components/ClientReportV4Panel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ReportClientReportV4Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ snapshot?: string; message?: string }>;
}) {
  const { id } = await params;
  const { snapshot: selectedSnapshotId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to view Client Report v4");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: snapshots } = await supabase
    .from("client_report_v4_snapshots")
    .select(
      "id, report_title, target_url, report_status, executive_score, report_readiness_score, business_risk_score, technical_risk_score, evidence_strength_score, confirmed_count, high_confidence_count, needs_manual_review_count, open_action_count, executive_summary, business_impact_summary, developer_summary, client_safe_summary, limitations_summary, created_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const selectedSnapshot = selectedSnapshotId
    ? snapshots?.find((item: any) => item.id === selectedSnapshotId) ||
      snapshots?.[0]
    : snapshots?.[0];

  const { data: sections } = selectedSnapshot?.id
    ? await supabase
        .from("client_report_v4_sections")
        .select(
          "id, section_title, section_type, visibility, confidence_level, risk_level, section_body, evidence_summary, action_summary, blocked_claim",
        )
        .eq("snapshot_id", selectedSnapshot.id)
        .eq("user_id", user.id)
        .order("display_order", { ascending: true })
        .limit(100)
    : { data: [] };

  const { data: metrics } = selectedSnapshot?.id
    ? await supabase
        .from("executive_security_metrics_v4")
        .select(
          "id, metric_label, metric_value, metric_status, explanation, evidence_reference",
        )
        .eq("snapshot_id", selectedSnapshot.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };

  const { data: events } = selectedSnapshot?.id
    ? await supabase
        .from("client_report_v4_events")
        .select("id, title, details, created_at")
        .eq("snapshot_id", selectedSnapshot.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

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
              Back to report
            </Link>
            <p className="mt-4 break-all text-sm font-bold text-slate-500">
              {scan.website_url}
            </p>
          </div>
          <Link
            href="/client-report-v4"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Report v4 info
          </Link>
        </div>
        <ClientReportV4Panel
          scanId={scan.id}
          targetUrl={scan.website_url}
          snapshots={snapshots || []}
          selectedSnapshot={selectedSnapshot}
          sections={sections || []}
          metrics={metrics || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
