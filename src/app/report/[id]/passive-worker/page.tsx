import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { PassiveWorkerPanel } from "@/components/PassiveWorkerPanel";
import { runPassiveZapStyleWorker } from "@/lib/passive-zap-worker";
import { createClient } from "@/lib/supabase/server";

type SavedPassiveJob = {
  id: string;
  status: string;
  tool_mode: string;
  result_summary?: Record<string, unknown> | null;
  created_at: string;
};

export default async function PassiveWorkerPage({
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
    redirect("/login?message=Please login to view passive worker");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_id, website_url, report, created_at")
    .eq("id", id);

  if (profile?.role !== "admin") {
    scanQuery = scanQuery.eq("user_id", user.id);
  }

  const { data: scan } = await scanQuery.single();

  if (!scan) {
    redirect("/dashboard?message=Passive worker report not found");
  }

  let verifiedScope = false;

  if (scan.website_id) {
    const { data: website } = await supabase
      .from("websites")
      .select("verification_status, deep_scan_enabled, permission_attested_at")
      .eq("id", scan.website_id)
      .maybeSingle();

    verifiedScope = Boolean(
      website?.verification_status === "verified" &&
      website?.deep_scan_enabled &&
      website?.permission_attested_at,
    );
  }

  const workerReport = runPassiveZapStyleWorker({
    websiteUrl: scan.website_url,
    report: (scan.report || {}) as Record<string, unknown>,
    verifiedScope,
  });

  const { data: savedJobs } = await supabase
    .from("security_tool_jobs")
    .select("id, status, tool_mode, result_summary, created_at")
    .eq("scan_id", scan.id)
    .eq("user_id", scan.user_id)
    .eq("job_type", "passive-zap-worker")
    .order("created_at", { ascending: false })
    .limit(10);

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
              Back to normal report
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Passive ZAP-style worker
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Backend passive discovery and alert normalization without attacks
              or customer installation.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/report/${scan.id}/safe-templates`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Safe templates
            </Link>
            <Link
              href={`/report/${scan.id}/tool-runner`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Tool runner
            </Link>
          </div>
        </div>

        <PassiveWorkerPanel
          scanId={scan.id}
          report={workerReport}
          savedJobs={(savedJobs || []) as SavedPassiveJob[]}
          message={message}
        />
      </section>
    </main>
  );
}
