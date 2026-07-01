import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { scanWebsite } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";

export const runtime = "nodejs";

const scanSchema = z.object({
  websiteUrl: z.string().min(3).max(300),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Please login before scanning a website." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = scanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid website URL." },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const { count } = await supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const plan = profile?.plan || "free";
    const scanCount = count || 0;

    if (plan === "free" && scanCount >= 1) {
      return NextResponse.json(
        {
          error:
            "Free plan allows 1 scan only. Upgrade to paid plan for more scans.",
        },
        { status: 402 },
      );
    }

    const report = await scanWebsite(parsed.data.websiteUrl);
    const scoreResult = calculateScore(report);

    const fullReport = {
      ...report,
      score: scoreResult.score,
      riskLevel: scoreResult.riskLevel,
      topFixes: scoreResult.topFixes,
    };

    const { data: scan, error: insertError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        website_url: report.normalizedUrl,
        score: scoreResult.score,
        risk_level: scoreResult.riskLevel,
        report: fullReport,
      })
      .select("id, website_url, score, risk_level, report, created_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Scan completed but could not save report." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      scan,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while scanning.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
