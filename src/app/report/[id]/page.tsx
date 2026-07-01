import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

type Finding = {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  points: number;
  maxPoints: number;
};

type TopFix = {
  name: string;
  message: string;
  lostPoints: number;
};

type ReportJson = {
  findings?: Finding[];
  topFixes?: TopFix[];
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
              <p className="text-sm font-bold text-slate-500">Website report</p>
              <h1 className="mt-2 break-all text-3xl font-black">
                {scan.website_url}
              </h1>
              <p className="mt-3 text-slate-600">
                Checked on {new Date(scan.created_at).toLocaleString()}
              </p>
            </div>

            <div className="rounded-3xl bg-slate-950 px-8 py-6 text-white">
              <p className="text-sm text-slate-300">Score</p>
              <p className="text-6xl font-black">{scan.score}</p>
              <p className="text-sm text-slate-300">{scan.risk_level} risk</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">HTTP status</p>
              <p className="mt-2 text-2xl font-black">
                {report.raw?.finalStatus ?? "--"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Response time</p>
              <p className="mt-2 text-2xl font-black">
                {report.raw?.responseTimeMs
                  ? `${report.raw.responseTimeMs}ms`
                  : "--"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Checks completed</p>
              <p className="mt-2 text-2xl font-black">{findings.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Findings</h2>

          <div className="mt-6 grid gap-4">
            {findings.map((finding) => (
              <div
                key={finding.name}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <h3 className="text-lg font-black">{finding.name}</h3>
                    <p className="mt-2 text-slate-600">{finding.message}</p>
                  </div>

                  <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-xs font-black capitalize text-slate-700">
                    {finding.status}
                  </span>
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-700">
                  {finding.points}/{finding.maxPoints} points
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Top fixes</h2>

          {topFixes.length === 0 ? (
            <p className="mt-4 text-slate-600">
              No major fixes found in this basic scan.
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {topFixes.map((fix) => (
                <li
                  key={fix.name}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <h3 className="font-black">{fix.name}</h3>
                  <p className="mt-2 text-slate-600">{fix.message}</p>
                  <p className="mt-3 text-sm font-bold text-slate-700">
                    Lost points: {fix.lostPoints}
                  </p>
                </li>
              ))}
            </ul>
          )}
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
