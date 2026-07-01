"use client";

import { useState } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import { StatusBadge } from "@/components/StatusBadge";

type ScanFinding = {
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

type ScanResponse = {
  scan: {
    id: string;
    website_url: string;
    score: number;
    risk_level: string;
    report: {
      summary?: string;
      executiveSummary?: string;
      findings: ScanFinding[];
      categoryScores?: CategoryScore[];
      topFixes: TopFix[];
      severityCounts?: SeverityCounts;
      passedChecks?: number;
      warningChecks?: number;
      failedChecks?: number;
      raw?: {
        responseTimeMs?: number;
        finalStatus?: number;
      };
    };
    created_at: string;
  };
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

export function ScanForm() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [result, setResult] = useState<ScanResponse["scan"] | null>(null);
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  async function handleScan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setResult(null);
    setIsScanning(true);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ websiteUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Scan failed.");
        return;
      }

      setResult(data.scan);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-4 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
          Safe public website checks only
        </p>

        <h1 className="text-4xl font-black">Scan website</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Enter a public business website URL. SecureMSME AI checks security,
          email protection, exposure risk, and trust gaps.
        </p>

        <form
          onSubmit={handleScan}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            required
            className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
            placeholder="https://example.com"
          />

          <button
            disabled={isScanning}
            className="rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isScanning ? "Scanning..." : "Scan now"}
          </button>
        </form>

        {isScanning ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="font-bold">Scanning in progress...</p>
            <p className="mt-2 text-sm text-slate-600">
              Checking website security, DNS email security, public exposure,
              and trust signals.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {result ? (
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Executive summary
                </p>
                <h2 className="mt-2 break-all text-3xl font-black">
                  {result.website_url}
                </h2>
                <p className="mt-3 max-w-2xl text-slate-600">
                  {result.report.executiveSummary ||
                    result.report.summary ||
                    "Report generated successfully."}
                </p>

                <div className="mt-5">
                  <RiskBadge riskLevel={result.risk_level} />
                </div>
              </div>

              <div className="rounded-3xl bg-slate-950 px-8 py-6 text-white">
                <p className="text-sm text-slate-300">Overall score</p>
                <p className="text-6xl font-black">{result.score}</p>
                <p className="text-sm text-slate-300">out of 100</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-5">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Critical</p>
                <p className="mt-2 text-3xl font-black text-red-950">
                  {result.report.severityCounts?.critical ?? 0}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">High</p>
                <p className="mt-2 text-3xl font-black text-red-700">
                  {result.report.severityCounts?.high ?? 0}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Medium</p>
                <p className="mt-2 text-3xl font-black text-amber-700">
                  {result.report.severityCounts?.medium ?? 0}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Passed</p>
                <p className="mt-2 text-3xl font-black text-emerald-700">
                  {result.report.passedChecks ?? 0}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Response</p>
                <p className="mt-2 text-3xl font-black">
                  {result.report.raw?.responseTimeMs
                    ? `${result.report.raw.responseTimeMs}ms`
                    : "--"}
                </p>
              </div>
            </div>
          </div>

          {result.report.categoryScores?.length ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
              <h2 className="text-2xl font-black">Category scores</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {result.report.categoryScores.map((category) => (
                  <div
                    key={category.name}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex justify-between gap-4">
                      <h3 className="font-black">{category.name}</h3>
                      <p className="font-black">
                        Grade {category.grade || "-"} · {category.percentage}
                        /100
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

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Top fixes</h2>

            {result.report.topFixes.length ? (
              <ul className="mt-6 space-y-4">
                {result.report.topFixes.map((fix) => (
                  <li
                    key={fix.name}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <h3 className="font-black">{fix.name}</h3>
                        <p className="mt-2 text-sm text-slate-600">
                          {fix.message}
                        </p>
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
            ) : (
              <p className="mt-4 text-slate-600">
                No major fixes found in this scan.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">All findings</h2>

            <div className="mt-6 grid gap-4">
              {result.report.findings.map((finding) => (
                <div
                  key={finding.name}
                  className="rounded-2xl border border-slate-200 p-5"
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
                    {finding.points}/{finding.maxPoints} points
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
