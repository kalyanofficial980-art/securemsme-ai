import Link from "next/link";
import { redirect } from "next/navigation";
import { GraphqlRiskPanel } from "@/components/GraphqlRiskPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function GraphqlRiskPage({
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

  if (!user) redirect("/login?message=Please login to view GraphQL risk");

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
  if (!scan) redirect("/dashboard?message=GraphQL risk report not found");

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

  const { data: inventories } = await supabase
    .from("graphql_security_inventories")
    .select(
      "id, target_url, analyzer_status, endpoint_observations, summary, endpoint_count, ide_signal_count, introspection_signal_count, auth_unknown_count, sensitive_keyword_count, mutation_signal_count, graphql_risk_signal_count, blocked_execution_count, graphql_risk_score, created_at",
    )
    .eq("source_scan_id", scan.id)
    .eq("user_id", scan.user_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const latestInventoryId = inventories?.[0]?.id;

  const { data: findings } = latestInventoryId
    ? await supabase
        .from("graphql_security_findings")
        .select(
          "id, category, title, severity, confidence, affected_url, observed_value, expected_value, risk_signals, api_top10_mapping, evidence_summary, business_impact, developer_fix, safe_claim, blocked_claim",
        )
        .eq("inventory_id", latestInventoryId)
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
              href={`/report/${scan.id}/browser-security`}
              className="text-sm font-bold text-slate-600"
            >
              Back to browser security analyzer
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              GraphQL Risk Analyzer
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">{targetUrl}</h1>
            <p className="mt-3 text-slate-600">
              GraphQL endpoint, IDE, introspection, mutation and sensitive
              schema signal analysis.
            </p>
          </div>

          {scan.website_id ? (
            <Link
              href={`/websites/${scan.website_id}/verify`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Verification settings
            </Link>
          ) : null}
        </div>

        <GraphqlRiskPanel
          scanId={scan.id}
          targetUrl={targetUrl}
          verifiedScope={verifiedScope}
          inventories={inventories || []}
          findings={findings || []}
          message={message}
        />
      </section>
    </main>
  );
}
