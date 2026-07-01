import { NextResponse } from "next/server";
import { z } from "zod";
import { parsePassiveToolReport } from "@/lib/passive-audit-connector";
import { createClient } from "@/lib/supabase/server";
import { getWebsiteNameFromUrl } from "@/lib/websites";

export const runtime = "nodejs";

const importSchema = z.object({
  websiteUrl: z.string().min(3).max(300),
  toolName: z.string().min(2).max(80).default("External Passive Tool"),
  rawReport: z.unknown(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please login before importing audit reports." },
        { status: 401 },
      );
    }

    const parsed = importSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Website URL, tool name, and JSON report are required." },
        { status: 400 },
      );
    }

    const passiveReport = parsePassiveToolReport(parsed.data);

    let websiteId: string | null = null;

    const { data: existingWebsite } = await supabase
      .from("websites")
      .select("id, scan_frequency")
      .eq("user_id", user.id)
      .eq("url", passiveReport.normalizedUrl)
      .maybeSingle();

    if (existingWebsite?.id) {
      websiteId = existingWebsite.id;
    } else {
      const { data: newWebsite } = await supabase
        .from("websites")
        .insert({
          user_id: user.id,
          url: passiveReport.normalizedUrl,
          name: getWebsiteNameFromUrl(passiveReport.normalizedUrl),
          monitoring_enabled: true,
          scan_frequency: "weekly",
        })
        .select("id")
        .single();

      websiteId = newWebsite?.id || null;
    }

    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        website_id: websiteId,
        website_url: passiveReport.normalizedUrl,
        score: passiveReport.score,
        risk_level: passiveReport.riskLevel,
        report: passiveReport,
      })
      .select(
        "id, website_id, website_url, score, risk_level, report, created_at",
      )
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { error: "Passive audit was parsed but could not be saved." },
        { status: 500 },
      );
    }

    if (websiteId) {
      await supabase
        .from("websites")
        .update({
          last_scan_at: scan.created_at,
          latest_score: passiveReport.score,
          latest_risk_level: passiveReport.riskLevel,
          latest_scan_id: scan.id,
        })
        .eq("id", websiteId)
        .eq("user_id", user.id);
    }

    await supabase.from("audit_tool_runs").insert({
      user_id: user.id,
      scan_id: scan.id,
      website_id: websiteId,
      website_url: passiveReport.normalizedUrl,
      tool_name: passiveReport.toolName,
      tool_mode: passiveReport.toolMode,
      status: "completed",
      evidence_count: passiveReport.findings.length,
      high_count: passiveReport.summary.high,
      medium_count: passiveReport.summary.medium,
      low_count: passiveReport.summary.low,
      info_count: passiveReport.summary.info,
      raw_summary: {
        score: passiveReport.score,
        riskLevel: passiveReport.riskLevel,
        generatedAt: passiveReport.generatedAt,
      },
    });

    return NextResponse.json({ scan });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not import passive audit report.",
      },
      { status: 500 },
    );
  }
}
