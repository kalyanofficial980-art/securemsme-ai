import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNextScanDate } from "@/lib/monitoring";
import { scanWebsite } from "@/lib/scanner";
import { calculateScore } from "@/lib/score";

export const runtime = "nodejs";

const TEMP_DEV_FREE_SCAN_LIMIT = 999;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Please login before rescanning a website." },
        { status: 401 },
      );
    }

    const { data: website } = await supabase
      .from("websites")
      .select("id, url, scan_frequency")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!website?.url) {
      return Response.json(
        { error: "Saved website was not found." },
        { status: 404 },
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

    if (
      (profile?.plan || "free") === "free" &&
      (count || 0) >= TEMP_DEV_FREE_SCAN_LIMIT
    ) {
      return Response.json(
        {
          error:
            "Temporary free development limit reached. Razorpay paid limits will be added at the end.",
        },
        { status: 402 },
      );
    }

    const report = await scanWebsite(website.url);
    const scoreResult = calculateScore(report);

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
        website_id: website.id,
        website_url: report.normalizedUrl,
        score: scoreResult.score,
        risk_level: scoreResult.riskLevel,
        report: fullReport,
      })
      .select(
        "id, website_id, website_url, score, risk_level, report, created_at",
      )
      .single();

    if (insertError || !scan) {
      return Response.json(
        { error: "Scan completed but could not save report." },
        { status: 500 },
      );
    }

    await supabase
      .from("websites")
      .update({
        last_scan_at: scan.created_at,
        next_scan_at: getNextScanDate(
          scan.created_at,
          website.scan_frequency || "weekly",
        ),
        latest_score: scoreResult.score,
        latest_risk_level: scoreResult.riskLevel,
        latest_scan_id: scan.id,
      })
      .eq("id", website.id)
      .eq("user_id", user.id);

    return Response.json({ scan });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while rescanning.";

    return Response.json({ error: message }, { status: 500 });
  }
}
