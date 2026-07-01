"use client";

import { useState } from "react";

type ScanFinding = {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  points: number;
  maxPoints: number;
};

type ScanResponse = {
  scan: {
    id: string;
    website_url: string;
    score: number;
    risk_level: string;
    report: {
      findings: ScanFinding[];
      topFixes: {
        name: string;
        message: string;
        lostPoints: number;
      }[];
      raw?: {
        responseTimeMs?: number;
      };
    };
    created_at: string;
  };
};

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
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-4xl font-black">Scan website</h1>
      <p className="mt-3 text-slate-600">
        Enter a public business website URL. SecureMSME AI will run safe public
        checks only.
      </p>

      <form
        onSubmit={handleScan}
        className="mt-8 flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          required
          className="flex-1 rounded-2xl border border-slate-300 px-4 py-3"
          placeholder="https://example.com"
        />
        <button
          disabled={isScanning}
          className="rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isScanning ? "Scanning..." : "Scan now"}
        </button>
      </form>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-slate-500">Website</p>
              <p className="font-bold text-slate-950">{result.website_url}</p>
            </div>

            <div className="rounded-2xl bg-slate-950 px-6 py-4 text-white">
              <p className="text-sm text-slate-300">Score</p>
              <p className="text-5xl font-black">{result.score}</p>
              <p className="text-sm text-slate-300">{result.risk_level} risk</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {result.report.findings.map((finding) => (
              <div
                key={finding.name}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{finding.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {finding.message}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">
                    {finding.status}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  {finding.points}/{finding.maxPoints} points
                </p>
              </div>
            ))}
          </div>

          {result.report.topFixes.length ? (
            <div className="mt-6 rounded-2xl bg-white p-4">
              <h3 className="font-black">Top fixes</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {result.report.topFixes.map((fix) => (
                  <li key={fix.name}>
                    <strong>{fix.name}:</strong> {fix.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
