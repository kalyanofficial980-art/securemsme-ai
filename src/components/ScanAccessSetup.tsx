"use client";

import { useEffect, useMemo, useState } from "react";
import {
  generateScanAccessToken,
  hashScanAccessTokenClient,
  SCAN_ACCESS_HEADER,
  scanAccessTokenPrefix,
} from "@/lib/scan-access-client";

type Status = "never" | "verified" | "blocked" | "error";

type Props = {
  websiteId: string;
  websiteUrl: string;
  enabled: boolean;
  tokenPrefix: string | null;
  configuredAt: string | null;
  lastVerifiedAt: string | null;
  lastStatus: Status;
};

function storageKey(websiteId: string) {
  return `veyra:scan-access:${websiteId}`;
}

function statusLabel(status: Status) {
  if (status === "verified") return "Verified";
  if (status === "blocked") return "Blocked by WAF";
  if (status === "error") return "Could not verify";
  return "Not tested";
}

export function ScanAccessSetup(props: Props) {
  const [token, setToken] = useState("");
  const [enabled, setEnabled] = useState(props.enabled);
  const [prefix, setPrefix] = useState(props.tokenPrefix || "");
  const [status, setStatus] = useState<Status>(props.lastStatus || "never");
  const [lastVerifiedAt, setLastVerifiedAt] = useState(props.lastVerifiedAt);
  const [busy, setBusy] = useState<"configure" | "test" | "revoke" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey(props.websiteId));
    if (saved) setToken(saved);
  }, [props.websiteId]);

  const origin = useMemo(() => {
    try {
      return new URL(props.websiteUrl).origin;
    } catch {
      return props.websiteUrl;
    }
  }, [props.websiteUrl]);

  async function configureNewToken() {
    setBusy("configure");
    setError("");
    setMessage("");
    try {
      const nextToken = generateScanAccessToken();
      const tokenHash = await hashScanAccessTokenClient(nextToken);
      const tokenPrefix = scanAccessTokenPrefix(nextToken);
      const response = await fetch(`/api/websites/${props.websiteId}/scan-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "configure", tokenHash, tokenPrefix }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Scan Access could not be configured.");

      setToken(nextToken);
      sessionStorage.setItem(storageKey(props.websiteId), nextToken);
      setEnabled(true);
      setPrefix(tokenPrefix);
      setStatus("never");
      setLastVerifiedAt(null);
      setMessage("New token generated. Copy it now, update your WAF rule, then test access. VeyraSec stores only its SHA-256 hash.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scan Access could not be configured.");
    } finally {
      setBusy(null);
    }
  }

  async function testAccess() {
    if (!token) {
      setError("Paste the configured Scan Access token first. If it is lost, rotate it.");
      return;
    }
    setBusy("test");
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/websites/${props.websiteId}/scan-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", token }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Scan Access test failed.");

      setStatus(payload?.status || "error");
      if (payload?.verified) {
        const now = new Date().toISOString();
        setLastVerifiedAt(now);
        setMessage(`Verified: ${payload.reason}`);
      } else {
        setMessage(`Not verified: ${payload?.reason || "The WAF still blocked or altered the scanner response."}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scan Access test failed.");
    } finally {
      setBusy(null);
    }
  }

  async function revokeAccess() {
    setBusy("revoke");
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/websites/${props.websiteId}/scan-access`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Scan Access could not be revoked.");
      sessionStorage.removeItem(storageKey(props.websiteId));
      setToken("");
      setEnabled(false);
      setPrefix("");
      setStatus("never");
      setLastVerifiedAt(null);
      setMessage("VeyraSec token revoked. Remove the matching WAF bypass rule from your hosting provider too.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scan Access could not be revoked.");
    } finally {
      setBusy(null);
    }
  }

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setMessage("Token copied. Treat it like a secret and configure only the exact VeyraSec scan header rule.");
  }

  return (
    <div className="space-y-6">
      <section className="border border-slate-300 bg-white">
        <div className="border-b border-slate-200 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Verified Scan Access</p>
          <h2 className="mt-2 text-2xl font-semibold">Let Deep Scan pass your WAF without disabling protection</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            VeyraSec sends one high-entropy header only during your authorized Deep Scan. The raw token is not stored in the VeyraSec database; only a SHA-256 hash and short prefix are retained for verification and rotation.
          </p>
        </div>

        <div className="grid gap-0 md:grid-cols-4">
          {[
            ["State", enabled ? "Configured" : "Not configured"],
            ["Token prefix", prefix || "—"],
            ["Access test", statusLabel(status)],
            ["Last verified", lastVerifiedAt ? new Date(lastVerifiedAt).toLocaleString() : "Never"],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-slate-200 p-5 md:border-b-0 md:border-r last:border-r-0">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
              <p className="mt-2 break-all text-sm font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-slate-300 bg-white p-6">
        <h3 className="text-lg font-semibold">1. Generate or rotate the token</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Rotation immediately invalidates the previous token inside VeyraSec. Update the WAF rule at the same time and remove the old value from your provider.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={configureNewToken} disabled={busy !== null} className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy === "configure" ? "Generating…" : enabled ? "Rotate token" : "Generate token"}
          </button>
          {token ? (
            <button type="button" onClick={copyToken} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800">
              Copy token
            </button>
          ) : null}
        </div>
        {token ? (
          <div className="mt-4 border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-800">Current token — shown from this browser session only</p>
            <code className="mt-2 block break-all text-sm text-amber-950">{token}</code>
          </div>
        ) : null}
      </section>

      <section className="border border-slate-300 bg-white p-6">
        <h3 className="text-lg font-semibold">2. Add a narrow WAF allow/bypass rule</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Scope the rule to <strong>{origin}</strong> and require an exact header match. Do not disable the firewall globally and do not create a broad User-Agent bypass.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold">Rule condition</p>
            <p className="mt-2 text-sm text-slate-600">Header name</p>
            <code className="mt-1 block break-all text-sm">{SCAN_ACCESS_HEADER}</code>
            <p className="mt-3 text-sm text-slate-600">Header value</p>
            <code className="mt-1 block break-all text-sm">{token || "your generated vyscan_… token"}</code>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-slate-900">Provider guidance</p>
            <p className="mt-2"><strong>Vercel:</strong> create a custom firewall rule matching this exact header and scope it to the project/domain; use the narrow bypass action for system mitigations.</p>
            <p className="mt-2"><strong>Cloudflare / other WAF:</strong> create an exact-header custom rule that skips only the bot/WAF challenge blocking VeyraSec requests for this hostname.</p>
          </div>
        </div>
      </section>

      <section className="border border-slate-300 bg-white p-6">
        <h3 className="text-lg font-semibold">3. Test before running Deep Scan</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value.trim())}
            autoComplete="off"
            placeholder="Paste the configured vyscan_… token"
            className="rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
          />
          <button type="button" onClick={testAccess} disabled={busy !== null || !enabled} className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy === "test" ? "Testing…" : "Test Scan Access"}
          </button>
          <button type="button" onClick={revokeAccess} disabled={busy !== null || !enabled} className="rounded-md border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50">
            {busy === "revoke" ? "Revoking…" : "Revoke"}
          </button>
        </div>
        {message ? <p className="mt-4 border-l-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p> : null}
        {error ? <p className="mt-4 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p> : null}
      </section>
    </div>
  );
}
