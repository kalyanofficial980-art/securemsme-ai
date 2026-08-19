"use client";

import Link from "next/link";
import { useState } from "react";
import { AdvancedReportNavigation } from "@/components/AdvancedReportNavigation";
import { RiskBadge } from "@/components/RiskBadge";
import { toClientSafeScanError } from "@/lib/security/scan-error";

type WebsiteOption = { id: string; url: string; name?: string | null };
type ScanResponse = { scan?: { id: string; website_url: string; score: number; risk_level: string; report?: Record<string, unknown>; created_at?: string }; error?: string };
type ScanFormProps = { websites?: WebsiteOption[]; selectedWebsiteId?: string };

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
        body: JSON.stringify({ websiteUrl: manualWebsiteUrl || undefined, websiteId: manualWebsiteUrl ? undefined : websiteId || undefined }),
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
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="border-b border-slate-200 pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Safe public scan</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Run a website security review</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Collect public signals, normalize findings and save a customer-facing report. Deeper checks remain behind ownership verification.</p>
          </div>

          <form onSubmit={handleScan} className="mt-6 border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold">Scan target</div>
            <div className="p-5 sm:p-6">
              {websites.length ? (
                <div>
                  <label htmlFor="savedWebsite" className="text-sm font-semibold">Saved website</label>
                  <select id="savedWebsite" value={websiteId} onChange={(event) => { setWebsiteId(event.target.value); if (event.target.value) setWebsiteUrl(""); }} className="mt-2 w-full border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-600">
                    <option value="">Use a new URL</option>
                    {websites.map((website) => <option key={website.id} value={website.id}>{website.name || website.url}</option>)}
                  </select>
                </div>
              ) : null}

              {!websiteId ? (
                <div className={websites.length ? "mt-5" : ""}>
                  <label htmlFor="websiteUrl" className="text-sm font-semibold">Public website URL</label>
                  <input id="websiteUrl" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" className="mt-2 w-full border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-blue-600" />
                </div>
              ) : (
                <p className="mt-5 border-l-2 border-blue-600 bg-blue-50 px-4 py-3 text-sm text-blue-950">The saved website URL will be used for this scan.</p>
              )}

              {error ? <div className="mt-5 border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div> : null}

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
                <button type="submit" disabled={isScanning || (!websiteId && !websiteUrl.trim())} className="bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {isScanning ? "Scanning…" : "Start scan"}
                </button>
                <Link href="/websites/new" className="text-sm font-semibold text-blue-700">Add website instead →</Link>
              </div>
            </div>
          </form>
        </section>

        <aside className="border border-slate-200 self-start">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold">Workflow</div>
          <ol className="divide-y divide-slate-200 text-sm">
            {[["01", "Collect public signals"], ["02", "Normalize severity"], ["03", "Build fix priorities"], ["04", "Save report evidence"]].map(([step, label]) => (
              <li key={step} className="grid grid-cols-[38px_1fr] gap-3 px-5 py-4"><span className="font-mono text-xs text-slate-400">{step}</span><span className="font-medium text-slate-700">{label}</span></li>
            ))}
          </ol>
          <div className="border-t border-slate-200 bg-slate-50 p-5 text-xs leading-5 text-slate-500">No brute force, exploitation, login bypass, destructive testing or private-data access in the standard flow.</div>
        </aside>
      </div>

      {result ? (
        <section>
          <div className="border border-slate-200">
            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-700">Scan completed</p>
                <h2 className="mt-2 break-all text-2xl font-semibold tracking-[-0.03em]">{result.website_url}</h2>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <RiskBadge riskLevel={result.risk_level} />
                  <Link href={`/report/${result.id}`} className="bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Open report</Link>
                  <Link href="/dashboard" className="text-sm font-semibold text-blue-700">Dashboard →</Link>
                </div>
              </div>
              <div className="border-l-2 border-blue-600 pl-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Score</p>
                <p className="mt-1 text-4xl font-semibold tracking-[-0.05em]">{result.score}<span className="ml-1 text-sm font-normal text-slate-500">/100</span></p>
              </div>
            </div>
          </div>
          <div className="mt-6"><AdvancedReportNavigation scanId={result.id} /></div>
        </section>
      ) : null}
    </div>
  );
}
