"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  buildClientSafeDemoSummary,
  calculateLeadScore,
  isLikelyEmail,
  leadStatusFromScore,
  normalizePublicWebsiteUrl,
  pricingInterestReason,
  publicLaunchBlockedClaims,
  selectPlanForNeed,
  type PublicDemoInput,
  type PublicPlan,
} from "@/lib/public-launch-funnel-engine";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function checked(formData: FormData, key: string) {
  return clean(formData.get(key)) === "on";
}

export async function submitDemoRequestAction(formData: FormData) {
  const supabase = await createClient();

  const input: PublicDemoInput = {
    fullName: clean(formData.get("fullName")),
    workEmail: clean(formData.get("workEmail")).toLowerCase(),
    companyName: clean(formData.get("companyName")),
    websiteUrl: normalizePublicWebsiteUrl(clean(formData.get("websiteUrl"))),
    businessType: clean(formData.get("businessType"), "msme") as PublicDemoInput["businessType"],
    teamSize: clean(formData.get("teamSize"), "1-5") as PublicDemoInput["teamSize"],
    primaryNeed: clean(formData.get("primaryNeed"), "first-security-check") as PublicDemoInput["primaryNeed"],
    requestedPlan: clean(formData.get("requestedPlan"), "not-sure") as PublicDemoInput["requestedPlan"],
    urgency: clean(formData.get("urgency"), "this-month") as PublicDemoInput["urgency"],
  };

  const consent = checked(formData, "consentToContact");
  const noSensitiveData = checked(formData, "noSensitiveDataConfirmed");

  if (!input.fullName) redirect("/demo?message=Name is required.");
  if (!isLikelyEmail(input.workEmail)) redirect("/demo?message=Valid work email is required.");
  if (!consent) redirect("/demo?message=Please consent to contact.");
  if (!noSensitiveData) {
    redirect("/demo?message=Please confirm you are not sending secrets or payment data.");
  }

  const autoPlan = input.requestedPlan === "not-sure"
    ? selectPlanForNeed(input.primaryNeed, input.businessType)
    : input.requestedPlan;
  const scoredInput = { ...input, requestedPlan: autoPlan };
  const score = calculateLeadScore(scoredInput);
  const summary = buildClientSafeDemoSummary(scoredInput, score);
  const requestId = randomUUID();

  const { error } = await supabase.from("public_demo_requests_v2").insert({
    id: requestId,
    full_name: input.fullName,
    work_email: input.workEmail,
    company_name: input.companyName,
    website_url: input.websiteUrl,
    country: clean(formData.get("country"), "India"),
    business_type: input.businessType,
    team_size: input.teamSize,
    primary_need: input.primaryNeed,
    requested_plan: autoPlan,
    urgency: input.urgency,
    message: clean(formData.get("message")),
    lead_score: score,
    lead_status: leadStatusFromScore(score),
    consent_to_contact: true,
    no_sensitive_data_confirmed: true,
    client_safe_summary: summary,
    request_payload: {
      blockedClaims: publicLaunchBlockedClaims,
      publicDemoFunnel: true,
    },
  });

  if (error) {
    redirect(`/demo?message=${encodeURIComponent(error.message || "Could not submit demo request")}`);
  }

  await supabase.from("public_pricing_interests_v2").insert({
    demo_request_id: requestId,
    selected_plan: autoPlan,
    billing_preference: clean(formData.get("billingPreference"), "manual"),
    expected_usage: clean(formData.get("expectedUsage"), "single-website"),
    price_sensitivity: clean(formData.get("priceSensitivity"), "medium"),
    interest_status: "active",
    pricing_reason: pricingInterestReason(autoPlan, clean(formData.get("expectedUsage"), "single-website")),
    next_best_action: autoPlan === "enterprise-review"
      ? "Manual enterprise review"
      : "Follow up and guide user to onboarding.",
    interest_payload: { source: "demo-request" },
  });

  await supabase.from("public_demo_admin_events_v2").insert({
    demo_request_id: requestId,
    event_type: "request-created",
    severity: score >= 75 ? "High" : score >= 45 ? "Medium" : "Info",
    title: "Public demo request created",
    details: summary,
    metadata: { score, selectedPlan: autoPlan },
  });

  await supabase.from("public_landing_events_v2").insert({
    demo_request_id: requestId,
    event_type: "demo-request",
    source_path: "/demo",
    severity: "Info",
    event_title: "Demo request submitted",
    event_details: summary,
    event_payload: { selectedPlan: autoPlan },
  });

  redirect(`/demo/success?request=${requestId}&message=Demo request submitted successfully.`);
}

export async function submitPricingInterestAction(formData: FormData) {
  const supabase = await createClient();
  const selectedPlan = clean(formData.get("selectedPlan"), "starter") as PublicPlan;
  const expectedUsage = clean(formData.get("expectedUsage"), "single-website");

  const { error } = await supabase.from("public_pricing_interests_v2").insert({
    selected_plan: selectedPlan,
    billing_preference: clean(formData.get("billingPreference"), "manual"),
    expected_usage: expectedUsage,
    price_sensitivity: clean(formData.get("priceSensitivity"), "medium"),
    interest_status: "active",
    pricing_reason: pricingInterestReason(selectedPlan, expectedUsage),
    next_best_action: selectedPlan === "enterprise-review"
      ? "Contact support for manual review."
      : "Continue to demo request or onboarding.",
    interest_payload: { source: "pricing-page" },
  });

  if (error) redirect(`/pricing?message=${encodeURIComponent(error.message)}`);

  await supabase.from("public_landing_events_v2").insert({
    event_type: "pricing-interest",
    source_path: "/pricing",
    severity: "Info",
    event_title: "Pricing interest captured",
    event_details: `Interest captured for ${selectedPlan}.`,
    event_payload: { selectedPlan, expectedUsage },
  });

  redirect(`/demo?plan=${selectedPlan}&message=Pricing interest saved. Continue demo request.`);
}

export async function updateDemoRequestStatusAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const requestId = clean(formData.get("requestId"));
  const leadStatus = clean(formData.get("leadStatus"), "contacted");
  const adminNotes = clean(formData.get("adminNotes"));

  await supabase.from("public_demo_requests_v2").update({
    lead_status: leadStatus,
    admin_notes: adminNotes,
    updated_at: new Date().toISOString(),
  }).eq("id", requestId);

  await supabase.from("public_demo_admin_events_v2").insert({
    demo_request_id: requestId,
    user_id: user.id,
    event_type: "status-updated",
    severity: "Info",
    title: "Demo request status updated",
    details: `Lead status changed to ${leadStatus}.`,
    metadata: { adminNotes },
  });

  redirect("/admin/demo-funnel?message=Demo request updated.");
}
