import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { RiskBadge } from "@/components/RiskBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getBusinessRiskText,
  getCategoryScores,
  getFindings,
  getReportTitle,
  getScoreGrade,
  getSeverityCounts,
  getTopFixes,
  type ScanReportRecord,
} from "@/lib/report-types";

type ReportCardProps = {
  scan: ScanReportRecord;
  showActions?: boolean;
  printMode?: boolean;
};

export function ReportCard({
  scan,
  showActions = true,
  printMode = false,
}: ReportCardProps) {
  const report = scan.report;
  const findings = getFindings(report);
  const topFixes = getTopFixes(report);
  const categoryScores = getCategoryScores(report);
  const severityCounts = getSeverityCounts(report);
  const title = getReportTitle(scan);
  const grade = getScoreGrade(scan.score);

  const failedFindings = findings.filter(
    (finding) => finding.status === "fail",
  );
  const warningFindings = findings.filter(
    (finding) => finding.status === "warning",
  );
  const passedFindings = findings.filter(
    (finding) => finding.status === "pass",
  );

  return (
    <div className={printMode ? "bg-white text-slate-950" : "space-y-8"}>
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
              SecureMSME AI public security report
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">{title}</h1>
            <p className="mt-3 break-all text-slate-600">{scan.website_url}</p>
            <p className="mt-2 text-sm text-slate-500">
              Generated on {new Date(scan.created_at).toLocaleString()}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <RiskBadge riskLevel={scan.risk_level} />
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                Grade {grade}
              </span>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 px-8 py-6 text-white print:border print:border-slate-300 print:bg-white print:text-slate-950">
            <p className="text-sm text-slate-300 print:text-slate-600">
              Overall score
            </p>
            <p className="text-6xl font-black">{scan.score}</p>
            <p className="text-sm text-slate-300 print:text-slate-600">
              out of 100
            </p>
          </div>
        </div>

        {showActions ? (
          <div className="mt-8 flex flex-wrap gap-3 print:hidden">
            <a
              href={`/api/report/${scan.id}/pdf`}
              className="rounded-full bg-slate-950 px-5 py-3 text-center font-bold text-white hover:bg-slate-800"
            >
              Download PDF
            </a>

            <Link
              href={`/report/${scan.id}/print`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-center font-bold text-slate-950 hover:bg-slate-100"
            >
              Printable view
            </Link>

            <PrintButton />

            <Link
              href="/dashboard"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-center font-bold text-slate-950 hover:bg-slate-100"
            >
              Dashboard
            </Link>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:mt-8 print:break-inside-avoid print:shadow-none">
        <h2 className="text-2xl font-black">Executive summary</h2>
        <p className="mt-4 text-slate-700">
          {report.executiveSummary ||
            report.summary ||
            "Report generated successfully."}
        </p>

        <p className="mt-4 text-slate-700">
          <strong>Business risk:</strong> {getBusinessRiskText(scan.risk_level)}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 p-5 print:border print:border-slate-200 print:bg-white">
            <p className="text-sm text-slate-500">Critical</p>
            <p className="mt-2 text-3xl font-black text-red-950">
              {severityCounts.critical}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 print:border print:border-slate-200 print:bg-white">
            <p className="text-sm text-slate-500">High</p>
            <p className="mt-2 text-3xl font-black text-red-700">
              {severityCounts.high}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 print:border print:border-slate-200 print:bg-white">
            <p className="text-sm text-slate-500">Medium</p>
            <p className="mt-2 text-3xl font-black text-amber-700">
              {severityCounts.medium}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 print:border print:border-slate-200 print:bg-white">
            <p className="text-sm text-slate-500">Warnings</p>
            <p className="mt-2 text-3xl font-black">
              {report.warningChecks ?? warningFindings.length}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 print:border print:border-slate-200 print:bg-white">
            <p className="text-sm text-slate-500">Passed</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">
              {report.passedChecks ?? passedFindings.length}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:mt-8 print:break-inside-avoid print:shadow-none">
        <h2 className="text-2xl font-black">Category scores</h2>

        {categoryScores.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {categoryScores.map((category) => (
              <div
                key={category.name}
                className="rounded-2xl border border-slate-200 p-5 print:break-inside-avoid"
              >
                <div className="flex justify-between gap-4">
                  <h3 className="font-black">{category.name}</h3>
                  <p className="font-black">
                    Grade {category.grade || "-"} - {category.percentage}/100
                  </p>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 print:border print:border-slate-300">
                  <div
                    className="h-full rounded-full bg-slate-950"
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>

                <p className="mt-3 text-sm text-slate-600">
                  {category.score}/{category.maxScore} points
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-600">No category data available.</p>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:mt-8 print:break-before-page print:shadow-none">
        <h2 className="text-2xl font-black">Priority action plan</h2>
        <p className="mt-3 text-slate-600">
          Fix these items first. They have the strongest business and security
          impact.
        </p>

        {topFixes.length ? (
          <div className="mt-6 space-y-4">
            {topFixes.map((fix, index) => (
              <div
                key={`${fix.name}-${index}`}
                className="rounded-2xl border border-slate-200 p-5 print:break-inside-avoid"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Action #{index + 1}
                    </p>
                    <h3 className="mt-1 font-black">{fix.name}</h3>
                    <p className="mt-2 text-sm text-slate-600">{fix.message}</p>
                  </div>

                  <SeverityBadge severity={fix.severity} />
                </div>

                {fix.businessImpact ? (
                  <p className="mt-4 text-sm text-slate-700">
                    <strong>Business impact:</strong> {fix.businessImpact}
                  </p>
                ) : null}

                {fix.fixRecommendation ? (
                  <p className="mt-2 text-sm text-slate-700">
                    <strong>Recommended fix:</strong> {fix.fixRecommendation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-600">
            No major priority fixes found in this scan.
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:mt-8 print:break-before-page print:shadow-none">
        <h2 className="text-2xl font-black">Failed and warning findings</h2>

        {[...failedFindings, ...warningFindings].length ? (
          <div className="mt-6 space-y-4">
            {[...failedFindings, ...warningFindings].map((finding) => (
              <div
                key={finding.name}
                className="rounded-2xl border border-slate-200 p-5 print:break-inside-avoid"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {finding.category || "General"}
                    </p>
                    <h3 className="mt-1 font-black">{finding.name}</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {finding.message}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <StatusBadge status={finding.status} />
                    <SeverityBadge severity={finding.severity} />
                  </div>
                </div>

                {finding.businessImpact ? (
                  <p className="mt-4 text-sm text-slate-700">
                    <strong>Business impact:</strong> {finding.businessImpact}
                  </p>
                ) : null}

                {finding.fixRecommendation ? (
                  <p className="mt-2 text-sm text-slate-700">
                    <strong>Fix:</strong> {finding.fixRecommendation}
                  </p>
                ) : null}

                <p className="mt-4 text-sm font-semibold text-slate-700">
                  Score: {finding.points}/{finding.maxPoints}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-600">
            No failed or warning findings found.
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:mt-8 print:break-before-page print:shadow-none">
        <h2 className="text-2xl font-black">All checks</h2>

        <div className="mt-6 space-y-4">
          {findings.map((finding) => (
            <div
              key={finding.name}
              className="rounded-2xl border border-slate-200 p-5 print:break-inside-avoid"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {finding.category || "General"}
                  </p>
                  <h3 className="mt-1 font-black">{finding.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {finding.message}
                  </p>
                </div>

                <div className="flex gap-2">
                  <StatusBadge status={finding.status} />
                  <SeverityBadge severity={finding.severity} />
                </div>
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700">
                Score: {finding.points}/{finding.maxPoints}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:mt-8 print:break-inside-avoid print:shadow-none">
        <h2 className="text-2xl font-black">Disclaimer</h2>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          This report is based on safe public checks only. It is not a full
          penetration test, vulnerability assessment, bug bounty report, legal
          audit, or compliance certification. For sensitive systems, use written
          authorization and a qualified security professional.
        </p>
      </div>
    </div>
  );
}
