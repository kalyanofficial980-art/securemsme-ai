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

export type EmailSecurityInfo = {
  domain: string;
  mxRecords: string[];
  spfRecord?: string;
  dmarcRecord?: string;
  dmarcPolicy?: string;
};

export type PublicFileCheck = {
  path: string;
  status?: number;
  exposed: boolean;
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
    emailSecurity?: EmailSecurityInfo;
    hygiene?: {
      robotsTxt: boolean;
      sitemapXml: boolean;
      securityTxt: boolean;
      sensitiveFiles: PublicFileCheck[];
      mixedContentCount: number;
      cookieCount: number;
      insecureCookieCount: number;
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

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
];

const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
]);

const MAX_SAFE_REDIRECTS = 3;

const SENSITIVE_PUBLIC_PATHS = [
  "/.env",
  "/.git/config",
  "/config.php",
  "/backup.zip",
  "/database.sql",
  "/db.sql",
  "/wp-config.php.bak",
];

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

function getEmailDomain(hostname: string) {
  const lowerHost = hostname.toLowerCase();

  if (lowerHost.startsWith("www.")) {
    return lowerHost.slice(4);
  }

  return lowerHost;
}

function isPrivateIp(ip: string) {
  if (net.isIP(ip) === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b, c] = parts;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      (a >= 224 && a <= 239) ||
      a >= 240
    );
  }

  if (net.isIP(ip) === 6) {
    const lowered = ip.toLowerCase();

    return (
      lowered === "::" ||
      lowered === "::1" ||
      lowered.startsWith("fc") ||
      lowered.startsWith("fd") ||
      lowered.startsWith("fe80") ||
      lowered.startsWith("::ffff:127.") ||
      lowered.startsWith("::ffff:10.") ||
      lowered.startsWith("::ffff:192.168.") ||
      lowered.startsWith("::ffff:169.254.")
    );
  }

  return false;
}

function isBlockedHostname(hostname: string) {
  const lower = hostname.toLowerCase().replace(/\.$/, "");

  return (
    PRIVATE_HOSTS.has(lower) ||
    BLOCKED_HOSTNAMES.has(lower) ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => lower.endsWith(suffix))
  );
}

async function validatePublicHost(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS websites are allowed");
  }

  if (url.username || url.password) {
    throw new Error("URLs with username/password are not allowed");
  }

  if (url.port && !["80", "443"].includes(url.port)) {
    throw new Error("Only standard website ports 80 and 443 are allowed");
  }

  const hostname = url.hostname.toLowerCase();

  if (isBlockedHostname(hostname)) {
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

function isRedirectStatus(status: number) {
  return [301, 302, 303, 307, 308].includes(status);
}

async function fetchOnceWithTimeout(url: string, options?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "user-agent": "SecureMSME-AI-Safety-Checker/0.4",
        ...(options?.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithTimeout(url: string, options?: RequestInit) {
  let currentUrl = new URL(url);
  await validatePublicHost(currentUrl);

  if (options?.redirect === "manual") {
    return fetchOnceWithTimeout(currentUrl.toString(), options);
  }

  for (let redirectCount = 0; redirectCount <= MAX_SAFE_REDIRECTS; redirectCount++) {
    const response = await fetchOnceWithTimeout(currentUrl.toString(), options);

    if (!isRedirectStatus(response.status)) {
      return response;
    }

    const location = response.headers.get("location");

    if (!location) {
      return response;
    }

    const nextUrl = new URL(location, currentUrl);
    await validatePublicHost(nextUrl);
    currentUrl = nextUrl;
  }

  throw new Error("Too many redirects while checking website");
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

async function getStatusForPath(baseUrl: URL, path: string) {
  const testUrl = new URL(path, baseUrl.origin);

  try {
    const response = await fetchWithTimeout(testUrl.toString(), {
      method: "GET",
      redirect: "manual",
    });

    return response.status;
  } catch {
    return undefined;
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

async function resolveTxtRecords(domain: string) {
  try {
    const records = await dns.resolveTxt(domain);
    return records.map((recordParts) => recordParts.join(""));
  } catch {
    return [];
  }
}

async function checkEmailSecurity(
  hostname: string,
): Promise<EmailSecurityInfo> {
  const domain = getEmailDomain(hostname);

  let mxRecords: string[] = [];

  try {
    const mx = await dns.resolveMx(domain);
    mxRecords = mx
      .sort((a, b) => a.priority - b.priority)
      .map((record) => record.exchange);
  } catch {
    mxRecords = [];
  }

  const txtRecords = await resolveTxtRecords(domain);
  const spfRecord = txtRecords.find((record) =>
    record.toLowerCase().startsWith("v=spf1"),
  );

  const dmarcRecords = await resolveTxtRecords(`_dmarc.${domain}`);
  const dmarcRecord = dmarcRecords.find((record) =>
    record.toLowerCase().startsWith("v=dmarc1"),
  );

  const dmarcPolicyMatch = dmarcRecord?.match(/(?:^|;)\s*p=([^;]+)/i);
  const dmarcPolicy = dmarcPolicyMatch?.[1]?.toLowerCase();

  return {
    domain,
    mxRecords,
    spfRecord,
    dmarcRecord,
    dmarcPolicy,
  };
}

function getCookieSecurity(headers: Record<string, string>) {
  const setCookieHeader = headers["set-cookie"];

  if (!setCookieHeader) {
    return {
      cookieCount: 0,
      insecureCookieCount: 0,
    };
  }

  const cookies = setCookieHeader.split(/,(?=[^;,]+=)/g);
  const insecureCookies = cookies.filter((cookie) => {
    const lower = cookie.toLowerCase();
    return !lower.includes("secure") || !lower.includes("httponly");
  });

  return {
    cookieCount: cookies.length,
    insecureCookieCount: insecureCookies.length,
  };
}

async function getHomepageHtml(url: URL) {
  try {
    const response = await fetchWithTimeout(url.toString(), { method: "GET" });
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return "";
    }

    return await response.text();
  } catch {
    return "";
  }
}

function countMixedContent(html: string) {
  const matches = html.match(/(?:src|href)=["']http:\/\//gi);
  return matches?.length ?? 0;
}

export async function scanWebsite(inputUrl: string): Promise<ScanReport> {
  const url = normalizeUrl(inputUrl);

  await validatePublicHost(url);

  const startedAt = Date.now();
  let response: Response | null = null;
  let responseTimeMs = 0;
  const headers: Record<string, string> = {};

  try {
    response = await fetchWithTimeout(url.toString(), { method: "GET" });
    responseTimeMs = Date.now() - startedAt;

    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
  } catch {
    responseTimeMs = Date.now() - startedAt;
  }

  const findings: ScanFinding[] = [];

  if (!response) {
    const httpsPass = url.protocol === "https:";
    const sslInfo =
      url.protocol === "https:" ? await getSslCertificate(url.hostname) : null;
    const emailSecurity = await checkEmailSecurity(url.hostname);
    const httpsRedirect = await checkHttpsRedirect(url);

    findings.push({
      name: "Homepage reachability",
      status: "warning",
      message:
        "The homepage could not be fetched from the scanner server, so this limited report uses safe passive checks only.",
      points: 0,
      maxPoints: 10,
    });

    findings.push({
      name: "HTTPS / SSL",
      status: httpsPass ? "pass" : "fail",
      message: httpsPass
        ? "Website is using HTTPS."
        : "Website is not using HTTPS. Customers may not trust it.",
      points: httpsPass ? 10 : 0,
      maxPoints: 10,
    });

    findings.push({
      name: "MX records",
      status: emailSecurity.mxRecords.length > 0 ? "pass" : "warning",
      message:
        emailSecurity.mxRecords.length > 0
          ? `${emailSecurity.mxRecords.length} mail exchange record(s) found for ${emailSecurity.domain}.`
          : `No MX records found for ${emailSecurity.domain}. Business email may not be configured.`,
      points: emailSecurity.mxRecords.length > 0 ? 10 : 3,
      maxPoints: 10,
    });

    findings.push({
      name: "SPF record",
      status: emailSecurity.spfRecord ? "pass" : "warning",
      message: emailSecurity.spfRecord
        ? "SPF record found. This helps reduce email spoofing."
        : "SPF record was not found. Add SPF to reduce email spoofing risk.",
      points: emailSecurity.spfRecord ? 15 : 4,
      maxPoints: 15,
    });

    findings.push({
      name: "DMARC record",
      status: emailSecurity.dmarcRecord ? "pass" : "fail",
      message: emailSecurity.dmarcRecord
        ? "DMARC record found."
        : "DMARC record was not found. Add DMARC to protect business email identity.",
      points: emailSecurity.dmarcRecord ? 15 : 0,
      maxPoints: 15,
    });

    return {
      url: inputUrl,
      normalizedUrl: url.toString(),
      checkedAt: new Date().toISOString(),
      findings,
      raw: {
        responseTimeMs,
        ssl: sslInfo ?? undefined,
        httpsRedirect,
        emailSecurity,
        hygiene: {
          robotsTxt: false,
          sitemapXml: false,
          securityTxt: false,
          sensitiveFiles: [],
          mixedContentCount: 0,
          cookieCount: 0,
          insecureCookieCount: 0,
        },
      },
    };
  }

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

  const emailSecurity = await checkEmailSecurity(url.hostname);

  findings.push({
    name: "MX records",
    status: emailSecurity.mxRecords.length > 0 ? "pass" : "warning",
    message:
      emailSecurity.mxRecords.length > 0
        ? `${emailSecurity.mxRecords.length} mail exchange record(s) found for ${emailSecurity.domain}.`
        : `No MX records found for ${emailSecurity.domain}. Business email may not be configured.`,
    points: emailSecurity.mxRecords.length > 0 ? 10 : 3,
    maxPoints: 10,
  });

  findings.push({
    name: "SPF record",
    status: emailSecurity.spfRecord ? "pass" : "warning",
    message: emailSecurity.spfRecord
      ? "SPF record found. This helps reduce email spoofing."
      : "SPF record was not found. Add SPF to reduce email spoofing risk.",
    points: emailSecurity.spfRecord ? 15 : 4,
    maxPoints: 15,
  });

  findings.push({
    name: "DMARC record",
    status: emailSecurity.dmarcRecord ? "pass" : "fail",
    message: emailSecurity.dmarcRecord
      ? "DMARC record found."
      : "DMARC record was not found. Add DMARC to protect business email identity.",
    points: emailSecurity.dmarcRecord ? 15 : 0,
    maxPoints: 15,
  });

  const dmarcPolicy = emailSecurity.dmarcPolicy;

  findings.push({
    name: "DMARC policy strength",
    status:
      dmarcPolicy === "reject" || dmarcPolicy === "quarantine"
        ? "pass"
        : dmarcPolicy === "none"
          ? "warning"
          : "fail",
    message:
      dmarcPolicy === "reject"
        ? "DMARC policy is set to reject. This is strong protection."
        : dmarcPolicy === "quarantine"
          ? "DMARC policy is set to quarantine. This is good protection."
          : dmarcPolicy === "none"
            ? "DMARC policy is monitoring only. Move to quarantine or reject after testing."
            : "DMARC policy was not found or could not be read.",
    points:
      dmarcPolicy === "reject"
        ? 15
        : dmarcPolicy === "quarantine"
          ? 12
          : dmarcPolicy === "none"
            ? 5
            : 0,
    maxPoints: 15,
  });

  const robotsTxt = await pageExists(url, "/robots.txt");
  findings.push({
    name: "robots.txt",
    status: robotsTxt ? "pass" : "warning",
    message: robotsTxt
      ? "robots.txt file was found."
      : "robots.txt was not found. Add it to guide search engines and crawlers.",
    points: robotsTxt ? 5 : 2,
    maxPoints: 5,
  });

  const sitemapXml = await pageExists(url, "/sitemap.xml");
  findings.push({
    name: "sitemap.xml",
    status: sitemapXml ? "pass" : "warning",
    message: sitemapXml
      ? "sitemap.xml file was found."
      : "sitemap.xml was not found. Add it to improve website discoverability.",
    points: sitemapXml ? 5 : 2,
    maxPoints: 5,
  });

  const securityTxt =
    (await pageExists(url, "/.well-known/security.txt")) ||
    (await pageExists(url, "/security.txt"));

  findings.push({
    name: "security.txt",
    status: securityTxt ? "pass" : "warning",
    message: securityTxt
      ? "security.txt was found. This helps security researchers report issues responsibly."
      : "security.txt was not found. Add it to provide a responsible security contact.",
    points: securityTxt ? 10 : 3,
    maxPoints: 10,
  });

  const sensitiveFiles: PublicFileCheck[] = [];

  for (const path of SENSITIVE_PUBLIC_PATHS) {
    const status = await getStatusForPath(url, path);
    sensitiveFiles.push({
      path,
      status,
      exposed: status !== undefined && status >= 200 && status < 300,
    });
  }

  const exposedSensitiveFiles = sensitiveFiles.filter((item) => item.exposed);

  findings.push({
    name: "Sensitive public files",
    status:
      exposedSensitiveFiles.length === 0
        ? "pass"
        : exposedSensitiveFiles.length <= 2
          ? "warning"
          : "fail",
    message:
      exposedSensitiveFiles.length === 0
        ? "No common sensitive public files were found."
        : `${exposedSensitiveFiles.length} sensitive-looking file path(s) appear publicly reachable.`,
    points:
      exposedSensitiveFiles.length === 0
        ? 15
        : exposedSensitiveFiles.length <= 2
          ? 5
          : 0,
    maxPoints: 15,
  });

  const homepageHtml = await getHomepageHtml(url);
  const mixedContentCount = countMixedContent(homepageHtml);

  findings.push({
    name: "Mixed content",
    status:
      mixedContentCount === 0
        ? "pass"
        : mixedContentCount <= 2
          ? "warning"
          : "fail",
    message:
      mixedContentCount === 0
        ? "No obvious HTTP resources were found on the homepage."
        : `${mixedContentCount} possible HTTP resource reference(s) found on the homepage.`,
    points: mixedContentCount === 0 ? 10 : mixedContentCount <= 2 ? 5 : 0,
    maxPoints: 10,
  });

  const cookieSecurity = getCookieSecurity(headers);

  findings.push({
    name: "Cookie security",
    status:
      cookieSecurity.cookieCount === 0
        ? "pass"
        : cookieSecurity.insecureCookieCount === 0
          ? "pass"
          : "warning",
    message:
      cookieSecurity.cookieCount === 0
        ? "No Set-Cookie header observed on the homepage response."
        : cookieSecurity.insecureCookieCount === 0
          ? "Observed cookies include basic Secure and HttpOnly protection."
          : `${cookieSecurity.insecureCookieCount}/${cookieSecurity.cookieCount} observed cookie(s) may be missing Secure or HttpOnly.`,
    points:
      cookieSecurity.cookieCount === 0
        ? 10
        : cookieSecurity.insecureCookieCount === 0
          ? 10
          : 4,
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
      emailSecurity,
      hygiene: {
        robotsTxt,
        sitemapXml,
        securityTxt,
        sensitiveFiles,
        mixedContentCount,
        cookieCount: cookieSecurity.cookieCount,
        insecureCookieCount: cookieSecurity.insecureCookieCount,
      },
    },
  };
}
