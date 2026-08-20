"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "normal" | "retest" | "deep";

const labels: Record<Mode, string> = {
  normal: "Run Normal Scan",
  retest: "Run Retest",
  deep: "Run Deep Scan",
};

export function AdminScanLabControls() {
  const router = useRouter();
  const [running, setRunning] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(mode: Mode) {
    setRunning(mode);
    setError(null);

    try {
      const response = await fetch("/api/admin/self-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.scan?.id) {
        setError(payload?.error || "Admin scan failed.");
        return;
      }

      router.push(`/report/${payload.scan.id}`);
      router.refresh();
    } catch {
      setError("Admin scan failed. Check the connection and try again.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {(["normal", "retest", "deep"] as Mode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => run(mode)}
            disabled={running !== null}
            className={`border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === "deep"
                ? "border-blue-700 bg-blue-700 text-white hover:bg-blue-800"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            {running === mode ? "Running…" : labels[mode]}
          </button>
        ))}
      </div>
      {error ? (
        <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      ) : null}
    </div>
  );
}
