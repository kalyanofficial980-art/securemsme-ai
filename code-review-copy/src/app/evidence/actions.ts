"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildEvidenceHash,
  createEvidenceDraftFromAccuracy,
  createEvidenceDraftFromEngineRun,
  createEvidenceDraftFromFinding,
  hashEvidence,
  inferEvidenceQuality,
  redactEvidence,
  type EvidenceDraft,
} from "@/lib/evidence-warehouse-v2";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function choice(value: string, allowed: string[], fallback: string) {
  return allowed.includes(value) ? value : fallback;
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to continue");
  return { supabase, user };
}

async function ensureProofChain(
  supabase: any,
  input: {
    userId: string;
    organizationId?: string | null;
    websiteId?: string | null;
    scanId: string;
    workspaceId?: string | null;
    targetUrl: string;
  },
) {
  const { data: existing } = await supabase
    .from("security_proof_chains")
    .select("id, latest_hash, total_evidence_items")
    .eq("user_id", input.userId)
    .eq("scan_id", input.scanId)
    .maybeSingle();

  if (existing?.id) return existing;

  const { data: chain, error } = await supabase
    .from("security_proof_chains")
    .insert({
      user_id: input.userId,
      organization_id: input.organizationId,
      website_id: input.websiteId,
      scan_id: input.scanId,
      workspace_id: input.workspaceId,
      chain_name: `Evidence Proof Chain for ${input.targetUrl}`,
      chain_status: "active",
      proof_summary: "Evidence proof chain created.",
      client_safe_summary: "Client-safe evidence will appear after sync.",
      technical_summary: "Technical evidence will appear after sync.",
    })
    .select("id, latest_hash, total_evidence_items")
    .single();

  if (error || !chain?.id) {
    throw new Error(error?.message || "Could not create proof chain");
  }

  await supabase.from("security_evidence_events").insert({
    proof_chain_id: chain.id,
    user_id: input.userId,
    organization_id: input.organizationId,
    scan_id: input.scanId,
    event_type: "warehouse-created",
    severity: "Info",
    title: "Evidence warehouse created",
    details: "Proof chain was created for this scan.",
    metadata: { targetUrl: input.targetUrl },
  });

  return chain;
}

async function insertEvidenceDrafts(
  supabase: any,
  input: {
    userId: string;
    organizationId?: string | null;
    websiteId?: string | null;
    scanId: string;
    workspaceId?: string | null;
    proofChainId: string;
    drafts: EvidenceDraft[];
  },
) {
  const { data: latest } = await supabase
    .from("security_evidence_items")
    .select("evidence_hash, chain_position")
    .eq("user_id", input.userId)
    .eq("scan_id", input.scanId)
    .order("chain_position", { ascending: false })
    .limit(1)
    .maybeSingle();

  let previousHash = latest?.evidence_hash || null;
  let position = (latest?.chain_position || 0) + 1;
  let inserted = 0;

  for (const draft of input.drafts) {
    const evidenceQuality =
      draft.evidenceQuality || inferEvidenceQuality(draft);
    const redacted = draft.redactedEvidence || redactEvidence(draft);
    const evidenceHash = buildEvidenceHash(
      { ...draft, evidenceQuality, redactedEvidence: redacted },
      previousHash,
    );

    const row = {
      user_id: input.userId,
      organization_id: input.organizationId,
      website_id: input.websiteId,
      scan_id: input.scanId,
      workspace_id: input.workspaceId,
      evidence_key: draft.evidenceKey,
      source_type: draft.sourceType,
      source_id: draft.sourceId || null,
      source_engine: draft.sourceEngine || null,
      evidence_type: draft.evidenceType,
      evidence_category: draft.evidenceCategory,
      title: draft.title,
      summary: draft.summary,
      affected_url: draft.affectedUrl || null,
      observed_value: draft.observedValue || null,
      expected_value: draft.expectedValue || null,
      proof_value: draft.proofValue || null,
      safe_claim: draft.safeClaim || "",
      blocked_claim: draft.blockedClaim || "",
      sensitivity_level: draft.sensitivityLevel || "client-safe",
      confidence_level: draft.confidenceLevel || "Medium",
      evidence_quality: evidenceQuality,
      validation_status: draft.validationStatus || "unvalidated",
      evidence_hash: evidenceHash,
      previous_hash: previousHash,
      chain_position: position,
      raw_evidence: draft.rawEvidence || {},
      redacted_evidence: redacted,
    };

    const { data: existing } = await supabase
      .from("security_evidence_items")
      .select("id")
      .eq("user_id", input.userId)
      .eq("scan_id", input.scanId)
      .eq("evidence_key", draft.evidenceKey)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("security_evidence_items")
        .update({
          summary: row.summary,
          observed_value: row.observed_value,
          expected_value: row.expected_value,
          proof_value: row.proof_value,
          safe_claim: row.safe_claim,
          blocked_claim: row.blocked_claim,
          sensitivity_level: row.sensitivity_level,
          confidence_level: row.confidence_level,
          evidence_quality: row.evidence_quality,
          validation_status: row.validation_status,
          raw_evidence: row.raw_evidence,
          redacted_evidence: row.redacted_evidence,
        })
        .eq("id", existing.id)
        .eq("user_id", input.userId);
    } else {
      const { data: insertedItem } = await supabase
        .from("security_evidence_items")
        .insert(row)
        .select("id")
        .single();

      if (insertedItem?.id && draft.sourceId) {
        const linkedType =
          draft.sourceType === "vulnerability-finding"
            ? "vulnerability_finding"
            : draft.sourceType === "accuracy-assessment"
              ? "accuracy_assessment"
              : draft.sourceType === "orchestrator-engine"
                ? "orchestrator_engine_run"
                : "manual_reference";

        await supabase.from("security_evidence_links").insert({
          evidence_item_id: insertedItem.id,
          user_id: input.userId,
          organization_id: input.organizationId,
          scan_id: input.scanId,
          linked_type: linkedType,
          linked_id: draft.sourceId,
          relationship: "supports",
          link_summary: `${draft.title} supports ${linkedType}.`,
        });
      }

      previousHash = evidenceHash;
      position += 1;
      inserted += 1;
    }
  }

  await supabase.rpc("recalculate_security_proof_chain", {
    p_chain_id: input.proofChainId,
  });

  return inserted;
}

export async function syncEvidenceWarehouseAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, organization_id, website_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: workspace } = await supabase
    .from("security_review_workspaces")
    .select("id")
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const chain = await ensureProofChain(supabase, {
    userId: user.id,
    organizationId: scan.organization_id,
    websiteId: scan.website_id,
    scanId: scan.id,
    workspaceId: workspace?.id || null,
    targetUrl: scan.website_url,
  });

  const drafts: EvidenceDraft[] = [];

  const { data: engineRuns } = await supabase
    .from("scan_orchestrator_engine_runs")
    .select(
      "id, engine_key, engine_name, engine_group, engine_type, run_status, evidence_summary, safe_summary, observations_count, findings_created_count, engine_result",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .order("run_order", { ascending: true })
    .limit(200);

  for (const engine of engineRuns || []) {
    drafts.push(
      createEvidenceDraftFromEngineRun({
        id: engine.id,
        engineKey: engine.engine_key,
        engineName: engine.engine_name,
        engineGroup: engine.engine_group,
        engineType: engine.engine_type,
        runStatus: engine.run_status,
        evidenceSummary: engine.evidence_summary,
        safeSummary: engine.safe_summary,
        observationsCount: engine.observations_count,
        findingsCreatedCount: engine.findings_created_count,
        engineResult: engine.engine_result,
        targetUrl: scan.website_url,
      }),
    );
  }

  const { data: findings } = await supabase
    .from("vulnerability_bug_findings")
    .select(
      "id, bug_key, title, severity, confidence, false_positive_risk, affected_url, evidence_type, evidence_summary, observed_value, expected_value, safe_claim, blocked_claim, raw_evidence",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .limit(300);

  for (const finding of findings || []) {
    drafts.push(
      createEvidenceDraftFromFinding({
        id: finding.id,
        bugKey: finding.bug_key,
        title: finding.title,
        severity: finding.severity,
        confidence: finding.confidence,
        falsePositiveRisk: finding.false_positive_risk,
        affectedUrl: finding.affected_url,
        evidenceType: finding.evidence_type,
        evidenceSummary: finding.evidence_summary,
        observedValue: finding.observed_value,
        expectedValue: finding.expected_value,
        safeClaim: finding.safe_claim,
        blockedClaim: finding.blocked_claim,
        rawEvidence: finding.raw_evidence,
      }),
    );
  }

  const { data: assessments } = await supabase
    .from("finding_accuracy_assessments")
    .select(
      "id, taxonomy_key, category, severity, accuracy_status, confidence_score, false_positive_risk, evidence_quality, accuracy_reason, client_safe_claim, blocked_claim",
    )
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .limit(300);

  for (const assessment of assessments || []) {
    drafts.push(
      createEvidenceDraftFromAccuracy({
        id: assessment.id,
        taxonomyKey: assessment.taxonomy_key,
        category: assessment.category,
        severity: assessment.severity,
        accuracyStatus: assessment.accuracy_status,
        confidenceScore: assessment.confidence_score,
        falsePositiveRisk: assessment.false_positive_risk,
        evidenceQuality: assessment.evidence_quality,
        accuracyReason: assessment.accuracy_reason,
        clientSafeClaim: assessment.client_safe_claim,
        blockedClaim: assessment.blocked_claim,
      }),
    );
  }

  if (!drafts.length) {
    redirect(
      `/report/${scan.id}/evidence-warehouse?message=${encodeURIComponent("No source evidence found. Run Scan Orchestrator, Vulnerability Scanner or Accuracy Foundation first.")}`,
    );
  }

  const inserted = await insertEvidenceDrafts(supabase, {
    userId: user.id,
    organizationId: scan.organization_id,
    websiteId: scan.website_id,
    scanId: scan.id,
    workspaceId: workspace?.id || null,
    proofChainId: chain.id,
    drafts,
  });

  await supabase.from("security_evidence_events").insert({
    proof_chain_id: chain.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    event_type: "evidence-synced",
    severity: "Info",
    title: "Evidence synced",
    details: `${inserted} new evidence item(s) added. ${drafts.length} source item(s) processed.`,
    metadata: { inserted, processed: drafts.length },
  });

  revalidatePath(`/report/${scan.id}/evidence-warehouse`);
  redirect(
    `/report/${scan.id}/evidence-warehouse?message=${encodeURIComponent(`${inserted} new evidence item(s) synced.`)}`,
  );
}

export async function validateEvidenceItemAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const evidenceItemId = clean(formData.get("evidenceItemId"));
  const validationStatus = choice(
    clean(formData.get("validationStatus"), "validated"),
    ["unvalidated", "validated", "needs-review", "rejected", "expired"],
    "validated",
  );
  const confidenceLevel = choice(
    clean(formData.get("confidenceLevel"), "High"),
    ["Confirmed", "High", "Medium", "Low", "Needs manual review"],
    "High",
  );

  const { data: item } = await supabase
    .from("security_evidence_items")
    .update({
      validation_status: validationStatus,
      confidence_level: confidenceLevel,
      validated_by: user.id,
      validated_at: new Date().toISOString(),
    })
    .eq("id", evidenceItemId)
    .eq("user_id", user.id)
    .select("id, scan_id")
    .single();

  if (!item)
    redirect(
      `/report/${scanId}/evidence-warehouse?message=Evidence item not found`,
    );

  const { data: chain } = await supabase
    .from("security_proof_chains")
    .select("id")
    .eq("scan_id", item.scan_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (chain?.id) {
    await supabase.rpc("recalculate_security_proof_chain", {
      p_chain_id: chain.id,
    });

    await supabase.from("security_evidence_events").insert({
      proof_chain_id: chain.id,
      evidence_item_id: item.id,
      user_id: user.id,
      scan_id: item.scan_id,
      event_type:
        validationStatus === "rejected"
          ? "evidence-rejected"
          : "evidence-validated",
      severity: validationStatus === "rejected" ? "Medium" : "Info",
      title: "Evidence validation updated",
      details: `Evidence marked ${validationStatus} with ${confidenceLevel} confidence.`,
      metadata: { validationStatus, confidenceLevel },
    });
  }

  revalidatePath(`/report/${scanId}/evidence-warehouse`);
  redirect(
    `/report/${scanId}/evidence-warehouse?message=${encodeURIComponent("Evidence validation updated.")}`,
  );
}

export async function createEvidenceSnapshotAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const scanId = clean(formData.get("scanId"));
  const snapshotType = choice(
    clean(formData.get("snapshotType"), "manual"),
    [
      "manual",
      "pre-report",
      "post-retest",
      "client-share",
      "monthly-monitoring",
    ],
    "manual",
  );

  const { data: chain } = await supabase
    .from("security_proof_chains")
    .select("*")
    .eq("scan_id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!chain)
    redirect(
      `/report/${scanId}/evidence-warehouse?message=Proof chain not found`,
    );

  const { data: items } = await supabase
    .from("security_evidence_items")
    .select(
      "id, evidence_key, evidence_hash, validation_status, evidence_quality, sensitivity_level, title, summary",
    )
    .eq("scan_id", scanId)
    .eq("user_id", user.id)
    .order("chain_position", { ascending: true })
    .limit(500);

  const payload = {
    chainId: chain.id,
    scanId,
    latestHash: chain.latest_hash,
    items: items || [],
    createdAt: new Date().toISOString(),
  };

  const snapshotHash = hashEvidence(payload);

  await supabase.from("security_evidence_snapshots").insert({
    proof_chain_id: chain.id,
    user_id: user.id,
    organization_id: chain.organization_id,
    scan_id: scanId,
    snapshot_name: `${snapshotType} evidence snapshot`,
    snapshot_type: snapshotType,
    snapshot_hash: snapshotHash,
    evidence_count: items?.length || 0,
    validated_count: (items || []).filter(
      (item: any) => item.validation_status === "validated",
    ).length,
    completeness_score: chain.completeness_score,
    snapshot_summary: `Snapshot created with ${items?.length || 0} evidence item(s), completeness ${chain.completeness_score}%.`,
    snapshot_payload: payload,
  });

  await supabase.from("security_evidence_events").insert({
    proof_chain_id: chain.id,
    user_id: user.id,
    organization_id: chain.organization_id,
    scan_id: scanId,
    event_type: "snapshot-created",
    severity: "Info",
    title: "Evidence snapshot created",
    details: `${snapshotType} snapshot hash ${snapshotHash.slice(0, 16)}... created.`,
    metadata: { snapshotType, snapshotHash },
  });

  revalidatePath(`/report/${scanId}/evidence-warehouse`);
  redirect(
    `/report/${scanId}/evidence-warehouse?message=${encodeURIComponent("Evidence snapshot created.")}`,
  );
}
