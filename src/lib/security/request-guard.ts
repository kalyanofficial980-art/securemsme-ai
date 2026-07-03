import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function enforceRateLimit(request: Request, scope: string, limit = 20, windowMs = 60_000) {
  const key = scope + ":" + getClientIp(request);
  const result = rateLimit(key, limit, windowMs);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Please wait and try again." },
    { status: 429 },
  );
}
