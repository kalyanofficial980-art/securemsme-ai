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

  if (Array.isArray(scores)) return scores as CategoryScore[];

  if (scores && typeof scores === "object") {
    return Object.entries(scores as Record<string, unknown>).map(([key, value]) => {
      const item =
        value && typeof value === "object"
          ? (value as Record<string, unknown>)
          : {};

      return {
        label: String(item.label || key),
        score: typeof item.score === "number" ? item.score : undefined,
        percentage:
          typeof item.percentage === "number" ? item.percentage : undefined,
        rawScore: typeof item.rawScore === "number" ? item.rawScore : undefined,
        maxScore: typeof item.maxScore === "number" ? item.maxScore : undefined,
        grade: typeof item.grade === "string" ? item.grade : undefined,
      };
    });
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
  if (text.includes("critical")) return "border-red-300 bg-red-50 text-red-900";
  if (text.includes("high")) return "border-red-200 bg-red-50 text-red-800";
  if (text.includes("medium")) return "border-amber-200 bg-amber-50 text-amber-800";
  if (text.includes("low")) return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function outcomeClass(outcome: RetestComparison["outcome"]) {
  if (outcome === "improved") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (outcome === "regressed") return "border-red-200 bg-red-50 text-red-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
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
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="mb-5 flex items-center justify-between gap-4 text-sm">
          <Link href="/websites" className="font-semibold text-slate-600 hover:text-blue-700">
            ← Website workspaces
          </Link>
          <span className="text-slate-400">Report ID {scan.id.slice(0, 8)}</span>
        </div>

        <section className="grid border border-slate-300 bg-white lg:grid-cols-[1fr_230px]">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Security report
            </p>
            <h1 className="mt-3 break-all text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {scan.website_url}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              Canonical customer-facing result from normalized safe public checks. Supporting diagnostics add evidence without replacing this score.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
              <RiskBadge riskLevel={scan.risk_level} />
              <span className="text-slate-500">Scanned {new Date(scan.created_at).toLocaleString()}</span>
              {retestComparison ? (
                <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold capitalize ${outcomeClass(retestComparison.outcome)}`}>
                  Retest {retestComparison.outcome}
                </span>
              ) : null}
            </div>

            <AdvancedReportNavigation scanId={scan.id} variant="compact" />
          </div>

          <div className="border-t border-slate-200 bg-slate-950 p-6 text-white lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Overall score</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-6xl font-semibold tracking-[-0.06em]">{scan.score}</span>
              <span className="pb-2 text-sm text-slate-400">/100</span>
            </div>
            <p className="mt-3 text-sm capitalize text-slate-300">{scan.risk_level} risk</p>
          </div>
        </section>

        <div className="mt-6">
          <AdvancedReportNavigation scanId={scan.id} />
        </div>

        <section className="mt-6 grid border border-slate-300 bg-white sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Critical", severityCounts.critical ?? 0, "text-red-800"],
            ["High", severityCounts.high ?? 0, "text-red-700"],
            ["Medium", severityCounts.medium ?? 0, "text-amber-700"],
            ["Action items", actionableFindings.length, "text-slate-950"],
          ].map(([label, value, tone], index) => (
            <div
              key={String(label)}
              className={`p-5 ${index < 3 ? "border-b border-slate-200 sm:border-b-0 sm:border-r" : ""}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p>
            </div>
          ))}
        </section>

        {retestComparison ? (
          <section className="mt-8 border border-slate-300 bg-white">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-700">Retest evidence</p>
                <h2 className="mt-2 text-xl font-semibold">Before vs after remediation</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Consecutive scans are compared with the same canonical finding rules so resolved, persistent and new issues stay clear.
                </p>
              </div>
              <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase ${outcomeClass(retestComparison.outcome)}`}>
                {retestComparison.outcome}
              </span>
            </div>

            <div className="grid border-b border-slate-200 md:grid-cols-4">
              {[
                ["Baseline", `${retestComparison.baselineScore}/100`],
                ["Current", `${retestComparison.currentScore}/100`],
                ["Score change", `${retestComparison.scoreDelta > 0 ? "+" : ""}${retestComparison.scoreDelta}`],
                ["Resolved", String(retestComparison.counts.resolved)],
              ].map(([label, value], index) => (
                <div key={label} className={`p-5 ${index < 3 ? "border-b border-slate-200 md:border-b-0 md:border-r" : ""}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3">
              {[
                ["Resolved / no longer detected", retestComparison.resolved, "No prior actionable finding disappeared."],
                ["Still open", retestComparison.persistent, "No actionable finding persisted."],
                ["New", retestComparison.newFindings, "No new actionable finding appeared."],
              ].map(([title, items, empty], index) => {
                const list = items as RetestFinding[];
                return (
                  <div key={String(title)} className={`p-6 ${index < 2 ? "border-b border-slate-200 lg:border-b-0 lg:border-r" : ""}`}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{String(title)}</h3>
                      <span className="text-xs font-semibold text-slate-400">{list.length}</span>
                    </div>
                    <div className="mt-4 divide-y divide-slate-100 text-sm text-slate-700">
                      {list.length ? (
                        list.slice(0, 8).map((finding) => (
                          <p key={`${finding.category}-${finding.title}`} className="py-2.5">{finding.title}</p>
                        ))
                      ) : (
                        <p className="py-2.5 text-slate-500">{String(empty)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col justify-between gap-4 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center">
              <p className="max-w-3xl text-xs leading-5 text-slate-500">{retestComparison.note}</p>
              <Link href={`/report/${retestComparison.baselineScanId}`} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
                Open baseline →
              </Link>
            </div>
          </section>
        ) : null}

        {categoryScores.length ? (
          <section className="mt-8 border border-slate-300 bg-white">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold">Security posture by category</h2>
              <p className="mt-1 text-sm text-slate-500">Category scores supporting the overall report.</p>
            </div>
            <div className="grid md:grid-cols-2">
              {categoryScores.map((item, index) => {
                const label = item.label || item.name || "Category";
                const width =
                  typeof item.percentage === "number"
                    ? Math.max(0, Math.min(100, item.percentage))
                    : scoreWidth(item.score, item.rawScore, item.maxScore);

                return (
                  <div
                    key={label}
                    className={`p-6 ${index % 2 === 0 ? "md:border-r" : ""} ${index < categoryScores.length - 2 ? "border-b" : ""} border-slate-200`}
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-semibold">{label}</h3>
                      <p className="text-sm font-semibold text-slate-700">
                        {item.grade ? `${item.grade} · ` : ""}{width}/100
                      </p>
                    </div>
                    <div className="mt-4 h-1.5 bg-slate-100">
                      <div className="h-1.5 bg-blue-700" style={{ width: `${width}%` }} />
                    </div>
                    {typeof item.rawScore === "number" && typeof item.maxScore === "number" ? (
                      <p className="mt-2 text-xs text-slate-400">{item.rawScore}/{item.maxScore} weighted points</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-8 border border-slate-300 bg-white">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-700">Remediation</p>
              <h2 className="mt-2 text-xl font-semibold">Prioritized fixes</h2>
              <p className="mt-1 text-sm text-slate-500">Use these actions for developer handoff, then retest after changes are deployed.</p>
            </div>
            <Link href={`/report/${scan.id}/fix-roadmap`} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
              Open full fix roadmap →
            </Link>
          </div>

          {actionableFindings.length ? (
            <div className="divide-y divide-slate-200">
              {actionableFindings.slice(0, 12).map((finding, index) => (
                <article key={`${finding.name || finding.title}-${index}`} className="grid gap-4 px-6 py-6 lg:grid-cols-[180px_1fr]">
                  <div>
                    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${severityClass(finding.severity)}`}>
                      {finding.severity || "Review"}
                    </span>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                      {finding.category || "Security"}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold">{finding.name || finding.title || "Security finding"}</h3>
                    {finding.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{finding.description}</p> : null}
                    {finding.businessImpact ? (
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        <span className="font-semibold text-slate-950">Business impact:</span> {finding.businessImpact}
                      </p>
                    ) : null}
                    <div className="mt-4 border-l-2 border-blue-700 pl-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Recommended fix</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {finding.developerFix || finding.recommendation || "Review this issue and apply the recommended hardening control."}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-slate-600">
              No actionable findings were identified by this safe public scan.
            </div>
          )}
        </section>

        <div className="mt-8 flex flex-col justify-between gap-4 border-t border-slate-300 pt-6 text-xs leading-5 text-slate-500 sm:flex-row">
          <p className="max-w-3xl">
            This report is decision-support evidence from the assessed checks, not a guarantee of complete security, a penetration-test certificate, or a compliance certification.
          </p>
          <Link href="/trust" className="shrink-0 font-semibold text-slate-700 hover:text-blue-700">Trust & safety →</Link>
        </div>
      </section>
    </main>
  );
}
