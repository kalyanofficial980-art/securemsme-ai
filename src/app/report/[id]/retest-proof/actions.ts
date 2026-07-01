"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildRetestProofReport,
  type ModuleEvidenceRow,
  type ScanSnapshot,
} from "@/lib/retest-proof-engine";
import { createClient } from "@/lib/supabase/server";

type ScanRow = {
  id: string;
  user_id: string;
  website_id: string | null;
  website_url: string;
  score: number | null;
  risk_level?: string | null;
  report?: Record<string, unknown> | null;
  created_at: string;
};

async function getModuleRowsForScan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scanId: string,
  userId: string,
) {
  const { data: runs } = await supabase
    .from("authorized_pentest_runs")
    .select("id")
    .eq("source_scan_id", scanId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);

  const runIds = (runs || []).map((run) => run.id);

  if (!runIds.length) return { runIds, rows: [] as ModuleEvidenceRow[] };

  const { data: rows } = await supabase
    .from("authorized_pentest_module_results")
    .select(
      "id, module_id, module_name, module_category, status, evidence, output_summary, safe_claim, blocked_claim, created_at",
    )
    .in("run_id", runIds)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { runIds, rows: (rows || []) as ModuleEvidenceRow[] };
}

function toSnapshot(scan: ScanRow): ScanSnapshot {
  return {
    id: scan.id,
    websiteUrl: scan.website_url,
    score: scan.score,
    riskLevel: scan.risk_level || null,
    createdAt: scan.created_at,
    report: scan.report || {},
  };
}

export async function generateRetestProof(formData: FormData) {
  const afterScanId = String(formData.get("afterScanId") || "");
  const beforeScanId = String(formData.get("beforeScanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to generate retest proof");
  }

  if (!beforeScanId) {
    redirect(
      `/report/${afterScanId}/retest-proof?message=${encodeURIComponent(
        "Please choose a previous scan to compare.",
      )}`,
    );
  }

  const { data: afterScan } = await supabase
    .from("scans")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("id", afterScanId)
    .eq("user_id", user.id)
    .single();

  const { data: beforeScan } = await supabase
    .from("scans")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("id", beforeScanId)
    .eq("user_id", user.id)
    .single();

  if (!afterScan || !beforeScan) {
    redirect("/dashboard?message=Scan not found for retest proof");
  }

  const sameWebsite =
    (afterScan.website_id &&
      beforeScan.website_id &&
      afterScan.website_id === beforeScan.website_id) ||
    afterScan.website_url === beforeScan.website_url;

  if (!sameWebsite) {
    redirect(
      `/report/${afterScan.id}/retest-proof?message=${encodeURIComponent(
        "Before and after scans must belong to the same website.",
      )}`,
    );
  }

  const beforeModules = await getModuleRowsForScan(
    supabase,
    beforeScan.id,
    user.id,
  );
  const afterModules = await getModuleRowsForScan(
    supabase,
    afterScan.id,
    user.id,
  );

  const proof = buildRetestProofReport({
    websiteUrl: afterScan.website_url,
    beforeScan: toSnapshot(beforeScan as ScanRow),
    afterScan: toSnapshot(afterScan as ScanRow),
    beforeModuleRows: beforeModules.rows,
    afterModuleRows: afterModules.rows,
  });

  const { error } = await supabase.from("retest_proof_reports").insert({
    user_id: user.id,
    website_id: afterScan.website_id || beforeScan.website_id || null,
    before_scan_id: beforeScan.id,
    after_scan_id: afterScan.id,
    before_run_ids: beforeModules.runIds,
    after_run_ids: afterModules.runIds,
    proof_status: proof.proofStatus,
    score_before: proof.scoreBefore,
    score_after: proof.scoreAfter,
    score_change: proof.scoreChange,
    fixed_count: proof.fixedCount,
    improved_count: proof.improvedCount,
    still_open_count: proof.stillOpenCount,
    new_issue_count: proof.newIssueCount,
    high_priority_count: proof.highPriorityCount,
    evidence_diff: {
      fixedItems: proof.fixedItems,
      improvedItems: proof.improvedItems,
      stillOpenItems: proof.stillOpenItems,
      newIssues: proof.newIssues,
    },
    proof_summary: {
      version: proof.version,
      generatedAt: proof.generatedAt,
      websiteUrl: proof.websiteUrl,
      customerSummary: proof.customerSummary,
      proofStatements: proof.proofStatements,
      safeClaim: proof.safeClaim,
      blockedClaim: proof.blockedClaim,
    },
    developer_next_actions: proof.developerNextActions,
  });

  if (error) {
    redirect(
      `/report/${afterScan.id}/retest-proof?message=${encodeURIComponent(
        `Could not save retest proof: ${error.message}`,
      )}`,
    );
  }

  revalidatePath(`/report/${afterScan.id}/retest-proof`);
  redirect(
    `/report/${afterScan.id}/retest-proof?message=${encodeURIComponent(
      "Retest proof generated and saved.",
    )}`,
  );
}
