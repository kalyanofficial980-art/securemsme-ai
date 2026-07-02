import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthenticatedCrawlerPanel } from "@/components/AuthenticatedCrawlerPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedCrawlerPage({
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
    redirect("/login?message=Please login to view authenticated crawler");

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
  if (!scan)
    redirect("/dashboard?message=Authenticated crawler report not found");

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
    .from("authenticated_crawler_runs")
    .select(
      "id, target_url, run_status, execution_mode, summary, authenticated_route_count, blocked_route_count, form_count, input_count, auth_signal_count, sensitive_route_count, private_evidence_block_count, high_risk_count, created_at",
    )
    .eq("source_scan_id", scan.id)
    .eq("user_id", scan.user_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const latestRunId = runs?.[0]?.id;

  const { data: observations } = latestRunId
    ? await supabase
        .from("authenticated_route_observations")
        .select(
          "id, url, path, method, status_code, content_type, title, route_type, auth_signal, sensitivity, forms_metadata, links_discovered, blocked_reason, private_body_stored",
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
              href={`/report/${scan.id}/graphql-risk`}
              className="text-sm font-bold text-slate-600"
            >
              Back to GraphQL risk analyzer
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Authenticated Session-Safe Crawler
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">{targetUrl}</h1>
            <p className="mt-3 text-slate-600">
              Approved allowed-path authenticated route inventory with private
              evidence protection.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/report/${scan.id}/authenticated-scan`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Auth request
            </Link>
            {scan.website_id ? (
              <Link
                href={`/websites/${scan.website_id}/verify`}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
              >
                Verification
              </Link>
            ) : null}
          </div>
        </div>

        <AuthenticatedCrawlerPanel
          scanId={scan.id}
          targetUrl={targetUrl}
          verifiedScope={verifiedScope}
          approvedRequest={approvedRequest}
          latestRequest={latestRequest}
          runs={runs || []}
          observations={observations || []}
          message={message}
        />
      </section>
    </main>
  );
}
