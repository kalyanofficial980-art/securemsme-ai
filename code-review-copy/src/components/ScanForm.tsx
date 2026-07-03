"use client";

import Link from "next/link";
import { useState } from "react";
import { AdvancedReportNavigation } from "@/components/AdvancedReportNavigation";
import { RiskBadge } from "@/components/RiskBadge";

type WebsiteOption = {
  id: string;
  url: string;
  name?: string | null;
};

type ScanResponse = {
  scan?: {
    id: string;
    website_url: string;
    score: number;
    risk_level: string;
    report?: Record<string, unknown>;
    created_at?: string;
  };
  error?: string;
};

type ScanFormProps = {
  websites?: WebsiteOption[];
  selectedWebsiteId?: string;
};

export function ScanForm({
  websites = [],
  selectedWebsiteId = "",
}: ScanFormProps) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteId, setWebsiteId] = useState(selectedWebsiteId);
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteUrl: websiteId ? undefined : websiteUrl,
          websiteId: websiteId || undefined,
        }),
      });

      const data = (await response.json()) as ScanResponse;

      if (!response.ok || !data.scan) {
        setError(data.error || "Scan failed. Please try again.");
        return;
      }

      setResult(data.scan);
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Scan failed. Please try again.",
      );
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleScan}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
              Safe public website checks only
            </span>
            <h1 className="mt-5 text-4xl font-black">Scan website</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Select a saved website or enter a public URL. SecureMSME AI checks
              website security, email protection, exposure risk, trust gaps, and
              vulnerability intelligence.
            </p>
          </div>

          <Link
            href="/websites/new"
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
          >
            Add website
          </Link>
        </div>

        {websites.length ? (
          <div className="mt-8">
            <label className="text-sm font-black text-slate-700">
              Saved website
            </label>
            <select
              value={websiteId}
              onChange={(event) => setWebsiteId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
            >
              <option value="">Enter new URL manually</option>
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.name || website.url}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {!websiteId ? (
          <div className="mt-8 flex flex-col gap-4 md:flex-row">
            <input
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="https://example.com"
              className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
            />
            <button
              type="submit"
              disabled={isScanning}
              className="rounded-full bg-slate-950 px-7 py-3 font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isScanning ? "Scanning..." : "Scan now"}
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={isScanning}
            className="mt-8 rounded-full bg-slate-950 px-7 py-3 font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isScanning ? "Scanning..." : "Scan selected website"}
          </button>
        )}

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
            {error}
          </div>
        ) : null}
      </form>

      {result ? (
        <section className="space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
              <div>
                <p className="text-sm font-black text-slate-500">
                  Scan completed
                </p>
                <h2 className="mt-2 break-all text-3xl font-black">
                  {result.website_url}
                </h2>
                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                  Your basic report is ready. Open deeper reports below for
                  vulnerability intelligence, inbuilt advanced audit, OWASP/ASVS
                  mapping, and developer fix roadmap.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <RiskBadge riskLevel={result.risk_level} />
                  <Link
                    href={`/report/${result.id}`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100"
                  >
                    Open full report
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-950 p-6 text-white">
                <p className="text-sm text-slate-300">Overall score</p>
                <p className="mt-1 text-5xl font-black">{result.score}</p>
                <p className="text-sm text-slate-300">out of 100</p>
              </div>
            </div>
          </div>

          <AdvancedReportNavigation scanId={result.id} />
        </section>
      ) : null}
    </div>
  );
}
