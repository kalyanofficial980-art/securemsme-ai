"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWebsiteNameFromUrl, normalizeWebsiteUrl } from "@/lib/websites";

export async function addWebsite(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to add website");
  }

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

  if (existingWebsite?.id) {
    redirect(`/websites/${existingWebsite.id}`);
  }

  const { data: website, error } = await supabase
    .from("websites")
    .insert({
      user_id: user.id,
      url,
      name,
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

export async function deleteWebsite(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login again");
  }

  const websiteId = String(formData.get("websiteId") || "");

  if (!websiteId) {
    redirect("/websites");
  }

  await supabase
    .from("websites")
    .delete()
    .eq("id", websiteId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/websites");

  redirect("/websites");
}
