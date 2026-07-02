"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PentestIntensity } from "@/lib/authorized-pentest-engine";
import {
  buildAuthenticatedScanPlan,
  buildAuthenticatedSessionPlan,
  type AuthenticatedAuthMethod,
} from "@/lib/authenticated-scan-foundation";
import { createClient } from "@/lib/supabase/server";

function normalizeIntensity(
  value: FormDataEntryValue | null,
): PentestIntensity {
  if (value === "light" || value === "deep") return value;
  return "standard";
}

function normalizeAuthMethod(
  value: FormDataEntryValue | null,
): AuthenticatedAuthMethod {
  if (
    value === "staging-test-account" ||
    value === "magic-link-test-account" ||
    value === "future-sso"
  ) {
    return value;
  }

  return "test-account";
}

export async function requestAuthenticatedScan(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const loginUrl = String(formData.get("loginUrl") || "");
  const authMethod = normalizeAuthMethod(formData.get("authMethod"));
  const requestedIntensity = normalizeIntensity(
    formData.get("requestedIntensity"),
  );
  const testAccountRole = String(formData.get("testAccountRole") || "");
  const allowedPathsText = String(formData.get("allowedPaths") || "");
  const blockedPathsText = String(formData.get("blockedPaths") || "");
  const customerNotes = String(formData.get("customerNotes") || "");
  const permissionAccepted = formData.get("permissionAccepted") === "on";
  const lowPrivilegeAccepted = formData.get("lowPrivilegeAccepted") === "on";
  const noRealDataAccepted = formData.get("noRealDataAccepted") === "on";
  const noMutationAccepted = formData.get("noMutationAccepted") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to request authenticated scan");
  }

  if (
    !permissionAccepted ||
    !lowPrivilegeAccepted ||
    !noRealDataAccepted ||
    !noMutationAccepted
  ) {
    redirect(
      `/report/${scanId}/authenticated-scan?message=${encodeURIComponent(
        "Please accept all authenticated scan safety attestations.",
      )}`,
    );
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, website_url")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    redirect("/dashboard?message=Scan not found");
  }

  if (!scan.website_id) {
    redirect(
      `/report/${scan.id}/authenticated-scan?message=${encodeURIComponent(
        "Save this website first before requesting authenticated scan.",
      )}`,
    );
  }

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, user_id, url, verification_status, deep_scan_enabled, permission_attested_at",
    )
    .eq("id", scan.website_id)
    .eq("user_id", user.id)
    .single();

  const verifiedScope = Boolean(
    website?.verification_status === "verified" &&
    website?.deep_scan_enabled &&
    website?.permission_attested_at,
  );

  const plan = buildAuthenticatedScanPlan({
    targetUrl: website?.url || scan.website_url,
    loginUrl: loginUrl || website?.url || scan.website_url,
    authMethod,
    requestedIntensity,
    testAccountRole,
    allowedPathsText,
    blockedPathsText,
    verifiedScope,
  });

  if (!plan.canRequest) {
    redirect(
      `/report/${scan.id}/authenticated-scan?message=${encodeURIComponent(
        plan.blockedReason ||
          "Authenticated scan request blocked by safety policy.",
      )}`,
    );
  }

  const { data: request, error } = await supabase
    .from("authenticated_scan_requests")
    .insert({
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      target_url: plan.targetUrl,
      login_url: plan.loginUrl,
      auth_method: plan.authMethod,
      test_account_role: plan.testAccountRole,
      credential_handling_mode: plan.credentialHandlingMode,
      requested_intensity: plan.requestedIntensity,
      status: "admin-review",
      admin_review_status: "pending",
      scope_summary: plan.scopeSummary,
      allowed_paths: plan.allowedPaths,
      blocked_paths: plan.blockedPaths,
      blocked_actions: plan.blockedActions,
      safety_checklist: plan.safetyChecklist,
      customer_attestations: plan.customerAttestations,
      customer_notes: customerNotes || null,
      permission_attested_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !request?.id) {
    redirect(
      `/report/${scan.id}/authenticated-scan?message=${encodeURIComponent(
        `Could not create authenticated scan request: ${error?.message || "Unknown error"}`,
      )}`,
    );
  }

  await supabase.from("authenticated_scan_session_plans").insert(
    buildAuthenticatedSessionPlan({
      requestId: request.id,
      userId: user.id,
      websiteId: scan.website_id,
      plan,
    }),
  );

  revalidatePath(`/report/${scan.id}/authenticated-scan`);
  redirect(
    `/report/${scan.id}/authenticated-scan?message=${encodeURIComponent(
      "Authenticated scan request created. It is pending admin review before any login/session testing.",
    )}`,
  );
}
