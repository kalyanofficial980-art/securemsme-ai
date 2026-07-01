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

function getReportObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getFindings(report: Record<string, unknown>): Finding[] {
  return Array.isArray(report.findings) ? (report.findings as Finding[]) : [];
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
  const categoryScores = getCategoryScores(report);

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
                This report combines public security posture, inbuilt audit,
                vulnerability intelligence, and business-readable fixes.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <RiskBadge riskLevel={scan.risk_level} />
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">
                  Scan date {new Date(scan.created_at).toLocaleString()}
                </span>
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
            <p className="text-sm text-slate-500">Findings</p>
            <p className="mt-2 text-3xl font-black">{findings.length}</p>
          </div>
        </section>

        {categoryScores.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Category scores</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {categoryScores.map((item) => {
                const label = item.label || item.name || "Category";
                const width = scoreWidth(
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
                Give this to your developer, then rescan after fixes.
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
            {findings.length ? (
              findings.slice(0, 12).map((finding, index) => (
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
              <p className="text-slate-600">No findings were saved.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
