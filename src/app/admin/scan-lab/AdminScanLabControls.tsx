"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateScanAccessToken, SCAN_ACCESS_HEADER } from "@/lib/scan-access-client";

type Mode = "normal" | "retest" | "deep";

const labels: Record<Mode, string> = {
  normal: "Run Normal Scan",
  retest: "Run Retest",
  deep: "Run Deep Scan V1",
};

const ADMIN_STORAGE_KEY = "veyra:admin-self-scan-access";

export function AdminScanLabControls() {
  const router = useRouter();
  const [running, setRunning] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [scanAccessToken, setScanAccessToken] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    if (saved) setScanAccessToken(saved);
  }, []);

  function generateToken() {
    const token = generateScanAccessToken();
    setScanAccessToken(token);
    sessionStorage.setItem(ADMIN_STORAGE_KEY, token);
    setMessage(`Configure the Vercel firewall to bypass the bot/WAF challenge only when ${SCAN_ACCESS_HEADER} exactly matches this token, then run Deep Scan V1.`);
    setError(null);
  }

  async function copyToken() {
    if (!scanAccessToken) return;
    await navigator.clipboard.writeText(scanAccessToken);
    setMessage("Scan Access token copied. Keep the WAF rule scoped to the VeyraSec production domain only.");
  }

  async function run(mode: Mode) {
    setRunning(mode);
    setError(null);
    setMessage(null);

    try {
      const body = mode === "deep" && scanAccessToken.trim()
        ? { mode, scanAccessToken: scanAccessToken.trim() }
        : { mode };
      const response = await fetch("/api/admin/self-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.scan?.id) {
        setError(payload?.error || "Admin scan failed.");
        return;
      }

      if (mode === "deep" && scanAccessToken.trim()) {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, scanAccessToken.trim());
      }
      router.push(mode === "deep" ? `/report/${payload.scan.id}/deep` : `/report/${payload.scan.id}`);
      router.refresh();
    } catch {
      setError("Admin scan failed. Check the connection and try again.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div>
      <div className="mb-5 border border-slate-300 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Optional Verified Scan Access</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The VeyraSec production domain currently challenges scanner traffic. Generate a high-entropy token, add an exact-header Vercel firewall bypass for this domain only, then paste/use it for Deep Scan V1. The token stays in this browser session and is not persisted by the admin scan API.
        </p>
        <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto_auto]">
          <input
            type="password"
            value={scanAccessToken}
            onChange={(event) => setScanAccessToken(event.target.value.trim())}
            autoComplete="off"
            placeholder="vyscan_… token"
            className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600"
          />
          <button type="button" onClick={generateToken} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800">
            Generate token
          </button>
          <button type="button" onClick={copyToken} disabled={!scanAccessToken} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50">
            Copy
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Header: <code>{SCAN_ACCESS_HEADER}</code></p>
      </div>

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
      {message ? (
        <div className="mt-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      ) : null}
    </div>
  );
}
