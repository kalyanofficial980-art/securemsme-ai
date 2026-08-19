import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")',
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://*.vercel.app https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com; frame-src https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
};

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
