"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  extractFixTasksFromReport,
  type FixItemStatus,
} from "@/lib/customer-value";
import { createClient } from "@/lib/supabase/server";

const validStatuses: FixItemStatus[] = [
  "open",
  "in_progress",
  "fixed",
  "needs_review",
  "accepted_risk",
];

function safeStatus(value: FormDataEntryValue | null): FixItemStatus {
  const status = String(value || "open") as FixItemStatus;

  return validStatuses.includes(status) ? status : "open";
}

export async function createFixTasksForScan(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to create fix workflow");
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, report")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    redirect("/dashboard?message=Scan not found");
  }

  const tasks = extractFixTasksFromReport({
    report: (scan.report || {}) as Record<string, unknown>,
    userId: user.id,
    websiteId: scan.website_id || null,
    scanId: scan.id,
  });

  if (!tasks.length) {
    redirect(
      `/report/${scan.id}/customer-value?message=${encodeURIComponent(
        "No actionable fix items were found in this report.",
      )}`,
    );
  }

  if (scan.website_id) {
    const rows = tasks.map((task) => ({
      user_id: task.userId,
      website_id: task.websiteId,
      scan_id: task.scanId,
      first_seen_scan_id: task.scanId,
      last_seen_scan_id: task.scanId,
      fingerprint: task.fingerprint,
      title: task.title,
      category: task.category,
      severity: task.severity,
      source: task.source,
      status: task.status,
      evidence: task.evidence,
      customer_impact: task.customerImpact,
      developer_fix: task.developerFix,
      owner_action: task.ownerAction,
      proof_hint: task.proofHint,
      last_seen_at: new Date().toISOString(),
    }));

    await supabase.from("fix_items").upsert(rows, {
      onConflict: "user_id,website_id,fingerprint",
      ignoreDuplicates: false,
    });
  } else {
    const rows = tasks.map((task) => ({
      user_id: task.userId,
      website_id: null,
      scan_id: task.scanId,
      first_seen_scan_id: task.scanId,
      last_seen_scan_id: task.scanId,
      fingerprint: `${task.scanId}-${task.fingerprint}`,
      title: task.title,
      category: task.category,
      severity: task.severity,
      source: task.source,
      status: task.status,
      evidence: task.evidence,
      customer_impact: task.customerImpact,
      developer_fix: task.developerFix,
      owner_action: task.ownerAction,
      proof_hint: task.proofHint,
      last_seen_at: new Date().toISOString(),
    }));

    await supabase.from("fix_items").insert(rows);
  }

  revalidatePath(`/report/${scan.id}/customer-value`);
  redirect(
    `/report/${scan.id}/customer-value?message=${encodeURIComponent(
      "Fix workflow created from this report.",
    )}`,
  );
}

export async function updateFixItemStatus(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const itemId = String(formData.get("itemId") || "");
  const status = safeStatus(formData.get("status"));
  const notes = String(formData.get("notes") || "").trim();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to update fix status");
  }

  await supabase
    .from("fix_items")
    .update({
      status,
      notes: notes || null,
    })
    .eq("id", itemId)
    .eq("user_id", user.id);

  revalidatePath(`/report/${scanId}/customer-value`);
  redirect(`/report/${scanId}/customer-value?message=Fix item updated`);
}
