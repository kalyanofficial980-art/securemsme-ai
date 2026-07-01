"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PassiveAuditImportForm() {
  const router = useRouter();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [toolName, setToolName] = useState("ZAP Baseline Passive");
  const [rawJson, setRawJson] = useState("");
  const [command, setCommand] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function generateCommand() {
    setError("");
    setCommand("");

    if (!websiteUrl.trim()) {
      setError("Enter website URL first.");
      return;
    }

    const response = await fetch("/api/audit/tool-command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ websiteUrl }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Could not generate command.");
      return;
    }

    setCommand(data.command);
  }

  async function importReport() {
    setError("");
    setIsLoading(true);

    try {
      const parsedJson = JSON.parse(rawJson);

      const response = await fetch("/api/audit/import-passive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteUrl,
          toolName,
          rawReport: parsedJson,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not import passive audit report.");
        return;
      }

      router.push(`/report/${data.scan.id}/advanced`);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Invalid JSON. Paste the full passive tool JSON report.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">
          1. Generate passive test command
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          Use this only for websites you own or have permission to test. This is
          passive baseline style testing, not exploitation.
        </p>

        <label className="mt-6 block text-sm font-black text-slate-700">
          Website URL
        </label>
        <input
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          placeholder="https://example.com"
          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
        />

        <button
          onClick={generateCommand}
          className="mt-4 rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800"
          type="button"
        >
          Generate command
        </button>

        {command ? (
          <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-sm font-bold text-white">
            <p className="mb-3 text-slate-300">Run in terminal with Docker:</p>
            <code className="break-all">{command}</code>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-black text-amber-950">Important</p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Local Windows Docker may be heavy. If Docker is not installed, skip
            command generation and paste a JSON report later when available.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">2. Import passive JSON report</h2>
        <p className="mt-3 leading-7 text-slate-600">
          Paste ZAP baseline JSON or compatible passive scanner JSON. SecureMSME
          AI converts it into score, evidence records, and advanced report.
        </p>

        <label className="mt-6 block text-sm font-black text-slate-700">
          Tool name
        </label>
        <input
          value={toolName}
          onChange={(event) => setToolName(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
        />

        <label className="mt-5 block text-sm font-black text-slate-700">
          JSON report
        </label>
        <textarea
          value={rawJson}
          onChange={(event) => setRawJson(event.target.value)}
          placeholder='{"site":[{"alerts":[]}]}'
          className="mt-2 min-h-72 w-full rounded-2xl border border-slate-300 px-4 py-3 font-mono text-sm outline-none focus:border-slate-950"
        />

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
            {error}
          </div>
        ) : null}

        <button
          onClick={importReport}
          disabled={isLoading}
          className="mt-5 rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
        >
          {isLoading ? "Importing..." : "Import and create advanced audit"}
        </button>
      </div>
    </div>
  );
}
