import type { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { createClient } from "@/lib/supabase/server";
import {
  getBusinessRiskText,
  getCategoryScores,
  getFindings,
  getReportTitle,
  getSafeFileName,
  getScoreGrade,
  getSeverityCounts,
  getTopFixes,
  type ScanReportRecord,
} from "@/lib/report-types";

export const runtime = "nodejs";

function cleanText(input?: string) {
  return (input || "")
    .replace(/[₹]/g, "Rs.")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function addDivider(doc: PDFKit.PDFDocument) {
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").stroke();
  doc.moveDown(0.8);
  doc.fillColor("#0f172a");
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > 690) {
    doc.addPage();
  }

  doc.moveDown(0.8);
  doc.fontSize(16).fillColor("#0f172a").text(title);
  addDivider(doc);
}

function addKeyValue(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.fontSize(10).fillColor("#475569").text(label, { continued: true });
  doc.fillColor("#0f172a").text(` ${value}`);
}

function addFindingBlock(
  doc: PDFKit.PDFDocument,
  finding: {
    name: string;
    status?: string;
    severity?: string;
    category?: string;
    message?: string;
    businessImpact?: string;
    fixRecommendation?: string;
    points?: number;
    maxPoints?: number;
  },
  index?: number,
) {
  if (doc.y > 650) {
    doc.addPage();
  }

  const title = index ? `${index}. ${finding.name}` : finding.name;

  doc.fontSize(12).fillColor("#0f172a").text(cleanText(title));

  doc
    .fontSize(9)
    .fillColor("#64748b")
    .text(
      `${finding.category || "General"} | ${finding.status || "status"} | ${
        finding.severity || "Info"
      } | Score ${finding.points ?? 0}/${finding.maxPoints ?? 0}`,
    );

  if (finding.message) {
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#334155").text(cleanText(finding.message), {
      lineGap: 2,
    });
  }

  if (finding.businessImpact) {
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor("#0f172a")
      .text("Business impact: ", { continued: true })
      .fillColor("#334155")
      .text(cleanText(finding.businessImpact), { lineGap: 2 });
  }

  if (finding.fixRecommendation) {
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor("#0f172a")
      .text("Recommended fix: ", { continued: true })
      .fillColor("#334155")
      .text(cleanText(finding.fixRecommendation), { lineGap: 2 });
  }

  doc.moveDown(1);
}

async function createPdfBuffer(scan: ScanReportRecord) {
  const report = scan.report;
  const title = getReportTitle(scan);
  const grade = getScoreGrade(scan.score);
  const severityCounts = getSeverityCounts(report);
  const categoryScores = getCategoryScores(report);
  const topFixes = getTopFixes(report);
  const findings = getFindings(report);
  const failedOrWarning = findings.filter(
    (finding) => finding.status !== "pass",
  );

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: {
      Title: `SecureMSME AI Report - ${title}`,
      Author: "SecureMSME AI",
      Subject: "Public website security report",
    },
  });

  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.fontSize(11).fillColor("#64748b").text("SecureMSME AI", {
    align: "right",
  });

  doc.moveDown(1);
  doc.fontSize(24).fillColor("#0f172a").text("Public Website Security Report");
  doc.moveDown(0.4);
  doc.fontSize(14).fillColor("#334155").text(cleanText(title));
  doc.fontSize(10).fillColor("#64748b").text(cleanText(scan.website_url));
  doc
    .fontSize(10)
    .fillColor("#64748b")
    .text(`Generated on ${new Date(scan.created_at).toLocaleString()}`);

  doc.moveDown(1.2);
  doc.fontSize(48).fillColor("#0f172a").text(`${scan.score}/100`, {
    continued: true,
  });
  doc.fontSize(14).fillColor("#475569").text(`   Grade ${grade}`);
  doc.moveDown(0.2);
  doc.fontSize(12).fillColor("#0f172a").text(`Risk level: ${scan.risk_level}`);

  addSectionTitle(doc, "Executive summary");
  doc
    .fontSize(11)
    .fillColor("#334155")
    .text(
      cleanText(
        report.executiveSummary ||
          report.summary ||
          "Report generated successfully.",
      ),
      { lineGap: 3 },
    );

  doc.moveDown(0.6);
  doc
    .fontSize(11)
    .fillColor("#334155")
    .text(cleanText(getBusinessRiskText(scan.risk_level)), { lineGap: 3 });

  addSectionTitle(doc, "Issue summary");
  addKeyValue(doc, "Critical:", String(severityCounts.critical));
  addKeyValue(doc, "High:", String(severityCounts.high));
  addKeyValue(doc, "Medium:", String(severityCounts.medium));
  addKeyValue(doc, "Low:", String(severityCounts.low));
  addKeyValue(doc, "Passed checks:", String(report.passedChecks ?? 0));
  addKeyValue(doc, "Warning checks:", String(report.warningChecks ?? 0));
  addKeyValue(doc, "Failed checks:", String(report.failedChecks ?? 0));
  addKeyValue(
    doc,
    "Response time:",
    report.raw?.responseTimeMs
      ? `${report.raw.responseTimeMs}ms`
      : "Not available",
  );

  addSectionTitle(doc, "Category scores");

  if (categoryScores.length) {
    for (const category of categoryScores) {
      doc
        .fontSize(11)
        .fillColor("#0f172a")
        .text(
          `${category.name}: ${category.percentage}/100 - Grade ${
            category.grade || "-"
          } - ${category.score}/${category.maxScore} points`,
        );
      doc.moveDown(0.25);
    }
  } else {
    doc.fontSize(10).fillColor("#334155").text("No category data available.");
  }

  doc.addPage();
  addSectionTitle(doc, "Priority action plan");

  if (topFixes.length) {
    topFixes.forEach((fix, index) => addFindingBlock(doc, fix, index + 1));
  } else {
    doc
      .fontSize(10)
      .fillColor("#334155")
      .text("No major priority fixes found.");
  }

  doc.addPage();
  addSectionTitle(doc, "Failed and warning findings");

  if (failedOrWarning.length) {
    failedOrWarning.forEach((finding, index) =>
      addFindingBlock(doc, finding, index + 1),
    );
  } else {
    doc
      .fontSize(10)
      .fillColor("#334155")
      .text("No failed or warning findings.");
  }

  doc.addPage();
  addSectionTitle(doc, "All checks");

  findings.forEach((finding, index) => {
    addFindingBlock(doc, finding, index + 1);
  });

  addSectionTitle(doc, "Disclaimer");
  doc
    .fontSize(9)
    .fillColor("#475569")
    .text(
      "This report is based on safe public checks only. It is not a full penetration test, vulnerability assessment, bug bounty report, legal audit, or compliance certification. For sensitive systems, use written authorization and a qualified security professional.",
      { lineGap: 3 },
    );

  doc.end();

  return finished;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Please login to download report." },
      { status: 401 },
    );
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, score, risk_level, report, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    return Response.json({ error: "Report not found." }, { status: 404 });
  }

  const typedScan = scan as ScanReportRecord;
  const pdfBuffer = await createPdfBuffer(typedScan);
  const fileName = `${getSafeFileName(typedScan.website_url)}-security-report.pdf`;

  const pdfBody = new Blob([new Uint8Array(pdfBuffer)], {
    type: "application/pdf",
  });

  return new Response(pdfBody, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store",
    },
  });
}
