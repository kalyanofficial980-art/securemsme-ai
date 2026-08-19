import Link from "next/link";
import { redirect } from "next/navigation";
import { AdvancedReportNavigation } from "@/components/AdvancedReportNavigation";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { createClient } from "@/lib/supabase/server";

type CategoryScore = {
  label?: string;
  name?: string;
  score?: number;
  percentage?: number;
  rawScore?: number;
  maxScore?: number;
  grade?: string;
};

type Finding = {
  name?: string;
  title?: string;
  category?: string;
  description?: string;
  severity?: string;
  businessImpact?: string;
  recommendation?: string;
  developerFix?: string;
  status?: string;
};

type RetestFinding = {
  title: string;
  category: string;
  severity: string;
};

type RetestComparison = {
  baselineScanId: string;
  baselineCreatedAt: string;
  baselineScore: number;
  baselineRiskLevel: string;
  currentScore: number;
  currentRiskLevel: string;
  scoreDelta: number;
  outcome: "improved" | "unchanged" | "regressed";
  resolved: RetestFinding[];
  newFindings: RetestFinding[];
  persistent: RetestFinding[];
  counts: {
    resolved: number;
    newFindings: number;
    persistent: number;
  };
  note: string;
};

function getReportObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getFindings(report: Record<string, unknown>): Finding[] {
  return Array.isArray(report.findings) ? (report.findings as Finding[]) : [];
}

function isActionableFinding(finding: Finding) {
  const status = String(finding.status || "").toLowerCase();
  const severity = String(finding.severity || "").toLowerCase();

  return (
    status !== "pass" &&
    status !== "info" &&
    status !== "not_assessed" &&
    status !== "not_applicable" &&
    severity !== "info"
  );
}

function getRetestComparison(
  report: Record<string, unknown>,
): RetestComparison | null {
  const value = report.retestComparison;
  return value && typeof value === "object"
    ? (value as RetestComparison)
    : null;
}

function getCategoryScores(report: Record<string, unknown>): CategoryScore[] {
  const scores = report.categoryScores;

  if (Array.isArray(scores)) {
    return scores as CategoryScore[];
  }

  if (scores && typeof scores === "object") {
    return Object.entries(scores as Record<string, unknown>).map(
      ([key, value]) => {
        const item =
          value && typeof value === "object"
            ? (value as Record<string, unknown>)
            : {};

        return {
          label: String(item.label || key),
          score: typeof item.score === "number" ? item.score : undefined,
          percentage:
            typeof item.percentage === "number"
              ? item.percentage
              : undefined,
          rawScore:
            typeof item.rawScore === "number" ? item.rawScore : undefined,
          maxScore:
            typeof item.maxScore === "number" ? item.maxScore : undefined,
          grade: typeof item.grade === "string" ? item.grade : undefined,
        };
      },
    );
  }

  return [];
}

function scoreWidth(score?: number, rawScore?: number, maxScore?: number) {
  if (typeof score === "number") return Math.max(0, Math.min(100, score));
  if (
    typeof rawScore === "number" &&
    typeof maxScore === "number" &&
    maxScore > 0
  ) {
    return Math.round((rawScore / maxScore) * 100);
  }

  return 0;
}

function severityClass(severity?: string) {
  const text = String(severity || "").toLowerCase();

  if (text.includes("critical")) return "bg-red-100 text-red-900";
  if (text.includes("high")) return "bg-red-50 text-red-800";
  if (text.includes("medium")) return "bg-amber-50 text-amber-800";
  if (text.includes("low")) return "bg-slate-100 text-slate-700";

  return "bg-emerald-50 text-emerald-800";
}

function outcomeClass(outcome: RetestComparison["outcome"]) {
  if (outcome === "improved") return "bg-emerald-100 text-emerald-900";
  if (outcome === "regressed") return "bg-red-100 text-red-900";
  return "bg-slate-100 text-slate-800";
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view report");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_url, score, risk_level, report, created_at")
    .eq("id", id);

  if (profile?.role !== "admin") {
    scanQuery = scanQuery.eq("user_id", user.id);
  }

  const { data: scan } = await scanQuery.single();

  if (!scan) {
    redirect("/dashboard?message=Report not found");
  }

  const report = getReportObject(scan.report);
  const findings = getFindings(report);
  const actionableFindings = findings.filter(isActionableFinding);
  const categoryScores = getCategoryScores(report);
  const retestComparison = getRetestComparison(report);

  const severityCounts =
    report.severityCounts && typeof report.severityCounts === "object"
      ? (report.severityCounts as Record<string, number>)
      : {};

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl space-y-8 px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-black text-slate-500">
                Security report
              </p>
              <h1 className="mt-2 break-all text-4xl font-black">
                {scan.website_url}
              </h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                This is the canonical customer-facing security score from
                normalized safe public checks. Diagnostic modules provide
                supporting evidence but do not replace this score.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <RiskBadge riskLevel={scan.risk_level} />
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">
                  Scan date {new Date(scan.created_at).toLocaleString()}
                </span>
                {retestComparison ? (
                  <span
                    className={`rounded-full px-4 py-2 text-sm font-black ${outcomeClass(
                      retestComparison.outcome,
                    )}`}
                  >
                    Retest {retestComparison.outcome}
                  </span>
                ) : null}
              </div>

              <AdvancedReportNavigation scanId={scan.id} variant="compact" />
            </div>

            <div className="rounded-3xl bg-slate-950 p-6 text-white">
              <p className="text-sm text-slate-300">Overall score</p>
              <p className="mt-1 text-5xl font-black">{scan.score}</p>
              <p className="text-sm text-slate-300">out of 100</p>
            </div>
          </div>
        </div>

        <AdvancedReportNavigation scanId={scan.id} />

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Critical</p>
            <p className="mt-2 text-3xl font-black text-red-950">
              {severityCounts.critical ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">High</p>
            <p className="mt-2 text-3xl font-black text-red-700">
              {severityCounts.high ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Medium</p>
            <p className="mt-2 text-3xl font-black text-amber-700">
              {severityCounts.medium ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Action items</p>
            <p className="mt-2 text-3xl font-black">
              {actionableFindings.length}
            </p>
          </div>
        </section>

        {retestComparison ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black text-slate-500">Retest result</p>
                <h2 className="mt-1 text-2xl font-black">
                  Before vs after fixes
                </h2>
                <p className="mt-2 max-w-3xl text-slate-600">
                  Consecutive safe public scans are compared using the same
                  canonical finding rules.
                </p>
              </div>
              <span
                className={`rounded-full px-4 py-2 text-sm font-black ${outcomeClass(
                  retestComparison.outcome,
                )}`}
              >
                {retestComparison.outcome.toUpperCase()}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Score</p>
                <p className="mt-2 text-2xl font-black">
                  {retestComparison.baselineScore} → {retestComparison.currentScore}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  {retestComparison.scoreDelta > 0 ? "+" : ""}
                  {retestComparison.scoreDelta} points
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-5">
                <p className="text-sm text-emerald-800">Resolved / no longer detected</p>
                <p className="mt-2 text-3xl font-black text-emerald-950">
                  {retestComparison.counts.resolved}
                </p>
              </div>
              <div className="rounded-2xl bg-red-50 p-5">
                <p className="text-sm text-red-800">New actionable findings</p>
                <p className="mt-2 text-3xl font-black text-red-950">
                  {retestComparison.counts.newFindings}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-black">Resolved</h3>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  {retestComparison.resolved.length ? (
                    retestComparison.resolved.slice(0, 8).map((finding) => (
                      <p key={`${finding.category}-${finding.title}`}>
                        {finding.title}
                      </p>
                    ))
                  ) : (
                    <p>No prior actionable finding disappeared.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-black">Still open</h3>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  {retestComparison.persistent.length ? (
                    retestComparison.persistent.slice(0, 8).map((finding) => (
                      <p key={`${finding.category}-${finding.title}`}>
                        {finding.title}
                      </p>
                    ))
                  ) : (
                    <p>No actionable finding persisted.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-black">New</h3>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  {retestComparison.newFindings.length ? (
                    retestComparison.newFindings.slice(0, 8).map((finding) => (
                      <p key={`${finding.category}-${finding.title}`}>
                        {finding.title}
                      </p>
                    ))
                  ) : (
                    <p>No new actionable finding appeared.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col justify-between gap-4 border-t border-slate-200 pt-5 md:flex-row md:items-center">
              <p className="max-w-3xl text-sm leading-6 text-slate-500">
                {retestComparison.note}
              </p>
              <Link
                href={`/report/${retestComparison.baselineScanId}`}
                className="shrink-0 font-black underline"
              >
                Open baseline report
              </Link>
            </div>
          </section>
        ) : null}

        {categoryScores.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Category scores</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {categoryScores.map((item) => {
                const label = item.label || item.name || "Category";
                const width =
                  typeof item.percentage === "number"
                    ? Math.max(0, Math.min(100, item.percentage))
                    : scoreWidth(
                        item.score,
                        item.rawScore,
                        item.maxScore,
                      );

                return (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex justify-between gap-3">
                      <h3 className="font-black">{label}</h3>
                      <p className="font-black">
                        {item.grade ? `Grade ${item.grade} · ` : ""}
                        {width}/100
                      </p>
                    </div>
                    <div className="mt-4 h-3 rounded-full bg-slate-100">
                      <div
                        className="h-3 rounded-full bg-slate-950"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    {typeof item.rawScore === "number" &&
                    typeof item.maxScore === "number" ? (
                      <p className="mt-3 text-sm text-slate-500">
                        {item.rawScore}/{item.maxScore} points
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-black">Top fixes</h2>
              <p className="mt-2 text-slate-600">
                Give this to your developer, then retest after fixes.
              </p>
            </div>
            <Link
              href={`/report/${scan.id}/fix-roadmap`}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              Open developer roadmap
            </Link>
          </div>

          <div className="mt-6 grid gap-5">
            {actionableFindings.length ? (
              actionableFindings.slice(0, 12).map((finding, index) => (
                <div
                  key={`${finding.name || finding.title}-${index}`}
                  className="rounded-2xl border border-slate-200 p-6"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        {finding.category || "Security"}
                      </p>
                      <h3 className="mt-1 text-xl font-black">
                        {finding.name || finding.title || "Security finding"}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(
                        finding.severity,
                      )}`}
                    >
                      {finding.severity || "Review"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
                    {finding.description ? <p>{finding.description}</p> : null}
                    {finding.businessImpact ? (
                      <p>
                        <span className="font-black text-slate-950">
                          Business impact:
                        </span>{" "}
                        {finding.businessImpact}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-black text-slate-950">Fix:</span>{" "}
                      {finding.developerFix ||
                        finding.recommendation ||
                        "Review this issue and apply the recommended hardening control."}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">
                No actionable findings were identified by this safe public scan.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
