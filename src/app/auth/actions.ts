"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeNextPath(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function withHttps(value: string) {
  return `${value.startsWith("http") ? "" : "https://"}${value}`.replace(/\/$/, "");
}

function getAuthBaseUrl() {
  const branchUrl = process.env.VERCEL_BRANCH_URL?.trim();
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim();

  if (branchUrl) return withHttps(branchUrl);
  if (configuredSiteUrl && !configuredSiteUrl.includes("localhost"))
    return configuredSiteUrl.replace(/\/$/, "");
  if (vercelUrl) return withHttps(vercelUrl);
  return "http://localhost:3000";
}

function getAuthRedirectUrl() {
  const message = encodeURIComponent("Email confirmed. Please login.");
  return `${getAuthBaseUrl()}/login?message=${message}`;
}

function friendlyAuthMessage(message: string, flow: "signup" | "login") {
  const normalized = message.toLowerCase();
  if (normalized.includes("rate limit") || normalized.includes("too many"))
    return "Too many authentication attempts. Please wait a few minutes and try again.";
  if (normalized.includes("email not confirmed"))
    return "Please confirm your email before logging in.";
  if (normalized.includes("invalid login credentials"))
    return "Email or password is incorrect.";
  if (normalized.includes("already registered") || normalized.includes("already exists"))
    return "An account with this email already exists. Try logging in instead.";
  if (normalized.includes("password"))
    return flow === "signup"
      ? "Please choose a stronger password with at least 8 characters."
      : "Unable to sign in with that password.";
  return flow === "signup"
    ? "We could not create your account right now. Please try again shortly."
    : "We could not sign you in right now. Please try again shortly.";
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const next = safeNextPath(getFormValue(formData, "next"));
  const callbackUrl = `${getAuthBaseUrl()}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });

  if (error || !data.url) {
    redirect(`/login?message=${encodeURIComponent("Google sign-in could not start. Please try again.")}&next=${encodeURIComponent(next)}`);
  }

  redirect(data.url);
}

export async function signUp(formData: FormData) {
  const fullName = getFormValue(formData, "fullName");
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");

  if (!email || !password) redirect("/signup?message=Email and password are required");
  if (password.length < 8) redirect("/signup?message=Password must be at least 8 characters");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: getAuthRedirectUrl() },
  });

  if (error) {
    redirect(`/signup?message=${encodeURIComponent(friendlyAuthMessage(error.message, "signup"))}`);
  }

  revalidatePath("/", "layout");
  if (data.session) redirect("/dashboard");
  redirect("/login?message=Account created. Check your email and confirm your address before logging in.");
}

export async function resendConfirmation(formData: FormData) {
  const email = getFormValue(formData, "email").toLowerCase();
  if (!email) redirect("/login?message=Enter your email to request a new confirmation link.");

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });

  if (error) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes("rate limit") || normalized.includes("too many"))
      redirect("/login?message=Confirmation email limit reached. Please wait a few minutes before trying again.");
  }

  redirect("/login?message=If that email has an unconfirmed account, a new confirmation email has been requested.");
}

export async function signIn(formData: FormData) {
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");
  if (!email || !password) redirect("/login?message=Email and password are required");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?message=${encodeURIComponent(friendlyAuthMessage(error.message, "login"))}`);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?message=Logged out successfully");
}
