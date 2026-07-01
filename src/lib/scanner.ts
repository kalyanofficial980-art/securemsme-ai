import dns from "node:dns/promises";
import net from "node:net";

export type ScanFinding = {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  points: number;
  maxPoints: number;
};

export type ScanReport = {
  url: string;
  normalizedUrl: string;
  checkedAt: string;
  findings: ScanFinding[];
  raw: {
    finalStatus?: number;
    responseTimeMs?: number;
    headers?: Record<string, string>;
  };
};

const SECURITY_HEADERS = [
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "strict-transport-security",
  "referrer-policy",
];

const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function normalizeUrl(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Website URL is required");
  }

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS websites are allowed");
  }

  url.hash = "";

  return url;
}

function isPrivateIp(ip: string) {
  if (net.isIP(ip) === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;

    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 0
    );
  }

  if (net.isIP(ip) === 6) {
    const lowered = ip.toLowerCase();
    return (
      lowered === "::1" ||
      lowered.startsWith("fc") ||
      lowered.startsWith("fd") ||
      lowered.startsWith("fe80")
    );
  }

  return false;
}

async function validatePublicHost(url: URL) {
  const hostname = url.hostname.toLowerCase();

  if (PRIVATE_HOSTS.has(hostname)) {
    throw new Error("Local/private websites are not allowed");
  }

  const records = await dns.lookup(hostname, { all: true });

  if (!records.length) {
    throw new Error("Could not resolve website hostname");
  }

  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new Error("Private/internal network targets are not allowed");
    }
  }
}

async function fetchWithTimeout(url: string, options?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "SecureMSME-AI-Safety-Checker/0.1",
        ...(options?.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function pageExists(baseUrl: URL, path: string) {
  const testUrl = new URL(path, baseUrl.origin);

  try {
    const response = await fetchWithTimeout(testUrl.toString(), {
      method: "GET",
    });

    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

export async function scanWebsite(inputUrl: string): Promise<ScanReport> {
  const url = normalizeUrl(inputUrl);

  await validatePublicHost(url);

  const startedAt = Date.now();
  const response = await fetchWithTimeout(url.toString(), { method: "GET" });
  const responseTimeMs = Date.now() - startedAt;

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const findings: ScanFinding[] = [];

  const httpsPass = url.protocol === "https:";
  findings.push({
    name: "HTTPS / SSL",
    status: httpsPass ? "pass" : "fail",
    message: httpsPass
      ? "Website is using HTTPS."
      : "Website is not using HTTPS. Customers may not trust it.",
    points: httpsPass ? 20 : 0,
    maxPoints: 20,
  });

  const presentHeaders = SECURITY_HEADERS.filter((header) => headers[header]);
  findings.push({
    name: "Security headers",
    status:
      presentHeaders.length >= 4
        ? "pass"
        : presentHeaders.length >= 2
          ? "warning"
          : "fail",
    message: `${presentHeaders.length}/${SECURITY_HEADERS.length} important security headers found.`,
    points: Math.round((presentHeaders.length / SECURITY_HEADERS.length) * 30),
    maxPoints: 30,
  });

  const privacyFound =
    (await pageExists(url, "/privacy-policy")) ||
    (await pageExists(url, "/privacy")) ||
    (await pageExists(url, "/privacy.html"));

  findings.push({
    name: "Privacy policy",
    status: privacyFound ? "pass" : "fail",
    message: privacyFound
      ? "Privacy policy page was found."
      : "Privacy policy page was not found.",
    points: privacyFound ? 15 : 0,
    maxPoints: 15,
  });

  const termsFound =
    (await pageExists(url, "/terms")) ||
    (await pageExists(url, "/terms-and-conditions")) ||
    (await pageExists(url, "/terms.html"));

  findings.push({
    name: "Terms page",
    status: termsFound ? "pass" : "warning",
    message: termsFound ? "Terms page was found." : "Terms page was not found.",
    points: termsFound ? 10 : 0,
    maxPoints: 10,
  });

  const contactFound =
    (await pageExists(url, "/contact")) ||
    (await pageExists(url, "/contact-us")) ||
    (await pageExists(url, "/contact.html"));

  findings.push({
    name: "Contact page",
    status: contactFound ? "pass" : "warning",
    message: contactFound
      ? "Contact page was found."
      : "Contact page was not found.",
    points: contactFound ? 10 : 0,
    maxPoints: 10,
  });

  const adminPaths = ["/wp-admin", "/admin", "/login"];
  const exposedAdminResults = await Promise.all(
    adminPaths.map(async (path) => ({
      path,
      exists: await pageExists(url, path),
    })),
  );

  const exposedAdminCount = exposedAdminResults.filter(
    (item) => item.exists,
  ).length;

  findings.push({
    name: "Common admin/login paths",
    status:
      exposedAdminCount === 0
        ? "pass"
        : exposedAdminCount === 1
          ? "warning"
          : "fail",
    message:
      exposedAdminCount === 0
        ? "Common admin paths were not publicly visible."
        : `${exposedAdminCount} common admin/login path(s) appear publicly reachable.`,
    points: exposedAdminCount === 0 ? 15 : exposedAdminCount === 1 ? 8 : 0,
    maxPoints: 15,
  });

  return {
    url: inputUrl,
    normalizedUrl: url.toString(),
    checkedAt: new Date().toISOString(),
    findings,
    raw: {
      finalStatus: response.status,
      responseTimeMs,
      headers,
    },
  };
}
