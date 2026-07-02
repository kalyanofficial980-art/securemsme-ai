"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  evaluateLegalAcceptance,
  evaluateScanAuthorization,
  validateManualPaymentRequest,
} from "@/lib/launch-ready-legal-payment-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to continue");
  return { supabase, user };
}

async function ensureBillingProfile(supabase: any, userId: string) {
  const { data: existing } = await supabase
    .from("user_billing_profiles_v2")
    .select("id, plan_key")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.id) return existing;

  const { data: profile } = await supabase
    .from("user_billing_profiles_v2")
    .insert({
      user_id: userId,
      plan_key: "free",
      billing_status: "active",
      billing_summary: "Manual billing profile created.",
      limit_summary: "Free Demo active until manual payment approval.",
      blocked_claims: [
        "Manual payment approval required for paid limits.",
        "No payment processor is connected.",
      ],
    })
    .select("id, plan_key")
    .single();
  return profile;
}

export async function acceptLegalDocumentsAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const decision = evaluateLegalAcceptance({
    hasAcceptedTerms: clean(formData.get("terms")) === "on",
    hasAcceptedPrivacy: clean(formData.get("privacy")) === "on",
    hasAcceptedAcceptableUse: clean(formData.get("acceptableUse")) === "on",
    hasAcceptedRefund: clean(formData.get("refund")) === "on",
    hasAcceptedDataProcessing: clean(formData.get("dataProcessing")) === "on",
    hasAcceptedDisclaimer: clean(formData.get("disclaimer")) === "on",
  });

  if (!decision.accepted)
    redirect(
      `/legal-acceptance?message=${encodeURIComponent(decision.message)}`,
    );

  await supabase.from("user_legal_acceptances_v2").upsert(
    {
      user_id: user.id,
      terms_version: "2026-01",
      privacy_version: "2026-01",
      acceptable_use_version: "2026-01",
      refund_version: "2026-01",
      data_processing_version: "2026-01",
      disclaimer_version: "2026-01",
      acceptance_status: "accepted",
      acceptance_source: "dashboard",
      accepted_at: new Date().toISOString(),
    },
    {
      onConflict:
        "user_id,terms_version,privacy_version,acceptable_use_version,refund_version,data_processing_version,disclaimer_version",
    },
  );

  await supabase.from("launch_ready_user_preferences_v2").upsert(
    {
      user_id: user.id,
      ui_mode: "launch-simple",
      show_internal_tools: false,
      show_admin_shortcuts: false,
      show_agency_tools: false,
      launch_packaging_status: "ready-clean-ui",
    },
    { onConflict: "user_id" },
  );

  revalidatePath("/launch-ready");
  redirect("/launch-ready?message=Legal documents accepted.");
}

export async function confirmScanAuthorizationAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const decision = evaluateScanAuthorization({
    targetUrl: clean(formData.get("targetUrl")),
    ownsOrHasPermission: clean(formData.get("ownsOrHasPermission")) === "on",
    safeChecksOnly: clean(formData.get("safeChecksOnly")) === "on",
    noUnauthorizedTesting:
      clean(formData.get("noUnauthorizedTesting")) === "on",
  });

  if (!decision.allowed)
    redirect(
      `/scan-authorization?message=${encodeURIComponent(decision.errors.join(" "))}`,
    );

  await supabase.from("website_scan_authorizations_v2").insert({
    user_id: user.id,
    target_url: decision.targetUrl,
    authorization_status: "confirmed",
    authorization_scope: "safe-public-checks",
    owner_confirmation: true,
    safe_checks_confirmation: true,
    no_unauthorized_testing_confirmation: true,
    confirmation_text: decision.confirmationText,
    evidence_note: clean(formData.get("evidenceNote")),
  });

  revalidatePath("/scan-authorization");
  redirect(
    `/dashboard?message=${encodeURIComponent("Scan authorization confirmed.")}`,
  );
}

export async function submitManualPaymentRequestAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const billingProfile = await ensureBillingProfile(supabase, user.id);
  const decision = validateManualPaymentRequest({
    planKey: clean(formData.get("planKey"), "starter") as any,
    billingCycle: clean(formData.get("billingCycle"), "monthly") as any,
    paymentReference: clean(formData.get("paymentReference")),
    payerName: clean(formData.get("payerName")),
    payerEmail: clean(formData.get("payerEmail")),
    payerPhone: clean(formData.get("payerPhone")),
    paymentNote: clean(formData.get("paymentNote")),
  });

  if (!decision.valid)
    redirect(
      `/manual-billing?message=${encodeURIComponent(decision.errors.join(" "))}`,
    );

  const { data: request, error } = await supabase
    .from("manual_payment_requests_v2")
    .insert({
      user_id: user.id,
      billing_profile_id: billingProfile.id,
      requested_plan_key: decision.plan.key,
      requested_plan_name: decision.plan.name,
      billing_cycle: clean(formData.get("billingCycle"), "monthly"),
      amount_inr: decision.amountInr,
      currency: "INR",
      payment_method: clean(formData.get("paymentMethod"), "upi"),
      payment_reference: clean(formData.get("paymentReference")),
      payer_name: clean(formData.get("payerName")),
      payer_email: clean(formData.get("payerEmail")),
      payer_phone: clean(formData.get("payerPhone")),
      payment_note: clean(formData.get("paymentNote")),
      request_status: "submitted_for_review",
      payment_instructions: decision.instructions,
      blocked_claims: decision.blockedClaims,
      request_payload: { manualApproval: true },
    })
    .select("id")
    .single();

  if (error || !request?.id)
    redirect(
      `/manual-billing?message=${encodeURIComponent(error?.message || "Could not submit payment request")}`,
    );

  await supabase.from("manual_payment_admin_events_v2").insert({
    payment_request_id: request.id,
    user_id: user.id,
    event_type: "payment-submitted",
    event_status: "info",
    title: "Manual payment submitted",
    details: `Manual payment request submitted for ${decision.plan.name}.`,
    metadata: { planKey: decision.plan.key, amountInr: decision.amountInr },
  });

  revalidatePath("/manual-billing");
  redirect(
    `/manual-billing?message=Payment request submitted for admin approval.`,
  );
}

export async function reviewManualPaymentAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const requestId = clean(formData.get("requestId"));
  const reviewDecision = clean(formData.get("decision"), "approved");
  const adminNote = clean(formData.get("adminNote"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    redirect("/dashboard?message=Admin access required");

  const { data: payment } = await supabase
    .from("manual_payment_requests_v2")
    .select(
      "id, user_id, billing_profile_id, requested_plan_key, requested_plan_name, billing_cycle",
    )
    .eq("id", requestId)
    .single();

  if (!payment?.id)
    redirect("/admin/manual-payments?message=Payment request not found");

  const approved = reviewDecision === "approved";
  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(
    expires.getMonth() + (payment.billing_cycle === "yearly" ? 12 : 1),
  );

  await supabase
    .from("manual_payment_requests_v2")
    .update({
      request_status: approved ? "approved" : "rejected",
      admin_review_note: adminNote,
      approved_by: approved ? user.id : null,
      approved_at: approved ? now.toISOString() : null,
      rejected_at: approved ? null : now.toISOString(),
      plan_activated_at: approved ? now.toISOString() : null,
      plan_expires_at: approved ? expires.toISOString() : null,
    })
    .eq("id", payment.id);

  if (approved && payment.billing_profile_id) {
    await supabase
      .from("user_billing_profiles_v2")
      .update({
        plan_key: payment.requested_plan_key,
        billing_status: "active",
        billing_cycle: payment.billing_cycle,
        current_period_start: now.toISOString(),
        current_period_end: expires.toISOString(),
        payment_provider: "manual",
        billing_summary: `Manual payment approved for ${payment.requested_plan_name}.`,
        limit_summary: "Paid plan activated by admin approval.",
      })
      .eq("id", payment.billing_profile_id);
  }

  await supabase.from("manual_payment_admin_events_v2").insert({
    payment_request_id: payment.id,
    user_id: payment.user_id,
    admin_user_id: user.id,
    event_type: approved ? "payment-approved" : "payment-rejected",
    event_status: approved ? "success" : "blocked",
    title: approved ? "Manual payment approved" : "Manual payment rejected",
    details:
      adminNote ||
      (approved ? "Plan activated manually." : "Payment request rejected."),
    metadata: { planKey: payment.requested_plan_key },
  });

  revalidatePath("/admin/manual-payments");
  redirect(
    `/admin/manual-payments?message=${approved ? "Payment approved and plan activated." : "Payment rejected."}`,
  );
}

export async function submitSupportRequestAction(formData: FormData) {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const subject = clean(formData.get("subject"));
  const message = clean(formData.get("message"));
  const contactEmail = clean(formData.get("contactEmail"));

  if (!subject || !message || !contactEmail)
    redirect("/support?message=Subject, email and message are required.");

  await supabase.from("support_requests_v2").insert({
    user_id: user?.id || null,
    subject,
    request_type: clean(formData.get("requestType"), "support"),
    priority: clean(formData.get("priority"), "Medium"),
    request_status: "open",
    contact_email: contactEmail,
    message,
  });

  revalidatePath("/support");
  redirect("/support?message=Support request submitted.");
}
