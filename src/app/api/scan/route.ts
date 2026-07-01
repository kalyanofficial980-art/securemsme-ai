import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { scanWebsite } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";
import { getWebsiteNameFromUrl } from "@/lib/websites";

export const runtime = "nodejs";

const scanSchema = z.object({
  websiteUrl: z.string().min(3).max(300).optional(),
  websiteId: z.string().uuid().optional(),
});

const TEMP_DEV_FREE_SCAN_LIMIT = 20;

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

    let websiteUrl = parsed.data.websiteUrl;
    let savedWebsiteId: string | null = parsed.data.websiteId || null;

    if (savedWebsiteId) {
      const { data: savedWebsite } = await supabase
        .from("websites")
        .select("id, url")
        .eq("id", savedWebsiteId)
        .eq("user_id", user.id)
        .single();

      if (!savedWebsite?.url) {
        return NextResponse.json(
          { error: "Saved website was not found." },
          { status: 404 },
        );
      }

      websiteUrl = savedWebsite.url;
    }

    if (!websiteUrl) {
      return NextResponse.json(
        { error: "Please enter a website URL or select a saved website." },
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

    if (plan === "free" && scanCount >= TEMP_DEV_FREE_SCAN_LIMIT) {
      return NextResponse.json(
        {
          error:
            "Temporary free development limit reached. Razorpay paid limits will be added at the end.",
        },
        { status: 402 },
      );
    }

    const report = await scanWebsite(websiteUrl);
    const scoreResult = calculateScore(report);

    if (!savedWebsiteId) {
      const { data: existingWebsite } = await supabase
        .from("websites")
        .select("id")
        .eq("user_id", user.id)
        .eq("url", report.normalizedUrl)
        .maybeSingle();

      if (existingWebsite?.id) {
        savedWebsiteId = existingWebsite.id;
      } else {
        const { data: newWebsite } = await supabase
          .from("websites")
          .insert({
            user_id: user.id,
            url: report.normalizedUrl,
            name: getWebsiteNameFromUrl(report.normalizedUrl),
          })
          .select("id")
          .single();

        savedWebsiteId = newWebsite?.id || null;
      }
    }

    const fullReport = {
      ...report,
      findings: scoreResult.enhancedFindings,
      score: scoreResult.score,
      rawScore: scoreResult.rawScore,
      maxScore: scoreResult.maxScore,
      riskLevel: scoreResult.riskLevel,
      summary: scoreResult.summary,
      executiveSummary: scoreResult.executiveSummary,
      categoryScores: scoreResult.categoryScores,
      severityCounts: scoreResult.severityCounts,
      passedChecks: scoreResult.passedChecks,
      warningChecks: scoreResult.warningChecks,
      failedChecks: scoreResult.failedChecks,
      topFixes: scoreResult.topFixes,
    };

    const { data: scan, error: insertError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        website_id: savedWebsiteId,
        website_url: report.normalizedUrl,
        score: scoreResult.score,
        risk_level: scoreResult.riskLevel,
        report: fullReport,
      })
      .select(
        "id, website_id, website_url, score, risk_level, report, created_at",
      )
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
