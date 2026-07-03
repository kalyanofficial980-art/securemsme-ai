import Link from "next/link";
import { redirect } from "next/navigation";
import { InternationalSecurityEnginePanel } from "@/components/InternationalSecurityEnginePanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function InternationalSecurityEnginePage({
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

  if (!user) redirect("/login?message=Please login to view security engine");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_id, website_url, created_at")
    .eq("id", id);

  if (profile?.role !== "admin") scanQuery = scanQuery.eq("user_id", user.id);

  const { data: scan } = await scanQuery.single();
  if (!scan) redirect("/dashboard?message=Security engine report not found");

  let verifiedScope = false;
  let targetUrl = scan.website_url;

  if (scan.website_id) {
    const { data: website } = await supabase
      .from("websites")
      .select(
        "id, user_id, url, verification_status, deep_scan_enabled, permission_attested_at",
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

  const { data: jobs } = await supabase
    .from("international_scan_jobs")
    .select(
      "id, target_url, status, intensity, verified_scope, app_classification, coverage_matrix, risk_summary, standards_summary, selected_modules, blocked_modules, coverage_score, evidence_count, vulnerability_count, high_priority_count, created_at",
    )
    .eq("source_scan_id", scan.id)
    .eq("user_id", scan.user_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const latestJobId = jobs?.[0]?.id;

  const { data: modules } = latestJobId
    ? await supabase
        .from("international_scan_job_modules")
        .select(
          "id, module_id, module_name, category, stage, status, required_scope, safe_methods, can_claim, cannot_claim",
        )
        .eq("job_id", latestJobId)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: evidence } = latestJobId
    ? await supabase
        .from("normalized_security_evidence")
        .select(
          "id, title, severity, confidence, false_positive_risk, affected_asset, asset_type, proof_type, evidence_summary, business_impact, developer_fix",
        )
        .eq("job_id", latestJobId)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const { data: vulnerabilities } = latestJobId
    ? await supabase
        .from("vulnerability_instances")
        .select(
          "id, title, category, severity, confidence, exploitability_score, business_impact_score, priority_score, lifecycle_status, business_impact, developer_fix, verification_guidance",
        )
        .eq("job_id", latestJobId)
        .eq("user_id", scan.user_id)
        .order("priority_score", { ascending: false })
        .limit(20)
    : { data: [] };

  const { data: events } = latestJobId
    ? await supabase
        .from("international_scan_job_events")
        .select("id, event_type, title, details, created_at")
        .eq("job_id", latestJobId)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/security-hub`}
              className="text-sm font-bold text-slate-600"
            >
              Back to customer report hub
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              International security engine
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">{targetUrl}</h1>
            <p className="mt-3 text-slate-600">
              Advanced backend core for job orchestration, module pipeline,
              normalized evidence, and vulnerability lifecycle.
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

        <InternationalSecurityEnginePanel
          scanId={scan.id}
          targetUrl={targetUrl}
          verifiedScope={verifiedScope}
          jobs={(jobs || []) as any}
          modules={(modules || []) as any}
          evidence={(evidence || []) as any}
          vulnerabilities={(vulnerabilities || []) as any}
          events={(events || []) as any}
          message={message}
        />
      </section>
    </main>
  );
}
