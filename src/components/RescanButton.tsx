"use client";

import { useState } from "react";
import { toClientSafeScanError } from "@/lib/security/scan-error";

type RescanButtonProps = {
  websiteId: string;
  label?: string;
};

export function RescanButton({
  websiteId,
  label = "Rescan now",
}: RescanButtonProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");

  async function handleRescan() {
    setIsScanning(true);
    setError("");

    try {
      const response = await fetch(`/api/websites/${websiteId}/rescan`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(toClientSafeScanError(data.error));
        return;
      }

      window.location.href = `/report/${data.scan.id}`;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleRescan}
        disabled={isScanning}
        className="rounded-full bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isScanning ? "Scanning..." : label}
      </button>

      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
