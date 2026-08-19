"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isSupportEmail,
  priorityFromTopic,
  sanitizeSupportMessage,
  type SupportPriority,
  type SupportTopic,
} from "@/lib/support-lead-reply-engine";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function checked(formData: FormData, key: string) {
  return clean(formData.get(key)) === "on";
}

export async function submitSupportContactAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const fullName = clean(formData.get("fullName"));
  const email = clean(formData.get("email")).toLowerCase();
  const companyName = clean(formData.get("companyName"));
  const websiteUrl = clean(formData.get("websiteUrl"));
  const topic = clean(formData.get("topic"), "general") as SupportTopic;
  let priority = clean(formData.get("priority"), "normal") as SupportPriority;
  const message = sanitizeSupportMessage(clean(formData.get("message")));

  if (!fullName) redirect("/contact?message=Name is required.");
  if (!isSupportEmail(email)) redirect("/contact?message=Valid email is required.");
  if (!message || message.length < 10) redirect("/contact?message=Please add a short support message.");
  if (!checked(formData, "consentToContact")) redirect("/contact?message=Please consent to contact.");
  if (!checked(formData, "noSensitiveDataConfirmed")) {
    redirect("/contact?message=Please confirm you are not sending secrets or payment data.");
  }

  priority = priorityFromTopic(topic, priority);
  const context = [companyName, websiteUrl].filter(Boolean).join(" · ");
  const subject = `${topic}: ${fullName}${context ? ` · ${context}` : ""}`;
  const ticketId = randomUUID();

  const { error } = await supabase.from("support_requests_v2").insert({
    id: ticketId,
    user_id: user?.id ?? null,
    subject,
    request_type: topic,
    priority,
    request_status: "open",
    contact_email: email,
    message,
  });

  if (error) {
    redirect(`/contact?message=${encodeURIComponent(error.message || "Could not submit support ticket")}`);
  }

  redirect(`/support/success?ticket=${ticketId}&message=Support ticket submitted successfully.`);
}

export async function updateSupportTicketStatusAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const requestId = clean(formData.get("requestId"));
  const status = clean(formData.get("status"), "in_progress");
  const adminNote = clean(formData.get("adminNote"));

  if (!requestId) redirect("/admin/support-inbox?message=Support request ID is required.");

  const { error } = await supabase.rpc("admin_update_support_request_v2", {
    p_request_id: requestId,
    p_status: status,
    p_admin_note: adminNote || null,
  });

  if (error) {
    redirect(`/admin/support-inbox?message=${encodeURIComponent(error.message || "Could not update support request")}`);
  }

  revalidatePath("/admin/support-inbox");
  revalidatePath("/admin/audit-log");
  redirect("/admin/support-inbox?message=Support request updated.");
}
