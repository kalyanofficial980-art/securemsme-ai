"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildLaunchNotificationDraft,
  scorePublicFormRisk,
} from "@/lib/final-launch-ops-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

async function requireAdmin() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login as admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    redirect("/dashboard?message=Admin access required");

  return { supabase, user };
}

export async function updateLaunchChecklistItemAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const itemId = clean(formData.get("itemId"));
  const status = clean(formData.get("checkStatus"), "in-progress");

  await supabase
    .from("launch_final_checklist_items_v2")
    .update({
      check_status: status,
      owner_note: clean(formData.get("ownerNote")),
      evidence_url: clean(formData.get("evidenceUrl")),
    })
    .eq("id", itemId);

  await supabase.from("launch_ops_events_v2").insert({
    user_id: user.id,
    event_type: "checklist-updated",
    severity: "Info",
    title: "Launch checklist updated",
    details: `Checklist item updated to ${status}.`,
    metadata: { itemId, status },
  });

  revalidatePath("/admin/launch-ops");
  redirect("/admin/launch-ops?message=Checklist updated.");
}

export async function createBetaCustomerAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const email = clean(formData.get("email")).toLowerCase();
  if (!email || !email.includes("@"))
    redirect("/admin/launch-ops?message=Valid beta customer email required.");

  await supabase.from("launch_beta_customers_v2").insert({
    full_name: clean(formData.get("fullName")),
    email,
    company_name: clean(formData.get("companyName")),
    website_url: clean(formData.get("websiteUrl")),
    beta_status: clean(formData.get("betaStatus"), "invited"),
    beta_plan: clean(formData.get("betaPlan"), "starter"),
    onboarding_notes: clean(formData.get("onboardingNotes")),
    created_by: user.id,
    payload: { source: "admin-launch-ops" },
  });

  await supabase.from("launch_ops_events_v2").insert({
    user_id: user.id,
    event_type: "beta-customer-created",
    severity: "Info",
    title: "Beta customer created",
    details: `Beta customer created for ${email}.`,
    metadata: { email },
  });

  revalidatePath("/admin/launch-ops");
  redirect("/admin/launch-ops?message=Beta customer created.");
}

export async function queueLaunchNotificationAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const draft = buildLaunchNotificationDraft({
    toEmail: clean(formData.get("toEmail")),
    subject: clean(formData.get("subject")),
    body: clean(formData.get("body")),
  });

  if (!draft.toEmail || !draft.toEmail.includes("@"))
    redirect("/admin/launch-ops?message=Valid email required.");

  await supabase.from("launch_email_notification_jobs_v2").insert({
    source_type: clean(formData.get("sourceType"), "manual"),
    to_email: draft.toEmail,
    subject: draft.subject,
    body_preview: draft.bodyPreview,
    notification_status: draft.status,
    provider: "manual",
    safety_status: draft.safetyStatus,
    created_by: user.id,
    payload: { manualQueueOnly: true },
  });

  await supabase.from("launch_ops_events_v2").insert({
    user_id: user.id,
    event_type: "notification-drafted",
    severity: draft.safetyStatus === "needs-review" ? "Medium" : "Info",
    title: "Launch notification queued",
    details: `Manual notification queued for ${draft.toEmail}.`,
    metadata: { safetyStatus: draft.safetyStatus },
  });

  revalidatePath("/admin/launch-ops");
  redirect("/admin/launch-ops?message=Manual notification queued.");
}

export async function recordAbuseTestEventAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const risk = scorePublicFormRisk({
    email: clean(formData.get("email")),
    message: clean(formData.get("message")),
    honeypot: clean(formData.get("honeypot")),
  });

  await supabase.from("launch_rate_limit_events_v2").insert({
    source_path: clean(formData.get("sourcePath"), "/admin/abuse-protection"),
    event_type: "admin-test",
    risk_score: risk.riskScore,
    decision: risk.decision,
    reason: risk.reason,
    privacy_mode: "admin-test",
    payload: { adminTest: true },
  });

  revalidatePath("/admin/abuse-protection");
  redirect("/admin/abuse-protection?message=Abuse test event recorded.");
}
