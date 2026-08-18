"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getAuthRedirectUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();

  const baseUrl =
    configuredSiteUrl && !configuredSiteUrl.includes("localhost")
      ? configuredSiteUrl
      : vercelUrl
        ? vercelUrl.startsWith("http")
          ? vercelUrl
          : `https://${vercelUrl}`
        : "http://localhost:3000";

  return `${baseUrl.replace(/\/$/, "")}/login?message=${encodeURIComponent(
    "Email confirmed. Please login.",
  )}`;
}

export async function signUp(formData: FormData) {
  const fullName = getFormValue(formData, "fullName");
  const email = getFormValue(formData, "email");
  const password = getFormValue(formData, "password");

  if (!email || !password) {
    redirect("/signup?message=Email and password are required");
  }

  if (password.length < 6) {
    redirect("/signup?message=Password must be at least 6 characters");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    redirect(`/signup?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/login?message=Signup successful. Check your email to confirm your account.");
}

export async function signIn(formData: FormData) {
  const email = getFormValue(formData, "email");
  const password = getFormValue(formData, "password");

  if (!email || !password) {
    redirect("/login?message=Email and password are required");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login?message=Logged out successfully");
}
