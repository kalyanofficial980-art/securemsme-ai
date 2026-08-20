"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPaymentCheckout } from "@/lib/billing/payment-checkout";
import { validateManualPaymentRequest } from "@/lib/launch-ready-legal-payment-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

async function ensureBillingProfile(supabase: any, userId: string) {
  const { data: existing } = await supabase
    .from("user_billing_profiles_v2")
    .select("id, plan_key")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.id) return existing;

  const { data: profile, error } = await supabase
    .from("user_billing_profiles_v2")
    .insert({
      user_id: userId,
      plan_key: "free",
      billing_status: "active",
      billing_summary: "Assisted billing profile created.",
      limit_summary: "Free access remains active until payment approval.",
      blocked_claims: [
        "Admin payment approval is required before paid limits activate.",
        "No payment secret is required or stored.",
      ],
    })
    .select("id, plan_key")
    .single();

  if (error || !profile?.id) throw new Error("Could not prepare billing profile.");
  return profile;
}

function paymentError(planKey: string, message: string): never {
  redirect(
    `/manual-billing?plan=${encodeURIComponent(planKey)}&message=${encodeURIComponent(message)}`,
  );
}

export async function submitPaymentVerificationAction(formData: FormData) {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to continue");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role === "admin") redirect("/admin");

  const requestedPlan = clean(formData.get("planKey"), "starter");
  const paymentMethod = clean(formData.get("paymentMethod"), "upi");
  const decision = validateManualPaymentRequest({
    planKey: requestedPlan as any,
    billingCycle: "monthly",
    paymentReference: clean(formData.get("paymentReference")),
    payerName: clean(formData.get("payerName")),
    payerEmail: clean(formData.get("payerEmail")),
    payerPhone: clean(formData.get("payerPhone")),
    paymentNote: clean(formData.get("paymentNote")),
  });

  if (!decision.valid) paymentError(requestedPlan, decision.errors.join(" "));
  if (paymentMethod !== "upi" && paymentMethod !== "bank-transfer") {
    paymentError(decision.plan.key, "Select an enabled payment method.");
  }

  const checkout = await getPaymentCheckout(decision.plan.key);
  if (!checkout?.configured) {
    paymentError(
      decision.plan.key,
      "Payments are temporarily unavailable until VeyraSec payment settings are configured.",
    );
  }
  if (checkout.amountInr !== decision.amountInr) {
    paymentError(decision.plan.key, "Payment amount configuration mismatch. Please try again later.");
  }
  if (paymentMethod === "upi" && !checkout.upiEnabled) {
    paymentError(decision.plan.key, "UPI is not currently enabled for VeyraSec payments.");
  }
  if (paymentMethod === "bank-transfer" && !checkout.bankEnabled) {
    paymentError(decision.plan.key, "Bank transfer is not currently enabled for VeyraSec payments.");
  }

  let billingProfile;
  try {
    billingProfile = await ensureBillingProfile(supabase, user.id);
  } catch (error) {
    paymentError(
      decision.plan.key,
      error instanceof Error ? error.message : "Could not prepare billing profile.",
    );
  }

  const { data: request, error } = await supabase
    .from("manual_payment_requests_v2")
    .insert({
      user_id: user.id,
      billing_profile_id: billingProfile.id,
      requested_plan_key: decision.plan.key,
      requested_plan_name: decision.plan.name,
      billing_cycle: "monthly",
      amount_inr: decision.amountInr,
      currency: "INR",
      payment_method: paymentMethod,
      payment_reference: clean(formData.get("paymentReference")),
      payer_name: clean(formData.get("payerName")),
      payer_email: clean(formData.get("payerEmail")),
      payer_phone: clean(formData.get("payerPhone")),
      payment_note: clean(formData.get("paymentNote")),
      request_status: "submitted_for_review",
      payment_instructions: decision.instructions,
      blocked_claims: decision.blockedClaims,
      request_payload: {
        manualApproval: true,
        selectedPaymentMethod: paymentMethod,
        paymentSettingsUpdatedAt: checkout.settingsUpdatedAt,
      },
    })
    .select("id")
    .single();

  if (error || !request?.id) {
    const duplicate = error?.message?.toLowerCase().includes("duplicate");
    paymentError(
      decision.plan.key,
      duplicate
        ? "That transaction reference was already submitted. Check your payment status instead."
        : error?.message || "Could not submit payment verification request.",
    );
  }

  await supabase.from("manual_payment_admin_events_v2").insert({
    payment_request_id: request.id,
    user_id: user.id,
    event_type: "payment-submitted",
    event_status: "info",
    title: "Payment submitted for verification",
    details: `${decision.plan.name} payment submitted for admin verification.`,
    metadata: {
      planKey: decision.plan.key,
      amountInr: decision.amountInr,
      paymentMethod,
    },
  });

  revalidatePath("/manual-billing");
  revalidatePath("/admin/manual-payments");
  redirect(
    `/manual-billing?plan=${decision.plan.key}&message=${encodeURIComponent(
      "Payment submitted. VeyraSec admin verification is required before the plan becomes active.",
    )}`,
  );
}
