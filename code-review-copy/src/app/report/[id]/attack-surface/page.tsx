import Link from "next/link";
import { redirect } from "next/navigation";
import { AttackSurfacePanel } from "@/components/AttackSurfacePanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AttackSurfacePage({
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

  if (!user) redirect("/login?message=Please login to view attack surface");

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
  if (!scan) redirect("/dashboard?message=Attack surface report not found");

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
    .from("attack_surface_inventories")
    .select(
      "id, target_url, crawler_status, crawler_policy, summary, route_count, api_endpoint_count, form_count, input_count, script_count, parameter_count, js_route_count, blocked_count, risk_signal_count, created_at",
    )
    .eq("source_scan_id", scan.id)
    .eq("user_id", scan.user_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const latestInventoryId = inventories?.[0]?.id;

  const { data: items } = latestInventoryId
    ? await supabase
        .from("attack_surface_items")
        .select(
          "id, item_type, method, url, path, source_url, status_code, content_type, title, risk_signal, sensitivity, evidence_metadata",
        )
        .eq("inventory_id", latestInventoryId)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/security-engine`}
              className="text-sm font-bold text-slate-600"
            >
              Back to international security engine
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Advanced crawler + attack surface discovery
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">{targetUrl}</h1>
            <p className="mt-3 text-slate-600">
              Same-origin route, API, form, input, parameter, script and
              JavaScript route inventory.
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

        <AttackSurfacePanel
          scanId={scan.id}
          targetUrl={targetUrl}
          verifiedScope={verifiedScope}
          inventories={inventories || []}
          items={items || []}
          message={message}
        />
      </section>
    </main>
  );
}
