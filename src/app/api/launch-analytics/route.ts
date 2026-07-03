import { NextRequest, NextResponse } from "next/server";
import { normalizeAnalyticsInput } from "@/lib/seo-launch-analytics-engine";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/security/request-guard";

export async function POST(request: NextRequest) {
  const rateLimited = enforceRateLimit(request, "launch-analytics", 60, 60_000);
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json().catch(() => ({}));
    const normalized = normalizeAnalyticsInput({
      eventType: body.eventType || "launch-event",
      sourcePath: body.sourcePath || request.nextUrl.pathname,
      targetPath: body.targetPath || "",
      campaignSource:
        body.campaignSource ||
        request.nextUrl.searchParams.get("utm_source") ||
        "",
      campaignMedium:
        body.campaignMedium ||
        request.nextUrl.searchParams.get("utm_medium") ||
        "",
      campaignName:
        body.campaignName ||
        request.nextUrl.searchParams.get("utm_campaign") ||
        "",
      referrerSafe: request.headers.get("referer") || "",
      deviceHint: body.deviceHint || "unknown",
      countryHint: body.countryHint || "",
    });

    const supabase = (await createClient()) as any;

    await supabase.from("launch_analytics_events_v2").insert({
      event_type: normalized.eventType,
      source_path: normalized.sourcePath,
      target_path: normalized.targetPath,
      campaign_source: normalized.campaignSource,
      campaign_medium: normalized.campaignMedium,
      campaign_name: normalized.campaignName,
      referrer_safe: normalized.referrerSafe,
      device_hint: normalized.deviceHint,
      country_hint: normalized.countryHint,
      privacy_mode: normalized.privacyMode,
      client_safe_summary: normalized.clientSafeSummary,
      event_payload: { api: true, noCookie: true },
    });

    return NextResponse.json({ ok: true, privacyMode: "no-cookie" });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
