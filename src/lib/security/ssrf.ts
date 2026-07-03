import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
]);

const BLOCKED_IPV4_RANGES = [
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
];

function isPrivateIPv4(ip: string): boolean {
  return BLOCKED_IPV4_RANGES.some((r) => r.test(ip));
}

function isPrivateIPv6(ip: string): boolean {
  const value = ip.toLowerCase();
  return (
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80:")
  );
}

export async function validatePublicHttpUrl(input: string): Promise<URL> {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are allowed");
  }

  if (url.username || url.password) {
    throw new Error("URLs with username/password are not allowed");
  }

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error("Local/internal hostnames are blocked");
  }

  const directIpType = net.isIP(hostname);

  if (directIpType === 4 && isPrivateIPv4(hostname)) {
    throw new Error("Private IPv4 targets are blocked");
  }

  if (directIpType === 6 && isPrivateIPv6(hostname)) {
    throw new Error("Private IPv6 targets are blocked");
  }

  const records = await dns.lookup(hostname, { all: true });

  for (const record of records) {
    if (record.family === 4 && isPrivateIPv4(record.address)) {
      throw new Error("DNS resolves to private IPv4 address");
    }

    if (record.family === 6 && isPrivateIPv6(record.address)) {
      throw new Error("DNS resolves to private IPv6 address");
    }
  }

  return url;
}

export async function safeFetchPublicUrl(input: string, init?: RequestInit) {
  const url = await validatePublicHttpUrl(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    return await fetch(url.toString(), {
      ...init,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "SecureMSME-AI-Passive-Scanner/1.0",
        ...(init?.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}
