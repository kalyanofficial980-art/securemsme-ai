"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  evaluateOnboarding,
  firstScanClientSummary,
  normalizeWebsiteUrl,
  onboardingBlockedClaims,
  type BusinessType,
  type PrimaryGoal,
  type SecurityMaturity,
} from "@/lib/customer-onboarding-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

function checked(formData: FormData, key: string) {
  return clean(formData.get(key)) === "on";
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to continue onboarding");
  return { supabase, user };
}

async function upsertSteps(
  supabase: any,
  userId: string,
  profileId: string,
  result: ReturnType<typeof evaluateOnboarding>,
) {
  await supabase.from("customer_onboarding_steps_v2").upsert(
    result.steps.map((step) => ({
      user_id: userId,
      profile_id: profileId,
      step_key: step.stepKey,
      step_title: step.stepTitle,
      step_status: step.stepStatus,
      step_order: step.stepOrder,
      step_summary: step.stepSummary,
      action_url: step.actionUrl,
      required_before_launch: step.requiredBeforeLaunch,
      step_payload: {},
    })),
    { onConflict: "user_id,step_key" },
  );
}

export async function saveCustomerOnboardingProfileAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const businessName = clean(formData.get("businessName"));
  if (!businessName) redirect("/onboarding?message=Business name is required.");

  const input = {
    businessName,
    businessType: clean(formData.get("businessType"), "msme") as BusinessType,
    teamSize: clean(formData.get("teamSize"), "1-5"),
    primaryGoal: clean(
      formData.get("primaryGoal"),
      "first-security-check",
    ) as PrimaryGoal,
    securityMaturity: clean(
      formData.get("securityMaturity"),
      "beginner",
    ) as SecurityMaturity,
    hasWebsiteConfirmed: false,
    legalAccepted: checked(formData, "legalAccepted"),
    billingStarted: checked(formData, "billingStarted"),
    firstScanReady: false,
  };

  const result = evaluateOnboarding(input);

  const { data: profile, error } = await supabase
    .from("customer_onboarding_profiles_v2")
    .upsert(
      {
        user_id: user.id,
        business_name: businessName,
        business_type: input.businessType,
        country: clean(formData.get("country"), "India"),
        industry: clean(formData.get("industry")),
        team_size: input.teamSize,
        primary_goal: input.primaryGoal,
        security_maturity: input.securityMaturity,
        onboarding_status: result.onboardingStatus,
        onboarding_progress: result.onboardingProgress,
        latest_recommended_plan: result.recommendedPlan,
        blocked_claims: onboardingBlockedClaims,
        profile_payload: { launchWizard: true },
      },
      { onConflict: "user_id" },
    )
    .select("id")
    .single();

  if (error || !profile?.id) {
    redirect(
      `/onboarding?message=${encodeURIComponent(error?.message || "Could not save onboarding profile")}`,
    );
  }

  await upsertSteps(supabase, user.id, profile.id, result);

  await supabase.from("customer_plan_recommendations_v2").insert({
    user_id: user.id,
    profile_id: profile.id,
    recommended_plan: result.recommendation.recommendedPlan,
    recommendation_score: result.recommendation.recommendationScore,
    recommendation_reason: result.recommendation.recommendationReason,
    included_features: result.recommendation.includedFeatures,
    next_best_action: result.recommendation.nextBestAction,
    billing_cta: result.recommendation.billingCta,
    recommendation_status: "active",
    recommendation_payload: { source: "onboarding-profile" },
  });

  await supabase.from("customer_onboarding_admin_events_v2").insert({
    user_id: user.id,
    profile_id: profile.id,
    event_type: "profile-updated",
    severity: "Info",
    title: "Onboarding profile saved",
    details: result.summary,
    metadata: { recommendedPlan: result.recommendedPlan },
  });

  revalidatePath("/onboarding");
  redirect(
    "/onboarding/first-scan?message=Business profile saved. Continue first scan setup.",
  );
}

export async function saveFirstScanFunnelAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();

  const websiteUrl = normalizeWebsiteUrl(clean(formData.get("websiteUrl")));
  const authorizationConfirmed = checked(formData, "authorizationConfirmed");
  const ownershipStatus = clean(
    formData.get("ownershipStatus"),
    "not-confirmed",
  );

  if (!websiteUrl)
    redirect("/onboarding/first-scan?message=Website URL is required.");
  if (!authorizationConfirmed)
    redirect(
      "/onboarding/first-scan?message=Authorization confirmation is required.",
    );

  const { data: profile } = await supabase
    .from("customer_onboarding_profiles_v2")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile?.id)
    redirect("/onboarding?message=Create business profile first.");

  const result = evaluateOnboarding({
    businessName: profile.business_name,
    businessType: profile.business_type,
    teamSize: profile.team_size,
    primaryGoal: profile.primary_goal,
    securityMaturity: profile.security_maturity,
    hasWebsiteConfirmed: true,
    legalAccepted: checked(formData, "legalAccepted"),
    billingStarted: checked(formData, "billingStarted"),
    firstScanReady: true,
  });

  const { data: funnel, error } = await supabase
    .from("customer_first_scan_funnels_v2")
    .insert({
      user_id: user.id,
      profile_id: profile.id,
      website_url: websiteUrl,
      ownership_status: ownershipStatus,
      authorization_confirmed: true,
      authorization_note: clean(formData.get("authorizationNote")),
      scan_goal: clean(formData.get("scanGoal"), "first-safe-check"),
      risk_tolerance: clean(formData.get("riskTolerance"), "safe"),
      funnel_status: "ready-to-scan",
      next_action:
        "Open dashboard and run an authorized safe scan for this website.",
      client_safe_summary: firstScanClientSummary(websiteUrl, ownershipStatus),
      funnel_payload: { guidedFirstScan: true },
    })
    .select("id")
    .single();

  if (error || !funnel?.id) {
    redirect(
      `/onboarding/first-scan?message=${encodeURIComponent(error?.message || "Could not save first scan funnel")}`,
    );
  }

  await supabase
    .from("customer_onboarding_profiles_v2")
    .update({
      onboarding_status: result.onboardingStatus,
      onboarding_progress: result.onboardingProgress,
      latest_recommended_plan: result.recommendedPlan,
    })
    .eq("id", profile.id)
    .eq("user_id", user.id);

  await upsertSteps(supabase, user.id, profile.id, result);

  await supabase.from("customer_onboarding_admin_events_v2").insert({
    user_id: user.id,
    profile_id: profile.id,
    funnel_id: funnel.id,
    event_type: "first-scan-ready",
    severity: "Info",
    title: "First scan funnel ready",
    details: `First safe scan funnel prepared for ${websiteUrl}.`,
    metadata: { websiteUrl, ownershipStatus },
  });

  revalidatePath("/onboarding");
  redirect(
    `/onboarding/success?funnel=${funnel.id}&message=First scan funnel is ready.`,
  );
}

export async function completeOnboardingAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const profileId = clean(formData.get("profileId"));

  await supabase
    .from("customer_onboarding_profiles_v2")
    .update({ onboarding_status: "completed", onboarding_progress: 100 })
    .eq("id", profileId)
    .eq("user_id", user.id);

  await supabase.from("customer_onboarding_admin_events_v2").insert({
    user_id: user.id,
    profile_id: profileId,
    event_type: "onboarding-completed",
    severity: "Info",
    title: "Onboarding completed",
    details: "Customer completed onboarding wizard.",
    metadata: {},
  });

  revalidatePath("/onboarding");
  redirect(
    "/dashboard?message=Onboarding completed. You can run your first authorized scan now.",
  );
}
