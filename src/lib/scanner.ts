import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";

export type ScanFinding = {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  points: number;
  maxPoints: number;
};

export type SslCertificateInfo = {
  validTo?: string;
  daysRemaining?: number;
  subject?: string;
  issuer?: string;
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
    ssl?: SslCertificateInfo;
    httpsRedirect?: {
      testedUrl: string;
      status?: number;
      location?: string | null;
    };
  };
};

const IMPORTANT_SECURITY_HEADERS = [
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
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
      redirect: options?.redirect ?? "follow",
      headers: {
        "user-agent": "SecureMSME-AI-Safety-Checker/0.2",
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

async function checkHttpsRedirect(url: URL) {
  const httpUrl = new URL(url.toString());
  httpUrl.protocol = "http:";

  try {
    const response = await fetchWithTimeout(httpUrl.toString(), {
      method: "GET",
      redirect: "manual",
    });

    const location = response.headers.get("location");
    const redirectsToHttps = Boolean(location?.startsWith("https://"));

    return {
      testedUrl: httpUrl.toString(),
      status: response.status,
      location,
      redirectsToHttps,
    };
  } catch {
    return {
      testedUrl: httpUrl.toString(),
      redirectsToHttps: false,
    };
  }
}

function getSslCertificate(
  hostname: string,
): Promise<SslCertificateInfo | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: false,
        timeout: 8000,
      },
      () => {
        const certificate = socket.getPeerCertificate();

        socket.end();

        if (!certificate || !certificate.valid_to) {
          resolve(null);
          return;
        }

        const validToDate = new Date(certificate.valid_to);
        const now = new Date();
        const daysRemaining = Math.ceil(
          (validToDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        resolve({
          validTo: certificate.valid_to,
          daysRemaining,
          subject:
            typeof certificate.subject?.CN === "string"
              ? certificate.subject.CN
              : undefined,
          issuer:
            typeof certificate.issuer?.O === "string"
              ? certificate.issuer.O
              : typeof certificate.issuer?.CN === "string"
                ? certificate.issuer.CN
                : undefined,
        });
      },
    );

    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
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
    points: httpsPass ? 10 : 0,
    maxPoints: 10,
  });

  const sslInfo =
    url.protocol === "https:" ? await getSslCertificate(url.hostname) : null;

  if (!sslInfo) {
    findings.push({
      name: "SSL certificate expiry",
      status: "fail",
      message:
        "SSL certificate details could not be read. Check certificate setup.",
      points: 0,
      maxPoints: 15,
    });
  } else if ((sslInfo.daysRemaining ?? 0) <= 0) {
    findings.push({
      name: "SSL certificate expiry",
      status: "fail",
      message: "SSL certificate appears to be expired.",
      points: 0,
      maxPoints: 15,
    });
  } else if ((sslInfo.daysRemaining ?? 0) <= 30) {
    findings.push({
      name: "SSL certificate expiry",
      status: "warning",
      message: `SSL certificate expires in ${sslInfo.daysRemaining} days. Renew soon.`,
      points: 7,
      maxPoints: 15,
    });
  } else {
    findings.push({
      name: "SSL certificate expiry",
      status: "pass",
      message: `SSL certificate is valid for about ${sslInfo.daysRemaining} more days.`,
      points: 15,
      maxPoints: 15,
    });
  }

  const httpsRedirect = await checkHttpsRedirect(url);

  findings.push({
    name: "HTTP to HTTPS redirect",
    status: httpsRedirect.redirectsToHttps ? "pass" : "warning",
    message: httpsRedirect.redirectsToHttps
      ? "HTTP traffic redirects to HTTPS."
      : "HTTP to HTTPS redirect was not clearly detected.",
    points: httpsRedirect.redirectsToHttps ? 10 : 4,
    maxPoints: 10,
  });

  const presentHeaders = IMPORTANT_SECURITY_HEADERS.filter(
    (header) => headers[header],
  );

  findings.push({
    name: "Security headers",
    status:
      presentHeaders.length >= 4
        ? "pass"
        : presentHeaders.length >= 2
          ? "warning"
          : "fail",
    message: `${presentHeaders.length}/${IMPORTANT_SECURITY_HEADERS.length} important browser security headers found.`,
    points: Math.round(
      (presentHeaders.length / IMPORTANT_SECURITY_HEADERS.length) * 20,
    ),
    maxPoints: 20,
  });

  const hstsPresent = Boolean(headers["strict-transport-security"]);

  findings.push({
    name: "HSTS",
    status: hstsPresent ? "pass" : "warning",
    message: hstsPresent
      ? "HSTS header is present. Browsers can prefer HTTPS for this site."
      : "HSTS header was not found. Add Strict-Transport-Security after HTTPS is stable.",
    points: hstsPresent ? 10 : 3,
    maxPoints: 10,
  });

  const serverHeader = headers["server"];
  const poweredByHeader = headers["x-powered-by"];

  const exposureCount = [serverHeader, poweredByHeader].filter(Boolean).length;

  findings.push({
    name: "Server technology exposure",
    status:
      exposureCount === 0 ? "pass" : exposureCount === 1 ? "warning" : "fail",
    message:
      exposureCount === 0
        ? "Server technology headers are not publicly exposed."
        : `${exposureCount} technology header(s) exposed. Consider hiding unnecessary server details.`,
    points: exposureCount === 0 ? 10 : exposureCount === 1 ? 5 : 0,
    maxPoints: 10,
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
    points: privacyFound ? 10 : 0,
    maxPoints: 10,
  });

  const termsFound =
    (await pageExists(url, "/terms")) ||
    (await pageExists(url, "/terms-and-conditions")) ||
    (await pageExists(url, "/terms.html"));

  findings.push({
    name: "Terms page",
    status: termsFound ? "pass" : "warning",
    message: termsFound ? "Terms page was found." : "Terms page was not found.",
    points: termsFound ? 5 : 0,
    maxPoints: 5,
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
    points: contactFound ? 5 : 0,
    maxPoints: 5,
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
      ssl: sslInfo ?? undefined,
      httpsRedirect: {
        testedUrl: httpsRedirect.testedUrl,
        status: httpsRedirect.status,
        location: httpsRedirect.location,
      },
    },
  };
}
