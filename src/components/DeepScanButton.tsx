"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  async function runDeepScan() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/websites/${websiteId}/deep-scan`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.scan?.id) {
        setError(data.error || "Deep scan failed.");
        // A failed fresh ownership proof check can revoke verification and
        // deep-scan access on the server. Refresh immediately so the badge,
        // button state, and server-rendered website data cannot remain stale.
        router.refresh();
        return;
      }

      router.push(`/report/${data.scan.id}/vulnerability-intelligence`);
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
    <div>
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={runDeepScan}
        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Running deep scan..." : "Run authorized deep scan"}
      </button>

      {error ? (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
