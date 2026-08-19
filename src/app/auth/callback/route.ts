import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function loginErrorUrl(request: Request, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("message", message);
  return url;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const providerError =
    requestUrl.searchParams.get("error_description") ||
    requestUrl.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      loginErrorUrl(
        request,
        "Google sign-in was not completed. Please try again.",
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      loginErrorUrl(request, "Google sign-in response was invalid. Please try again."),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      loginErrorUrl(request, "Google sign-in could not be completed. Please try again."),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
