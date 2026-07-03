import Link from "next/link";
import { redirect } from "next/navigation";
import { EvidenceWarehousePanel } from "@/components/EvidenceWarehousePanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ReportEvidenceWarehousePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to view evidence warehouse");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: proofChain } = await supabase
    .from("security_proof_chains")
    .select(
      "id, chain_name, chain_status, root_hash, latest_hash, total_evidence_items, validated_items, needs_review_items, rejected_items, strong_items, client_safe_items, technical_items, completeness_score, proof_summary, client_safe_summary, technical_summary, updated_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: evidenceItems } = await supabase
    .from("security_evidence_items")
    .select(
      "id, evidence_key, source_type, source_engine, evidence_type, evidence_category, title, summary, affected_url, observed_value, expected_value, proof_value, safe_claim, blocked_claim, sensitivity_level, confidence_level, evidence_quality, validation_status, evidence_hash, previous_hash, chain_position, created_at",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("chain_position", { ascending: true })
    .limit(300);

  const { data: snapshots } = proofChain?.id
    ? await supabase
        .from("security_evidence_snapshots")
        .select(
          "id, snapshot_name, snapshot_type, snapshot_hash, evidence_count, validated_count, completeness_score, snapshot_summary, created_at",
        )
        .eq("proof_chain_id", proofChain.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const { data: events } = proofChain?.id
    ? await supabase
        .from("security_evidence_events")
        .select("id, event_type, severity, title, details, created_at")
        .eq("proof_chain_id", proofChain.id)
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
            href="/evidence-warehouse"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Evidence info
          </Link>
        </div>

        <EvidenceWarehousePanel
          scanId={scan.id}
          targetUrl={scan.website_url}
          proofChain={proofChain}
          evidenceItems={evidenceItems || []}
          snapshots={snapshots || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
