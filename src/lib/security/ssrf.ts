import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp"];
const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 1_000_000;

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  const [a, b, c] = parts;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    (a >= 224 && a <= 239) || a >= 240
  );
}

function isPrivateIPv6(ip: string): boolean {
  const value = ip.toLowerCase();
  return (
    value === "::" || value === "::1" ||
    value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80") ||
    value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") ||
    value.startsWith("::ffff:192.168.") || value.startsWith("::ffff:169.254.")
  );
}

function assertPublicAddress(address: string, family: number) {
  if (family === 4 && isPrivateIPv4(address)) throw new Error("Private/internal IPv4 target is blocked");
  if (family === 6 && isPrivateIPv6(address)) throw new Error("Private/internal IPv6 target is blocked");
}

export async function validatePublicHttpUrl(input: string): Promise<URL> {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Invalid URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https URLs are allowed");
  if (url.username || url.password) throw new Error("URLs with username/password are not allowed");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only standard web ports 80 and 443 are allowed");
  const hostname = url.hostname.toLowerCase().replace(/.$/, "");
  if (!hostname || BLOCKED_HOSTS.has(hostname) || BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) {
    throw new Error("Local/internal hostnames are blocked");
  }
  const directIpType = net.isIP(hostname);
  if (directIpType === 4) assertPublicAddress(hostname, 4);
  if (directIpType === 6) assertPublicAddress(hostname, 6);
  let records: { address: string; family: number }[] | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      records = await dns.lookup(hostname, { all: true });
      break;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";

      const transient = code === "EBUSY" || code === "EAI_AGAIN";
      if (!transient || attempt === 2) throw error;

      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }

  if (!records?.length) throw new Error("Target hostname did not resolve");
  for (const record of records) assertPublicAddress(record.address, record.family);
  return url;
}

export async function safeFetchPublicUrl(input: string, init?: RequestInit) {
  let current = await validatePublicHttpUrl(input);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(current.toString(), {
        ...init,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "SecureMSME-AI-Passive-Scanner/1.0",
          ...(init?.headers || {}),
        },
      });
      const location = response.headers.get("location");
      if (![301,302,303,307,308].includes(response.status) || !location) return response;
      current = await validatePublicHttpUrl(new URL(location, current).toString());
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Too many redirects while checking website");
}

export function assertSafeResponseSize(headers: Headers) {
  const rawLength = headers.get("content-length");
  if (rawLength && Number(rawLength) > MAX_RESPONSE_BYTES) {
    throw new Error("Response too large for passive scan");
  }
}
