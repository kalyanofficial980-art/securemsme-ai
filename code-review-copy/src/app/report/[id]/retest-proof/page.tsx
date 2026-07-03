import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { RetestProofPanel } from "@/components/RetestProofPanel";
import { createClient } from "@/lib/supabase/server";

type ScanOption = {
  id: string;
  website_url: string;
  score: number | null;
  risk_level?: string | null;
  created_at: string;
};

type ProofReportRow = {
  id: string;
  proof_status: string;
  score_before: number | null;
  score_after: number | null;
  score_change: number;
  fixed_count: number;
  improved_count: number;
  still_open_count: number;
  new_issue_count: number;
  high_priority_count: number;
  evidence_diff?: {
    fixedItems?: Array<any>;
    improvedItems?: Array<any>;
    stillOpenItems?: Array<any>;
    newIssues?: Array<any>;
  } | null;
  proof_summary?: {
    customerSummary?: string;
    proofStatements?: string[];
    safeClaim?: string;
    blockedClaim?: string;
  } | null;
  developer_next_actions?: string[] | null;
  created_at: string;
};

export default async function RetestProofPage({
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
    redirect("/login?message=Please login to view retest proof");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, created_at",
    )
    .eq("id", id);

  if (profile?.role !== "admin") {
    scanQuery = scanQuery.eq("user_id", user.id);
  }

  const { data: currentScan } = await scanQuery.single();

  if (!currentScan) {
    redirect("/dashboard?message=Retest proof report not found");
  }

  let previousQuery = supabase
    .from("scans")
    .select("id, website_url, score, risk_level, created_at")
    .eq("user_id", currentScan.user_id)
    .neq("id", currentScan.id)
    .lt("created_at", currentScan.created_at)
    .order("created_at", { ascending: false })
    .limit(20);

  if (currentScan.website_id) {
    previousQuery = previousQuery.eq("website_id", currentScan.website_id);
  } else {
    previousQuery = previousQuery.eq("website_url", currentScan.website_url);
  }

  const { data: previousScans } = await previousQuery;

  const { data: proofReports } = await supabase
    .from("retest_proof_reports")
    .select(
      "id, proof_status, score_before, score_after, score_change, fixed_count, improved_count, still_open_count, new_issue_count, high_priority_count, evidence_diff, proof_summary, developer_next_actions, created_at",
    )
    .eq("after_scan_id", currentScan.id)
    .eq("user_id", currentScan.user_id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${currentScan.id}/security-hub`}
              className="text-sm font-bold text-slate-600"
            >
              Back to customer report hub
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Retest proof automation
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {currentScan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Compare previous scan evidence with this retest and create
              before/after proof.
            </p>
          </div>

          <Link
            href={`/report/${currentScan.id}/customer-value`}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Fix plan
          </Link>
        </div>

        <RetestProofPanel
          afterScanId={currentScan.id}
          currentScan={currentScan as ScanOption}
          previousScans={(previousScans || []) as ScanOption[]}
          proofReports={(proofReports || []) as ProofReportRow[]}
          message={message}
        />
      </section>
    </main>
  );
}
