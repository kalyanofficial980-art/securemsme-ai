"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  allowedSectionsForAccessLevel,
  buildClientPortalSnapshot,
  buildPortalExpiry,
  type ClientPortalAccessLevel,
} from "@/lib/client-portal-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function accessLevel(
  value: FormDataEntryValue | null,
): ClientPortalAccessLevel {
  if (
    value === "summary-only" ||
    value === "monitoring-summary" ||
    value === "full-client"
  ) {
    return value;
  }

  return "report-hub";
}

function expiryDays(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 14;
  return Math.max(1, Math.min(90, Math.round(parsed)));
}

async function getUserScan(scanId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to manage client portal");

  const { data: scan } = await supabase
    .from("scans")
    .select(
      "id, user_id, organization_id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  return { supabase, user, scan };
}

export async function createClientPortalLinkAction(formData: FormData) {
  const scanId = clean(formData.get("scanId"));
  const { supabase, user, scan } = await getUserScan(scanId);
  const selectedAccessLevel = accessLevel(formData.get("accessLevel"));
  const token = randomBytes(32).toString("hex");
  const snapshot = buildClientPortalSnapshot(scan);
  const title = clean(
    formData.get("title"),
    `Security report for ${scan.website_url}`,
  );
  const clientName = clean(formData.get("clientName")) || null;
  const clientEmail = clean(formData.get("clientEmail")) || null;
  const expiresAt = buildPortalExpiry(
    expiryDays(formData.get("expiresInDays")),
  );

  const { data: link, error } = await supabase
    .from("client_portal_links")
    .insert({
      user_id: user.id,
      organization_id: scan.organization_id,
      website_id: scan.website_id,
      scan_id: scan.id,
      token,
      client_name: clientName,
      client_email: clientEmail,
      access_level: selectedAccessLevel,
      status: "active",
      expires_at: expiresAt,
      title,
      client_snapshot: snapshot,
      allowed_sections: allowedSectionsForAccessLevel(selectedAccessLevel),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !link?.id) {
    redirect(
      `/report/${scan.id}/client-portal?message=${encodeURIComponent(
        `Could not create client portal link: ${error?.message || "Unknown error"}`,
      )}`,
    );
  }

  await supabase.from("client_portal_access_events").insert({
    client_portal_link_id: link.id,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    event_type: "link-created",
    severity: "Info",
    title: "Client portal link created",
    details: `Shareable client portal link created for ${scan.website_url}.`,
    metadata: { accessLevel: selectedAccessLevel, expiresAt },
  });

  revalidatePath(`/report/${scan.id}/client-portal`);
  redirect(
    `/report/${scan.id}/client-portal?message=${encodeURIComponent(
      `Client portal link created. Token starts with ${token.slice(0, 8)}.`,
    )}`,
  );
}

export async function refreshClientPortalSnapshotAction(formData: FormData) {
  const scanId = clean(formData.get("scanId"));
  const linkId = clean(formData.get("linkId"));
  const { supabase, user, scan } = await getUserScan(scanId);
  const snapshot = buildClientPortalSnapshot(scan);

  await supabase
    .from("client_portal_links")
    .update({
      client_snapshot: snapshot,
      allowed_sections: allowedSectionsForAccessLevel("report-hub"),
    })
    .eq("id", linkId)
    .eq("user_id", user.id)
    .eq("scan_id", scan.id);

  await supabase.from("client_portal_access_events").insert({
    client_portal_link_id: linkId,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    event_type: "snapshot-refreshed",
    severity: "Info",
    title: "Client portal snapshot refreshed",
    details: `Client-safe snapshot was refreshed for ${scan.website_url}.`,
    metadata: {},
  });

  revalidatePath(`/report/${scan.id}/client-portal`);
  redirect(
    `/report/${scan.id}/client-portal?message=${encodeURIComponent("Client portal snapshot refreshed.")}`,
  );
}

export async function revokeClientPortalLinkAction(formData: FormData) {
  const scanId = clean(formData.get("scanId"));
  const linkId = clean(formData.get("linkId"));
  const { supabase, user, scan } = await getUserScan(scanId);

  await supabase
    .from("client_portal_links")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
    })
    .eq("id", linkId)
    .eq("user_id", user.id)
    .eq("scan_id", scan.id);

  await supabase.from("client_portal_access_events").insert({
    client_portal_link_id: linkId,
    user_id: user.id,
    organization_id: scan.organization_id,
    scan_id: scan.id,
    event_type: "link-revoked",
    severity: "Info",
    title: "Client portal link revoked",
    details: `Shareable client portal link was revoked for ${scan.website_url}.`,
    metadata: {},
  });

  revalidatePath(`/report/${scan.id}/client-portal`);
  redirect(
    `/report/${scan.id}/client-portal?message=${encodeURIComponent("Client portal link revoked.")}`,
  );
}
