"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getEffectivePlan,
  getPlanMonitoringTargetLimit,
  getPlanWebsiteLimit,
} from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";
import { getWebsiteNameFromUrl } from "@/lib/websites";

function normalizeUrl(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Website URL is required.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const url = new URL(withProtocol);
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function goNewWithError(message: string): never {
  redirect(`/websites/new?message=${encodeURIComponent(message)}`);
}

function planLabel(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export async function addWebsite(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(
      `/login?message=${encodeURIComponent(
        "Session expired. Please login again, then add website.",
      )}`,
    );
  }

  const rawName = String(formData.get("name") || "").trim();
  const rawUrl = String(formData.get("url") || "").trim();

  let normalizedUrl = "";

  try {
    normalizedUrl = normalizeUrl(rawUrl);
  } catch {
    goNewWithError("Invalid website URL. Example: https://example.com");
  }

  const name = rawName || getWebsiteNameFromUrl(normalizedUrl);

  const { data: existing, error: existingError } = await supabase
    .from("websites")
    .select("id")
    .eq("user_id", user.id)
    .eq("url", normalizedUrl)
    .maybeSingle();

  if (existingError) {
    goNewWithError(`Supabase check error: ${existingError.message}`);
  }

  if (existing?.id) {
    redirect(
      `/websites/${existing.id}?message=${encodeURIComponent(
        "Website already saved. Opened existing website.",
      )}`,
    );
  }

  const [{ data: profile, error: profileError }, { count, error: countError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("plan, plan_expires_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("websites")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  if (profileError || countError) {
    goNewWithError(
      profileError?.message || countError?.message || "Could not verify plan limit.",
    );
  }

  const plan = getEffectivePlan(profile);
  const websiteLimit = getPlanWebsiteLimit(plan);
  if ((count || 0) >= websiteLimit) {
    goNewWithError(
      `${planLabel(plan)} plan supports ${websiteLimit} saved website${websiteLimit === 1 ? "" : "s"}. Upgrade or remove a website before adding another.`,
    );
  }

  const { data: website, error: insertError } = await supabase
    .from("websites")
    .insert({
      user_id: user.id,
      name,
      url: normalizedUrl,
      website_url: normalizedUrl,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.message.includes("WEBSITE_PLAN_LIMIT_REACHED")) {
      goNewWithError(
        "Website limit reached for your current plan. Upgrade or remove a website before adding another.",
      );
    }
    if (insertError.message.includes("MONITORING_PLAN_LIMIT_REACHED")) {
      goNewWithError(
        "Monitoring target limit reached for your current plan. Disable monitoring on another website first.",
      );
    }
    goNewWithError(
      `Supabase insert error: ${insertError.message} | Code: ${
        insertError.code || "no-code"
      }`,
    );
  }

  if (!website?.id) {
    goNewWithError("Website insert completed but no website ID returned.");
  }

  revalidatePath("/websites");
  redirect(`/websites/${website.id}?message=Website saved successfully`);
}

export async function updateMonitoringSettings(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login again");
  }

  const websiteId = String(formData.get("websiteId") || "");
  const monitoringEnabled = formData.get("monitoringEnabled") === "on";
  const scanFrequency = String(formData.get("scanFrequency") || "weekly");

  const { data: currentWebsite, error: currentWebsiteError } = await supabase
    .from("websites")
    .select("id, monitoring_enabled")
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (currentWebsiteError || !currentWebsite?.id) {
    redirect(
      `/websites/${websiteId}?message=${encodeURIComponent(
        currentWebsiteError?.message || "Website not found.",
      )}`,
    );
  }

  if (monitoringEnabled && !currentWebsite.monitoring_enabled) {
    const [
      { data: profile, error: profileError },
      { count, error: countError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("plan, plan_expires_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("websites")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("monitoring_enabled", true)
        .neq("id", websiteId),
    ]);

    if (profileError || countError) {
      redirect(
        `/websites/${websiteId}?message=${encodeURIComponent(
          profileError?.message || countError?.message || "Could not verify monitoring limit.",
        )}`,
      );
    }

    const plan = getEffectivePlan(profile);
    const monitoringLimit = getPlanMonitoringTargetLimit(plan);
    if ((count || 0) >= monitoringLimit) {
      redirect(
        `/websites/${websiteId}?message=${encodeURIComponent(
          `${planLabel(plan)} plan supports monitoring for ${monitoringLimit} website${monitoringLimit === 1 ? "" : "s"}. Disable another target or upgrade first.`,
        )}`,
      );
    }
  }

  const { error: updateError } = await supabase
    .from("websites")
    .update({
      monitoring_enabled: monitoringEnabled,
      scan_frequency: scanFrequency,
    })
    .eq("id", websiteId)
    .eq("user_id", user.id);

  if (updateError) {
    const message = updateError.message.includes("MONITORING_PLAN_LIMIT_REACHED")
      ? "Monitoring target limit reached for your current plan. Disable another target or upgrade first."
      : updateError.message;
    redirect(`/websites/${websiteId}?message=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/websites/${websiteId}`);
}

export async function deleteWebsite(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login again");
  }

  const websiteId = String(formData.get("websiteId") || "");

  await supabase
    .from("websites")
    .delete()
    .eq("id", websiteId)
    .eq("user_id", user.id);

  revalidatePath("/websites");
  redirect("/websites?message=Website deleted");
}
