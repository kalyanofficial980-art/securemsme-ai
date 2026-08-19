"use client";

import Link from "next/link";
import { useState } from "react";
import { AdvancedReportNavigation } from "@/components/AdvancedReportNavigation";
import { RiskBadge } from "@/components/RiskBadge";
import { toClientSafeScanError } from "@/lib/security/scan-error";

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

export function ScanForm({ websites = [], selectedWebsiteId = "" }: ScanFormProps) {
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
      const manualWebsiteUrl = websiteUrl.trim();
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: manualWebsiteUrl || undefined,
          websiteId: manualWebsiteUrl ? undefined : websiteId || undefined,
        }),
      });

      const data = (await response.json()) as ScanResponse;

      if (!response.ok || !data.scan) {
        setError(toClientSafeScanError(data.error));
        return;
      }

      setResult(data.scan);
    } catch {
      setError(toClientSafeScanError());
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 p-7 text-white sm:p-9">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-sky-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Safe public scan
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Run a website security scan</h1>
              <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                Start with safe public checks. Ownership-verified deeper review stays locked until permission is confirmed.
              </p>
            </div>
            <Link href="/websites/new" className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">
              + Add website
            </Link>
          </div>
        </div>

        <form onSubmit={handleScan} className="p-7 sm:p-9">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div>
              {websites.length ? (
                <div>
                  <label htmlFor="savedWebsite" className="text-sm font-black text-slate-800">Choose a saved website</label>
                  <p className="mt-1 text-sm text-slate-500">Use an existing workspace website, or switch to a new URL below.</p>
                  <select
                    id="savedWebsite"
                    value={websiteId}
                    onChange={(event) => {
                      setWebsiteId(event.target.value);
                      if (event.target.value) setWebsiteUrl("");
                    }}
                    className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-800 shadow-sm outline-none focus:border-sky-500"
                  >
                    <option value="">Scan a new URL instead</option>
                    {websites.map((website) => (
                      <option key={website.id} value={website.id}>
                        {website.name || website.url}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {!websiteId ? (
                <div className={websites.length ? "mt-6 border-t border-slate-100 pt-6" : ""}>
                  <label htmlFor="websiteUrl" className="text-sm font-black text-slate-800">Website URL</label>
                  <p className="mt-1 text-sm text-slate-500">Enter the public homepage URL you are authorized to review.</p>
                  <div className="mt-3 flex rounded-2xl border border-slate-300 bg-white p-1.5 shadow-sm focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100">
                    <input
                      id="websiteUrl"
                      value={websiteUrl}
                      onChange={(event) => setWebsiteUrl(event.target.value)}
                      placeholder="https://example.com"
                      className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold leading-6 text-sky-950">
                  Saved website selected. The scan will use the URL already stored in your workspace.
                </div>
              )}

              {error ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isScanning || (!websiteId && !websiteUrl.trim())}
                className="mt-6 inline-flex min-w-40 items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-950/10 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isScanning ? "Scanning securely…" : "Start security scan"}
              </button>
            </div>

            <aside className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">What happens next</p>
              <ol className="mt-4 space-y-4">
                {[
                  ["1", "Collect safe public signals"],
                  ["2", "Normalize findings and severity"],
                  ["3", "Build fix priorities"],
                  ["4", "Save the report to your account"],
                ].map(([step, label]) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200">{step}</span>
                    <span className="pt-1 text-sm font-bold leading-5 text-slate-600">{label}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 rounded-2xl bg-white p-4 text-xs font-semibold leading-5 text-slate-500 ring-1 ring-slate-200">
                No brute force, exploitation, login bypass, destructive testing, or private-data access in this flow.
              </div>
            </aside>
          </div>
        </form>
      </section>

      {result ? (
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-emerald-200 bg-white p-7 shadow-sm sm:p-8">
            <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs">✓</span>
                  Scan completed
                </div>
                <h2 className="mt-3 break-all text-2xl font-black tracking-[-0.03em] sm:text-3xl">{result.website_url}</h2>
                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                  Your report is ready with prioritized findings, developer guidance, and deeper report views.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <RiskBadge riskLevel={result.risk_level} />
                  <Link href={`/report/${result.id}`} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800">
                    Open full report
                  </Link>
                  <Link href="/dashboard" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">
                    Back to dashboard
                  </Link>
                </div>
              </div>

              <div className="min-w-40 rounded-3xl bg-slate-950 p-6 text-white shadow-lg shadow-slate-950/10">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Security score</p>
                <p className="mt-2 text-6xl font-black tracking-[-0.06em]">{result.score}</p>
                <p className="mt-1 text-sm font-bold text-slate-400">out of 100</p>
              </div>
            </div>
          </div>

          <AdvancedReportNavigation scanId={result.id} />
        </section>
      ) : null}
    </div>
  );
}
