import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessControlPanel } from "@/components/AccessControlPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AccessControlPage({
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

  if (!user)
    redirect("/login?message=Please login to view access-control review");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_id, website_url")
    .eq("id", id);

  if (profile?.role !== "admin") scanQuery = scanQuery.eq("user_id", user.id);

  const { data: scan } = await scanQuery.single();
  if (!scan) redirect("/dashboard?message=Access-control report not found");

  let verifiedScope = false;
  let targetUrl = scan.website_url;

  if (scan.website_id) {
    const { data: website } = await supabase
      .from("websites")
      .select(
        "id, url, verification_status, deep_scan_enabled, permission_attested_at",
      )
      .eq("id", scan.website_id)
      .maybeSingle();

    targetUrl = website?.url || scan.website_url;
    verifiedScope = Boolean(
      website?.verification_status === "verified" &&
      website?.deep_scan_enabled &&
      website?.permission_attested_at,
    );
  }

  const { data: latestRequest } = scan.website_id
    ? await supabase
        .from("authenticated_scan_requests")
        .select(
          "id, admin_review_status, status, allowed_paths, blocked_paths, expires_at",
        )
        .eq("user_id", scan.user_id)
        .eq("website_id", scan.website_id)
        .eq("source_scan_id", scan.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const approvedRequest = Boolean(
    latestRequest &&
    (latestRequest.admin_review_status === "approved" ||
      latestRequest.status === "approved") &&
    (!latestRequest.expires_at ||
      new Date(latestRequest.expires_at).getTime() > Date.now()),
  );

  const { data: runs } = await supabase
    .from("access_control_review_runs")
    .select(
      "id, target_url, review_status, comparison_mode, summary, route_review_count, comparison_count, sensitive_route_signal_count, admin_route_signal_count, object_id_signal_count, unexpected_access_signal_count, blocked_route_count, private_evidence_block_count, high_risk_count, created_at",
    )
    .eq("source_scan_id", scan.id)
    .eq("user_id", scan.user_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const latestRunId = runs?.[0]?.id;

  const { data: comparisons } = latestRunId
    ? await supabase
        .from("access_control_route_comparisons")
        .select(
          "id, url, path, expected_access, low_role_status, high_role_status, comparison_result, risk_level, risk_signals, object_id_signals, route_sensitivity, private_body_stored",
        )
        .eq("run_id", latestRunId)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: false })
        .limit(150)
    : { data: [] };

  const { data: findings } = latestRunId
    ? await supabase
        .from("access_control_findings")
        .select(
          "id, category, title, severity, confidence, affected_url, observed_value, expected_value, risk_signals, evidence_summary, business_impact, developer_fix, safe_claim, blocked_claim",
        )
        .eq("run_id", latestRunId)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: false })
        .limit(150)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/authenticated-crawler`}
              className="text-sm font-bold text-slate-600"
            >
              Back to authenticated crawler
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Broken Access Control Signal Engine
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">{targetUrl}</h1>
            <p className="mt-3 text-slate-600">
              Metadata-only route, role-boundary and object authorization
              signals.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/report/${scan.id}/authenticated-crawler`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Auth crawler
            </Link>
            <Link
              href={`/report/${scan.id}/authenticated-scan`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Auth request
            </Link>
          </div>
        </div>

        <AccessControlPanel
          scanId={scan.id}
          targetUrl={targetUrl}
          verifiedScope={verifiedScope}
          approvedRequest={approvedRequest}
          latestRequest={latestRequest}
          runs={runs || []}
          comparisons={comparisons || []}
          findings={findings || []}
          message={message}
        />
      </section>
    </main>
  );
}
