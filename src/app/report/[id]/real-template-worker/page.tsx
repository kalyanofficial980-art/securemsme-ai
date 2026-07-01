import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { RealTemplateWorkerPanel } from "@/components/RealTemplateWorkerPanel";
import { createClient } from "@/lib/supabase/server";

type SavedRun = {
  id: string;
  intensity: string;
  status: string;
  total_modules: number;
  completed_modules: number;
  failed_modules: number;
  blocked_modules: number;
  result_summary?: Record<string, unknown> | null;
  created_at: string;
};

type SavedModule = {
  id: string;
  module_name: string;
  module_category: string;
  status: string;
  risk_level: string;
  evidence: string[];
  output_summary?: {
    customerName?: string;
    findings?: any[];
    observations?: any[];
    outputSummary?: Record<string, unknown>;
  } | null;
  safe_claim: string;
  blocked_claim: string;
  created_at: string;
};

export default async function RealTemplateWorkerPage({
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

  if (!user) {
    redirect("/login?message=Please login to view real safe templates");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_id, website_url, created_at")
    .eq("id", id);

  if (profile?.role !== "admin") {
    scanQuery = scanQuery.eq("user_id", user.id);
  }

  const { data: scan } = await scanQuery.single();

  if (!scan) {
    redirect("/dashboard?message=Real safe template report not found");
  }

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

  const { data: savedRuns } = scan.website_id
    ? await supabase
        .from("authorized_pentest_runs")
        .select(
          "id, intensity, status, total_modules, completed_modules, failed_modules, blocked_modules, result_summary, created_at",
        )
        .eq("website_id", scan.website_id)
        .eq("source_scan_id", scan.id)
        .eq("user_id", scan.user_id)
        .contains("allowed_modules", ["real-safe-template-worker"])
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  const latestRunId = savedRuns?.[0]?.id;

  const { data: savedModules } = latestRunId
    ? await supabase
        .from("authorized_pentest_module_results")
        .select(
          "id, module_name, module_category, status, risk_level, evidence, output_summary, safe_claim, blocked_claim, created_at",
        )
        .eq("run_id", latestRunId)
        .eq("module_id", "real-safe-template-worker")
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/real-modules`}
              className="text-sm font-bold text-slate-600"
            >
              Back to real security evidence
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Real safe template worker
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">{targetUrl}</h1>
            <p className="mt-3 text-slate-600">
              Safe path checks using real GET/HEAD response evidence.
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

        <RealTemplateWorkerPanel
          scanId={scan.id}
          targetUrl={targetUrl}
          verifiedScope={verifiedScope}
          savedRuns={(savedRuns || []) as SavedRun[]}
          savedModules={(savedModules || []) as SavedModule[]}
          message={message}
        />
      </section>
    </main>
  );
}
