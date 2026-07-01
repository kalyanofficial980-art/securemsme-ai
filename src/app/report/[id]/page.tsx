import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";

type Finding = {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  points: number;
  maxPoints: number;
  category?: string;
  severity?: "Critical" | "High" | "Medium" | "Low" | "Info";
  businessImpact?: string;
  fixRecommendation?: string;
};

type CategoryScore = {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade?: string;
};

type TopFix = {
  name: string;
  message: string;
  lostPoints: number;
  priority?: string;
  severity?: string;
  businessImpact?: string;
  fixRecommendation?: string;
};

type SeverityCounts = {
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  info?: number;
};

type ReportJson = {
  summary?: string;
  executiveSummary?: string;
  findings?: Finding[];
  categoryScores?: CategoryScore[];
  topFixes?: TopFix[];
  severityCounts?: SeverityCounts;
  passedChecks?: number;
  warningChecks?: number;
  failedChecks?: number;
  raw?: {
    finalStatus?: number;
    responseTimeMs?: number;
  };
};

type ReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function SeverityBadge({ severity }: { severity?: string }) {
  if (severity === "Critical") {
    return (
      <span className="rounded-full bg-red-950 px-3 py-1 text-xs font-black text-white">
        Critical
      </span>
    );
  }

  if (severity === "High") {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
        High
      </span>
    );
  }

  if (severity === "Medium") {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
        Medium
      </span>
    );
  }

  if (severity === "Low") {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
        Low
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
      Info
    </span>
  );
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view report");
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, score, risk_level, report, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    notFound();
  }

  const report = scan.report as ReportJson;
  const findings = report.findings ?? [];
  const categoryScores = report.categoryScores ?? [];
  const topFixes = report.topFixes ?? [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <Link href="/dashboard" className="text-sm font-bold text-slate-600">
          Back to dashboard
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">
                Executive report
              </p>
              <h1 className="mt-2 break-all text-3xl font-black">
                {scan.website_url}
              </h1>
              <p className="mt-3 text-slate-600">
                {report.executiveSummary ||
                  report.summary ||
                  "Report generated successfully."}
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Checked on {new Date(scan.created_at).toLocaleString()}
              </p>

              <div className="mt-5">
                <RiskBadge riskLevel={scan.risk_level} />
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950 px-8 py-6 text-white">
              <p className="text-sm text-slate-300">Score</p>
              <p className="text-6xl font-black">{scan.score}</p>
              <p className="text-sm text-slate-300">out of 100</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Critical</p>
              <p className="mt-2 text-3xl font-black text-red-950">
                {report.severityCounts?.critical ?? 0}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">High</p>
              <p className="mt-2 text-3xl font-black text-red-700">
                {report.severityCounts?.high ?? 0}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Medium</p>
              <p className="mt-2 text-3xl font-black text-amber-700">
                {report.severityCounts?.medium ?? 0}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Passed</p>
              <p className="mt-2 text-3xl font-black text-emerald-700">
                {report.passedChecks ?? 0}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Response</p>
              <p className="mt-2 text-3xl font-black">
                {report.raw?.responseTimeMs
                  ? `${report.raw.responseTimeMs}ms`
                  : "--"}
              </p>
            </div>
          </div>
        </div>

        {categoryScores.length ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Category scores</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {categoryScores.map((category) => (
                <div
                  key={category.name}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex justify-between gap-4">
                    <h3 className="font-black">{category.name}</h3>
                    <p className="font-black">
                      Grade {category.grade || "-"} · {category.percentage}/100
                    </p>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
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
          </div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Top fixes</h2>

          {topFixes.length === 0 ? (
            <p className="mt-4 text-slate-600">
              No major fixes found in this scan.
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {topFixes.map((fix) => (
                <li
                  key={fix.name}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <h3 className="font-black">{fix.name}</h3>
                      <p className="mt-2 text-slate-600">{fix.message}</p>
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
                      <strong>Fix:</strong> {fix.fixRecommendation}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">All findings</h2>

          <div className="mt-6 grid gap-4">
            {findings.map((finding) => (
              <div
                key={finding.name}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {finding.category || "General"}
                    </p>
                    <h3 className="mt-1 text-lg font-black">{finding.name}</h3>
                    <p className="mt-2 text-slate-600">{finding.message}</p>
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
                  {finding.points}/{finding.maxPoints} points
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 text-center font-bold text-white hover:bg-slate-800"
          >
            Run another scan
          </Link>

          <Link
            href="/dashboard"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center font-bold text-slate-950 hover:bg-slate-100"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
