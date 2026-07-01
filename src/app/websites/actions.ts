"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNextScanDate } from "@/lib/monitoring";
import { getWebsiteNameFromUrl, normalizeWebsiteUrl } from "@/lib/websites";

export async function addWebsite(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to add website");

  const rawUrl = String(formData.get("url") || "");
  const rawName = String(formData.get("name") || "").trim();

  let url = "";

  try {
    url = normalizeWebsiteUrl(rawUrl);
  } catch {
    redirect("/websites/new?error=Please enter a valid public website URL");
  }

  const name = (rawName || getWebsiteNameFromUrl(url)).slice(0, 80);

  const { data: existingWebsite } = await supabase
    .from("websites")
    .select("id")
    .eq("user_id", user.id)
    .eq("url", url)
    .maybeSingle();

  if (existingWebsite?.id) redirect(`/websites/${existingWebsite.id}`);

  const { data: website, error } = await supabase
    .from("websites")
    .insert({
      user_id: user.id,
      url,
      name,
      monitoring_enabled: true,
      scan_frequency: "weekly",
      next_scan_at: getNextScanDate(new Date(), "weekly"),
    })
    .select("id")
    .single();

  if (error || !website) {
    redirect("/websites/new?error=Could not save website. Please try again.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/websites");
  redirect(`/websites/${website.id}`);
}

export async function updateMonitoringSettings(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login again");

  const websiteId = String(formData.get("websiteId") || "");
  const monitoringEnabled = formData.get("monitoringEnabled") === "on";
  const frequencyInput = String(formData.get("scanFrequency") || "weekly");

  const allowedFrequencies = ["daily", "weekly", "monthly", "manual"];
  const scanFrequency = allowedFrequencies.includes(frequencyInput)
    ? frequencyInput
    : "weekly";

  if (!websiteId) redirect("/websites");

  const nextScanAt = monitoringEnabled
    ? getNextScanDate(new Date(), scanFrequency)
    : null;

  await supabase
    .from("websites")
    .update({
      monitoring_enabled: monitoringEnabled,
      scan_frequency: scanFrequency,
      next_scan_at: nextScanAt,
    })
    .eq("id", websiteId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/websites");
  revalidatePath(`/websites/${websiteId}`);
  redirect(`/websites/${websiteId}`);
}

export async function deleteWebsite(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login again");

  const websiteId = String(formData.get("websiteId") || "");

  if (!websiteId) redirect("/websites");

  await supabase
    .from("websites")
    .delete()
    .eq("id", websiteId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/websites");
  redirect("/websites");
}
