"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function storageKey(websiteId: string) {
  return `veyra:scan-access:${websiteId}`;
}

export function DeepScanButton({
  websiteId,
  disabled,
}: {
  websiteId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanAccessToken, setScanAccessToken] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey(websiteId));
    if (saved) setScanAccessToken(saved);
  }, [websiteId]);

  async function runDeepScan() {
    setError("");
    setIsLoading(true);

    try {
      const token = scanAccessToken.trim();
      const response = await fetch(`/api/websites/${websiteId}/deep-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { scanAccessToken: token } : {}),
      });
      const data = await response.json();

      if (!response.ok || !data.scan?.id) {
        setError(data.error || "Deep scan failed.");
        router.refresh();
        return;
      }

      if (token) sessionStorage.setItem(storageKey(websiteId), token);
      router.push(`/report/${data.scan.id}/deep`);
      router.refresh();
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Deep scan failed. Please try again.",
      );
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-w-[280px]">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          value={scanAccessToken}
          onChange={(event) => setScanAccessToken(event.target.value.trim())}
          autoComplete="off"
          placeholder="Scan Access token (optional)"
          disabled={disabled || isLoading}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || isLoading}
          onClick={runDeepScan}
          className="rounded-md bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Running…" : "Run Deep Scan V1"}
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        WAF-protected site? <Link href={`/websites/${websiteId}/scan-access`} className="font-semibold text-blue-700 hover:text-blue-900">Configure Verified Scan Access</Link>. The raw token is used only for this authorized scan request.
      </p>

      {error ? (
        <p className="mt-3 border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
