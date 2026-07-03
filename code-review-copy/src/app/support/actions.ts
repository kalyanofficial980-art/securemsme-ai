"use server";

import { redirect } from "next/navigation";
import {
  buildSafeReplyDraft,
  buildSupportSummary,
  isSupportEmail,
  normalizeSupportWebsiteUrl,
  priorityFromTopic,
  sanitizeSupportMessage,
  supportBlockedClaims,
  supportScore,
  type SupportInput,
  type SupportPriority,
  type SupportTopic,
} from "@/lib/support-lead-reply-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function checked(formData: FormData, key: string) {
  return clean(formData.get(key)) === "on";
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

export async function submitSupportContactAction(formData: FormData) {
  const supabase = (await createClient()) as any;
  const input: SupportInput = {
    fullName: clean(formData.get("fullName")),
    email: clean(formData.get("email")).toLowerCase(),
    companyName: clean(formData.get("companyName")),
    websiteUrl: normalizeSupportWebsiteUrl(clean(formData.get("websiteUrl"))),
    topic: clean(formData.get("topic"), "general") as SupportTopic,
    priority: clean(formData.get("priority"), "normal") as SupportPriority,
    message: sanitizeSupportMessage(clean(formData.get("message"))),
  };

  if (!input.fullName) redirect("/contact?message=Name is required.");
  if (!isSupportEmail(input.email))
    redirect("/contact?message=Valid email is required.");
  if (!input.message || input.message.length < 10)
    redirect("/contact?message=Please add a short support message.");
  if (!checked(formData, "consentToContact"))
    redirect("/contact?message=Please consent to contact.");
  if (!checked(formData, "noSensitiveDataConfirmed"))
    redirect(
      "/contact?message=Please confirm you are not sending secrets or payment data.",
    );

  input.priority = priorityFromTopic(input.topic, input.priority);
  const score = supportScore(input);
  const summary = buildSupportSummary(input, score);

  const { data: ticket, error } = await supabase
    .from("support_contact_tickets_v2")
    .insert({
      full_name: input.fullName,
      email: input.email,
      company_name: input.companyName,
      website_url: input.websiteUrl,
      topic: input.topic,
      priority: input.priority,
      message: input.message,
      ticket_status: "new",
      support_score: score,
      consent_to_contact: true,
      no_sensitive_data_confirmed: true,
      client_safe_summary: summary,
      ticket_payload: {
        blockedClaims: supportBlockedClaims,
        supportForm: true,
      },
    })
    .select("id")
    .single();

  if (error || !ticket?.id)
    redirect(
      `/contact?message=${encodeURIComponent(error?.message || "Could not submit support ticket")}`,
    );

  await supabase.from("support_contact_events_v2").insert({
    support_ticket_id: ticket.id,
    event_type: "ticket-created",
    severity:
      input.priority === "urgent-review"
        ? "High"
        : score >= 75
          ? "Medium"
          : "Info",
    title: "Support ticket created",
    details: summary,
    metadata: { topic: input.topic, priority: input.priority, score },
  });

  await supabase.from("support_email_queue_v2").insert({
    support_ticket_id: ticket.id,
    queue_type: "admin-notification",
    to_email: "support@securemsme.ai",
    subject: `New support ticket: ${input.topic}`,
    body_preview: summary.slice(0, 500),
    queue_status: "queued",
    provider: "manual",
    queued_payload: { manualNotification: true },
  });

  redirect(
    `/support/success?ticket=${ticket.id}&message=Support ticket submitted successfully.`,
  );
}

export async function updateSupportTicketStatusAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const ticketId = clean(formData.get("ticketId"));
  const ticketStatus = clean(formData.get("ticketStatus"), "triaged");
  const adminNotes = clean(formData.get("adminNotes"));

  await supabase
    .from("support_contact_tickets_v2")
    .update({ ticket_status: ticketStatus, admin_notes: adminNotes })
    .eq("id", ticketId);
  await supabase.from("support_contact_events_v2").insert({
    user_id: user.id,
    support_ticket_id: ticketId,
    event_type: "ticket-updated",
    severity: "Info",
    title: "Support ticket updated",
    details: `Ticket status changed to ${ticketStatus}.`,
    metadata: { adminNotes },
  });
  redirect("/admin/support-inbox?message=Support ticket updated.");
}

export async function createLeadReplyDraftAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const demoRequestId = clean(formData.get("demoRequestId"));
  const supportTicketId = clean(formData.get("supportTicketId"));
  const toEmail = clean(formData.get("toEmail")).toLowerCase();
  if (!isSupportEmail(toEmail))
    redirect("/admin/support-inbox?message=Valid recipient email required.");

  const replyType = clean(formData.get("replyType"), "support");
  const draft = buildSafeReplyDraft({
    fullName: clean(formData.get("fullName"), "there"),
    companyName: clean(formData.get("companyName"), "your business"),
    toEmail,
    topic: replyType as any,
    requestedPlan: clean(
      formData.get("requestedPlan"),
      "the suitable launch plan",
    ),
    primaryNeed: clean(formData.get("primaryNeed"), "security workflow"),
    websiteUrl: clean(formData.get("websiteUrl")),
  });

  const { data: reply, error } = await supabase
    .from("lead_reply_drafts_v2")
    .insert({
      user_id: user.id,
      demo_request_id: demoRequestId || null,
      support_ticket_id: supportTicketId || null,
      reply_type: replyType,
      to_email: toEmail,
      subject: draft.subject,
      body: draft.body,
      reply_status: "draft",
      safety_status: draft.safetyStatus,
      safety_notes: draft.safetyNotes,
      reply_payload: { generatedFromAdminInbox: true },
    })
    .select("id")
    .single();

  if (error || !reply?.id)
    redirect(
      `/admin/support-inbox?message=${encodeURIComponent(error?.message || "Could not create reply draft")}`,
    );

  if (supportTicketId)
    await supabase
      .from("support_contact_tickets_v2")
      .update({ ticket_status: "reply-drafted" })
      .eq("id", supportTicketId);

  await supabase.from("support_email_queue_v2").insert({
    reply_draft_id: reply.id,
    support_ticket_id: supportTicketId || null,
    demo_request_id: demoRequestId || null,
    queue_type:
      replyType === "demo-follow-up"
        ? "demo-follow-up"
        : replyType === "pricing-follow-up"
          ? "pricing-follow-up"
          : "support-reply",
    to_email: toEmail,
    subject: draft.subject,
    body_preview: draft.body.slice(0, 700),
    queue_status: "ready-for-manual-send",
    provider: "manual",
    queued_by: user.id,
    queued_payload: { safetyStatus: draft.safetyStatus },
  });

  await supabase.from("support_contact_events_v2").insert({
    user_id: user.id,
    support_ticket_id: supportTicketId || null,
    reply_draft_id: reply.id,
    demo_request_id: demoRequestId || null,
    event_type: "reply-drafted",
    severity: "Info",
    title: "Safe reply draft created",
    details: `Reply draft created for ${toEmail}.`,
    metadata: { replyType, safetyStatus: draft.safetyStatus },
  });

  redirect("/admin/support-inbox?message=Safe reply draft created.");
}

export async function markReplySentManualAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const replyDraftId = clean(formData.get("replyDraftId"));
  await supabase
    .from("lead_reply_drafts_v2")
    .update({ reply_status: "sent-manual" })
    .eq("id", replyDraftId);
  await supabase
    .from("support_email_queue_v2")
    .update({ queue_status: "sent-manual", provider: "manual" })
    .eq("reply_draft_id", replyDraftId);
  await supabase.from("support_contact_events_v2").insert({
    user_id: user.id,
    reply_draft_id: replyDraftId,
    event_type: "manual-send-marked",
    severity: "Info",
    title: "Reply marked manually sent",
    details: "Admin marked a safe reply draft as manually sent.",
    metadata: {},
  });
  redirect("/admin/support-inbox?message=Reply marked as manually sent.");
}
