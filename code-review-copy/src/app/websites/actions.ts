"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  await supabase
    .from("websites")
    .update({
      monitoring_enabled: monitoringEnabled,
      scan_frequency: scanFrequency,
    })
    .eq("id", websiteId)
    .eq("user_id", user.id);

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
