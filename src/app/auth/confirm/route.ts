import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(request: NextRequest, value: string | null) {
  if (!value) return "/dashboard";

  try {
    const target = new URL(value, request.nextUrl.origin);

    if (target.origin !== request.nextUrl.origin) {
      return "/dashboard";
    }

    return `${target.pathname}${target.search}`;
  } catch {
    return "/dashboard";
  }
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(request, request.nextUrl.searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL(
        "/login?message=This confirmation link is incomplete or invalid. Please request a new confirmation email.",
        request.url,
      ),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(
        "/login?message=This confirmation link has expired or was already used. Please request a new confirmation email.",
        request.url,
      ),
    );
  }

  const redirectTo = new URL(next, request.url);
  redirectTo.searchParams.set("message", "Email confirmed successfully.");
  return NextResponse.redirect(redirectTo);
}
