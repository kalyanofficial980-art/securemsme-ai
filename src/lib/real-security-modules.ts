import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";
import type { PentestIntensity } from "@/lib/authorized-pentest-engine";
import { validatePublicHttpUrl } from "@/lib/security/ssrf";

export type RealModuleSeverity =
  "Critical" | "High" | "Medium" | "Low" | "Info";
export type RealModuleStatus = "completed" | "failed" | "blocked" | "skipped";
export type RealModuleRiskLevel = "safe" | "controlled" | "sensitive";

export type RealModuleFinding = {
  title: string;
  severity: RealModuleSeverity;
  category: string;
  evidence: string[];
  customerImpact: string;
  developerFix: string;
  safeClaim: string;
  blockedClaim: string;
};

export type RealModuleResult = {
  moduleId: string;
  moduleName: string;
  customerName: string;
  category: string;
  status: RealModuleStatus;
  riskLevel: RealModuleRiskLevel;
  evidence: string[];
  findings: RealModuleFinding[];
  outputSummary: Record<string, unknown>;
  safeClaim: string;
  blockedClaim: string;
  errorMessage?: string;
};

export type RealSecurityModuleReport = {
  version: string;
  generatedAt: string;
  targetUrl: string;
  hostname: string;
  intensity: PentestIntensity;
  allowedMethods: string[];
  safetyBoundary: string[];
  privateTargetBlocked: boolean;
  totalModules: number;
  completedModules: number;
  failedModules: number;
  blockedModules: number;
  highPriorityFindings: number;
  results: RealModuleResult[];
  customerSummary: string;
};

const REAL_MODULE_BOUNDARY = [
  "Verified website scope required",
  "Permission attestation required",
  "No exploit payloads",
  "No brute force",
  "No login bypass",
  "No form submission",
  "No destructive testing",
  "No private data collection",
  "Controlled low-rate network checks only",
  "Internal/private targets are blocked",
];

const PRIVATE_HOST_PATTERNS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
];

function isPrivateIPv4(ip: string) {
  const parts = ip.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part)))
    return false;

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0 ||
    a >= 224
  );
}

function isPrivateIPv6(ip: string) {
  const lower = ip.toLowerCase();

  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:") ||
    lower.includes("::ffff:127.") ||
    lower.includes("::ffff:10.") ||
    lower.includes("::ffff:192.168.")
  );
}

function normalizeTargetUrl(input: string) {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS targets are allowed.");
  }

  return url;
}

async function assertPublicTarget(url: URL) {
  const hostname = url.hostname.toLowerCase();

  if (
    PRIVATE_HOST_PATTERNS.includes(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error("Private/internal hostnames are blocked.");
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: false });

  if (!addresses.length) {
    throw new Error("Could not resolve target hostname.");
  }

  const privateAddress = addresses.find((address) =>
    address.family === 4
      ? isPrivateIPv4(address.address)
      : isPrivateIPv6(address.address),
  );

  if (privateAddress) {
    throw new Error("Resolved private/internal IP address is blocked.");
  }

  return addresses.map((address) => address.address);
}

function timeoutPromise<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timeout: NodeJS.Timeout;

  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });

  return Promise.race([promise, timer]).finally(() => clearTimeout(timeout));
}

function severityWeight(severity: RealModuleSeverity) {
  return {
    Critical: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Info: 1,
  }[severity];
}

function createFailedModule(
  moduleId: string,
  moduleName: string,
  customerName: string,
  category: string,
  error: unknown,
): RealModuleResult {
  return {
    moduleId,
    moduleName,
    customerName,
    category,
    status: "failed",
    riskLevel: "safe",
    evidence: [
      `Module failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    ],
    findings: [],
    outputSummary: {},
    safeClaim: "Can claim this module was attempted but failed safely.",
    blockedClaim: "Cannot claim a security weakness from a failed module.",
    errorMessage: error instanceof Error ? error.message : "Unknown error",
  };
}

async function runHttpSecurityModule(url: URL): Promise<RealModuleResult> {
  const target = url.toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    await validatePublicHttpUrl(target);
    const response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "SecureMSMEAI-Authorized-Review/1.0",
      },
    });

    const headerNames = [
      "strict-transport-security",
      "content-security-policy",
      "x-frame-options",
      "x-content-type-options",
      "referrer-policy",
      "permissions-policy",
      "set-cookie",
      "server",
      "x-powered-by",
      "location",
    ];

    const observedHeaders = Object.fromEntries(
      headerNames
        .map((name) => [name, response.headers.get(name)])
        .filter(([, value]) => Boolean(value)),
    );

    const missingHeaders = [
      ["strict-transport-security", "HSTS header not observed", "Medium"],
      [
        "content-security-policy",
        "Content Security Policy not observed",
        "Medium",
      ],
      ["x-frame-options", "Frame protection header not observed", "Medium"],
      ["x-content-type-options", "X-Content-Type-Options not observed", "Low"],
      ["referrer-policy", "Referrer-Policy not observed", "Low"],
    ] as const;

    const findings: RealModuleFinding[] = missingHeaders
      .filter(([header]) => !response.headers.get(header))
      .map(([, title, severity]) => ({
        title,
        severity,
        category: "HTTP Security Headers",
        evidence: [`${title} on ${target}`, `HTTP status: ${response.status}`],
        customerImpact:
          "Missing browser security headers can reduce protection against common web attack techniques.",
        developerFix:
          "Ask your developer or hosting provider to add the missing security header after testing compatibility.",
        safeClaim:
          "Can claim this header was not observed in the authorized HTTP response.",
        blockedClaim:
          "Cannot claim exploitation or compromise from a missing header alone.",
      }));

    if (
      url.protocol === "http:" &&
      response.headers.get("location")?.startsWith("https://")
    ) {
      findings.push({
        title: "HTTP to HTTPS redirect observed",
        severity: "Info",
        category: "HTTPS Redirect",
        evidence: [`Location: ${response.headers.get("location")}`],
        customerImpact:
          "HTTPS redirect helps visitors reach the encrypted version of the site.",
        developerFix: "Keep HTTPS redirect enabled across all public pages.",
        safeClaim: "Can claim HTTPS redirect was observed.",
        blockedClaim:
          "Cannot claim complete transport security from one redirect observation alone.",
      });
    }

    return {
      moduleId: "real-http-security",
      moduleName: "Real HTTP Security Module",
      customerName: "Website header and redirect check",
      category: "HTTP Security",
      status: "completed",
      riskLevel: "safe",
      evidence: [
        `Requested: ${target}`,
        `HTTP status: ${response.status}`,
        `Observed headers: ${Object.keys(observedHeaders).join(", ") || "none from tracked list"}`,
      ],
      findings,
      outputSummary: {
        status: response.status,
        redirectedLocation: response.headers.get("location"),
        observedHeaders,
        missingHeaderCount: findings.filter(
          (finding) => finding.severity !== "Info",
        ).length,
      },
      safeClaim:
        "Can claim authorized HTTP response and security header checks were performed.",
      blockedClaim:
        "Cannot claim exploitation, data access, or full pentest coverage from HTTP header checks.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runTlsModule(url: URL): Promise<RealModuleResult> {
  const hostname = url.hostname;
  const port = Number(url.port || 443);

  if (url.protocol !== "https:") {
    return {
      moduleId: "real-tls-certificate",
      moduleName: "Real TLS Certificate Module",
      customerName: "SSL/TLS certificate check",
      category: "TLS Security",
      status: "skipped",
      riskLevel: "safe",
      evidence: ["TLS module skipped because target URL is not HTTPS."],
      findings: [
        {
          title: "HTTPS not used in target URL",
          severity: "Medium",
          category: "TLS Security",
          evidence: [`Target URL protocol: ${url.protocol}`],
          customerImpact:
            "Websites should use HTTPS to protect visitor communication and trust.",
          developerFix:
            "Enable HTTPS certificate and redirect HTTP traffic to HTTPS.",
          safeClaim: "Can claim the target URL was not HTTPS.",
          blockedClaim: "Cannot claim traffic interception occurred.",
        },
      ],
      outputSummary: { skippedReason: "Target URL is not HTTPS." },
      safeClaim:
        "Can claim TLS check was skipped because target was not HTTPS.",
      blockedClaim:
        "Cannot claim TLS misconfiguration without connecting to HTTPS.",
    };
  }

  return timeoutPromise(
    new Promise<RealModuleResult>((resolve, reject) => {
      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname,
          rejectUnauthorized: false,
          timeout: 8_000,
        },
        () => {
          const certificate = socket.getPeerCertificate() as {
            subject?: Record<string, string>;
            issuer?: Record<string, string>;
            valid_from?: string;
            valid_to?: string;
            fingerprint256?: string;
          };
          const protocol = socket.getProtocol();
          const cipher = socket.getCipher();
          const authorized = socket.authorized;
          const authorizationError = socket.authorizationError;
          const validTo = certificate.valid_to
            ? new Date(certificate.valid_to)
            : null;
          const daysRemaining = validTo
            ? Math.ceil(
                (validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              )
            : null;

          const findings: RealModuleFinding[] = [];

          if (!authorized) {
            findings.push({
              title: "TLS certificate trust needs review",
              severity: "High",
              category: "TLS Certificate",
              evidence: [
                `Certificate authorized: ${authorized}`,
                `Authorization error: ${String(authorizationError || "unknown")}`,
              ],
              customerImpact:
                "Certificate trust issues can make browsers show warnings and reduce customer trust.",
              developerFix:
                "Install a valid certificate from a trusted CA and verify the full certificate chain.",
              safeClaim:
                "Can claim the TLS certificate trust status needs review from authorized connection evidence.",
              blockedClaim:
                "Cannot claim man-in-the-middle attack or data compromise.",
            });
          }

          if (daysRemaining !== null && daysRemaining <= 30) {
            findings.push({
              title: "TLS certificate expires soon",
              severity: daysRemaining <= 7 ? "High" : "Medium",
              category: "TLS Certificate",
              evidence: [
                `Certificate valid to: ${certificate.valid_to}`,
                `Days remaining: ${daysRemaining}`,
              ],
              customerImpact:
                "Expired certificates can break website access and customer trust.",
              developerFix:
                "Renew the certificate before expiry and enable automatic renewal where possible.",
              safeClaim: "Can claim the certificate expiry date was observed.",
              blockedClaim: "Cannot claim outage has already occurred.",
            });
          }

          if (!protocol || ["TLSv1", "TLSv1.1"].includes(protocol)) {
            findings.push({
              title: "Old TLS protocol detected or protocol unknown",
              severity: "Medium",
              category: "TLS Configuration",
              evidence: [`Negotiated protocol: ${protocol || "unknown"}`],
              customerImpact:
                "Old TLS versions are no longer recommended for modern websites.",
              developerFix:
                "Configure hosting/server to support TLS 1.2+ and prefer TLS 1.3 where available.",
              safeClaim:
                "Can claim negotiated TLS protocol from authorized connection evidence.",
              blockedClaim:
                "Cannot claim cryptographic compromise from protocol evidence alone.",
            });
          }

          socket.end();

          resolve({
            moduleId: "real-tls-certificate",
            moduleName: "Real TLS Certificate Module",
            customerName: "SSL/TLS certificate check",
            category: "TLS Security",
            status: "completed",
            riskLevel: "safe",
            evidence: [
              `Connected to ${hostname}:${port}`,
              `Protocol: ${protocol || "unknown"}`,
              `Cipher: ${cipher?.name || "unknown"}`,
              `Certificate subject CN: ${certificate.subject?.CN || "unknown"}`,
              `Certificate issuer: ${certificate.issuer?.O || certificate.issuer?.CN || "unknown"}`,
              `Certificate valid to: ${certificate.valid_to || "unknown"}`,
            ],
            findings,
            outputSummary: {
              protocol,
              cipher,
              authorized,
              authorizationError: authorizationError
                ? String(authorizationError)
                : null,
              subject: certificate.subject,
              issuer: certificate.issuer,
              validFrom: certificate.valid_from,
              validTo: certificate.valid_to,
              daysRemaining,
              fingerprint256: certificate.fingerprint256,
            },
            safeClaim:
              "Can claim authorized SSL/TLS certificate and protocol evidence was collected.",
            blockedClaim:
              "Cannot claim traffic interception, private key exposure, or server compromise.",
          });
        },
      );

      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("TLS connection timed out"));
      });

      socket.on("error", reject);
    }),
    10_000,
    "TLS module",
  );
}

async function runDnsEmailModule(url: URL): Promise<RealModuleResult> {
  const hostname = url.hostname;
  const domainParts = hostname.split(".");
  const rootDomain =
    domainParts.length > 2 ? domainParts.slice(-2).join(".") : hostname;

  const [aRecords, aaaaRecords, mxRecords, txtRecords, dmarcRecords] =
    await Promise.all([
      dns.resolve4(hostname).catch(() => [] as string[]),
      dns.resolve6(hostname).catch(() => [] as string[]),
      dns
        .resolveMx(rootDomain)
        .catch(() => [] as Array<{ exchange: string; priority: number }>),
      dns.resolveTxt(rootDomain).catch(() => [] as string[][]),
      dns.resolveTxt(`_dmarc.${rootDomain}`).catch(() => [] as string[][]),
    ]);

  const flatTxt = txtRecords.map((record) => record.join(""));
  const flatDmarc = dmarcRecords.map((record) => record.join(""));
  const spf = flatTxt.find((record) =>
    record.toLowerCase().startsWith("v=spf1"),
  );
  const dmarc = flatDmarc.find((record) =>
    record.toLowerCase().startsWith("v=dmarc1"),
  );
  const findings: RealModuleFinding[] = [];

  if (!spf) {
    findings.push({
      title: "SPF record not observed",
      severity: "Medium",
      category: "Email Security",
      evidence: [`No SPF TXT record observed for ${rootDomain}`],
      customerImpact:
        "SPF helps reduce email spoofing risk for business domains.",
      developerFix:
        "Ask your domain/email provider to add an SPF record that includes approved mail senders.",
      safeClaim: "Can claim SPF was not observed in DNS TXT records.",
      blockedClaim:
        "Cannot claim email compromise or phishing attack occurred.",
    });
  }

  if (!dmarc) {
    findings.push({
      title: "DMARC record not observed",
      severity: "Medium",
      category: "Email Security",
      evidence: [`No DMARC TXT record observed for _dmarc.${rootDomain}`],
      customerImpact:
        "DMARC helps protect brand and customer trust by controlling spoofed email handling.",
      developerFix:
        "Add DMARC with p=none for monitoring first, then move toward quarantine/reject after review.",
      safeClaim: "Can claim DMARC was not observed in DNS records.",
      blockedClaim:
        "Cannot claim email compromise or phishing attack occurred.",
    });
  }

  return {
    moduleId: "real-dns-email-security",
    moduleName: "Real DNS and Email Security Module",
    customerName: "DNS and email protection check",
    category: "DNS Security",
    status: "completed",
    riskLevel: "safe",
    evidence: [
      `A records: ${aRecords.join(", ") || "none observed"}`,
      `AAAA records: ${aaaaRecords.join(", ") || "none observed"}`,
      `MX records: ${mxRecords.map((record) => record.exchange).join(", ") || "none observed"}`,
      `SPF: ${spf || "not observed"}`,
      `DMARC: ${dmarc || "not observed"}`,
    ],
    findings,
    outputSummary: {
      hostname,
      rootDomain,
      aRecords,
      aaaaRecords,
      mxRecords,
      spf: spf || null,
      dmarc: dmarc || null,
      txtRecordCount: flatTxt.length,
    },
    safeClaim:
      "Can claim authorized DNS/email security records were queried and reviewed.",
    blockedClaim:
      "Cannot claim mailbox compromise, phishing incident, or domain takeover.",
  };
}

function connectToPort(hostname: string, port: number, timeoutMs: number) {
  return new Promise<{ port: number; open: boolean; evidence: string }>(
    (resolve) => {
      const socket = net.createConnection({ host: hostname, port });
      let settled = false;

      const finish = (open: boolean, evidence: string) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({ port, open, evidence });
      };

      socket.setTimeout(timeoutMs);
      socket.on("connect", () =>
        finish(true, `TCP ${port} accepted connection`),
      );
      socket.on("timeout", () => finish(false, `TCP ${port} timed out`));
      socket.on("error", () =>
        finish(false, `TCP ${port} did not accept connection`),
      );
    },
  );
}

function servicePortsForIntensity(intensity: PentestIntensity) {
  if (intensity === "light") return [80, 443];
  if (intensity === "deep") return [80, 443, 8080, 8443, 3000, 8000, 9443];

  return [80, 443, 8080, 8443];
}

async function runControlledServiceDiscoveryModule(
  url: URL,
  intensity: PentestIntensity,
): Promise<RealModuleResult> {
  const hostname = url.hostname;
  const ports = servicePortsForIntensity(intensity);
  const results = [];

  for (const port of ports) {
    results.push(await connectToPort(hostname, port, 1_500));
  }

  const openPorts = results.filter((result) => result.open);
  const findings: RealModuleFinding[] = [];

  const unusualOpenPorts = openPorts.filter(
    (result) => ![80, 443].includes(result.port),
  );

  if (unusualOpenPorts.length) {
    findings.push({
      title: "Additional public service ports observed",
      severity: "Medium",
      category: "Service Discovery",
      evidence: unusualOpenPorts.map((result) => result.evidence),
      customerImpact:
        "Extra public services increase the attack surface and should be intentionally exposed.",
      developerFix:
        "Ask hosting/server administrator to confirm each open service is required, patched, and access-controlled.",
      safeClaim:
        "Can claim controlled TCP connection checks observed additional public ports.",
      blockedClaim:
        "Cannot claim those services are vulnerable without deeper authorized validation.",
    });
  }

  return {
    moduleId: "real-controlled-service-discovery",
    moduleName: "Real Controlled Service Discovery Module",
    customerName: "Controlled public service discovery",
    category: "Service Discovery",
    status: "completed",
    riskLevel: "controlled",
    evidence: results.map((result) => result.evidence),
    findings,
    outputSummary: {
      hostname,
      portsChecked: ports,
      openPorts: openPorts.map((result) => result.port),
      timeoutMs: 1500,
      dataSent: false,
    },
    safeClaim:
      "Can claim controlled low-rate TCP connection checks were performed on verified scope.",
    blockedClaim:
      "Cannot claim vulnerability exploitation, banner grabbing, or unauthorized network testing.",
  };
}

export async function runRealSecurityModules(input: {
  targetUrl: string;
  intensity?: PentestIntensity;
}): Promise<RealSecurityModuleReport> {
  const intensity = input.intensity || "standard";
  const url = normalizeTargetUrl(input.targetUrl);
  let privateTargetBlocked = false;

  try {
    await assertPublicTarget(url);
  } catch (error) {
    privateTargetBlocked = true;

    const blockedResult: RealModuleResult = {
      moduleId: "target-safety-guard",
      moduleName: "Target Safety Guard",
      customerName: "Target safety guard",
      category: "Safety Control",
      status: "blocked",
      riskLevel: "sensitive",
      evidence: [
        error instanceof Error
          ? error.message
          : "Target blocked by safety policy.",
      ],
      findings: [
        {
          title: "Target blocked by safety policy",
          severity: "High",
          category: "Safety Control",
          evidence: [
            error instanceof Error
              ? error.message
              : "Target blocked by safety policy.",
          ],
          customerImpact:
            "Private/internal targets are blocked to prevent misuse and server-side request risks.",
          developerFix:
            "Use a public verified website domain that you own or are authorized to test.",
          safeClaim:
            "Can claim the target was blocked by internal safety guard.",
          blockedClaim:
            "Cannot run authorized modules against private/internal targets.",
        },
      ],
      outputSummary: { blocked: true },
      safeClaim: "Can claim target safety guard blocked the run.",
      blockedClaim: "Cannot claim security results for blocked targets.",
    };

    return {
      version: "31.0",
      generatedAt: new Date().toISOString(),
      targetUrl: url.toString(),
      hostname: url.hostname,
      intensity,
      allowedMethods: [
        "GET",
        "HEAD",
        "TLS handshake",
        "DNS query",
        "TCP connect",
      ],
      safetyBoundary: REAL_MODULE_BOUNDARY,
      privateTargetBlocked,
      totalModules: 1,
      completedModules: 0,
      failedModules: 0,
      blockedModules: 1,
      highPriorityFindings: 1,
      results: [blockedResult],
      customerSummary:
        "Real security modules were blocked because the target is private/internal or unsafe for backend testing.",
    };
  }

  const modulePromises = [
    runHttpSecurityModule(url).catch((error) =>
      createFailedModule(
        "real-http-security",
        "Real HTTP Security Module",
        "Website header and redirect check",
        "HTTP Security",
        error,
      ),
    ),
    runTlsModule(url).catch((error) =>
      createFailedModule(
        "real-tls-certificate",
        "Real TLS Certificate Module",
        "SSL/TLS certificate check",
        "TLS Security",
        error,
      ),
    ),
    runDnsEmailModule(url).catch((error) =>
      createFailedModule(
        "real-dns-email-security",
        "Real DNS and Email Security Module",
        "DNS and email protection check",
        "DNS Security",
        error,
      ),
    ),
    runControlledServiceDiscoveryModule(url, intensity).catch((error) =>
      createFailedModule(
        "real-controlled-service-discovery",
        "Real Controlled Service Discovery Module",
        "Controlled public service discovery",
        "Service Discovery",
        error,
      ),
    ),
  ];

  const results = await Promise.all(modulePromises);
  const completedModules = results.filter(
    (result) => result.status === "completed",
  ).length;
  const failedModules = results.filter(
    (result) => result.status === "failed",
  ).length;
  const blockedModules = results.filter(
    (result) => result.status === "blocked",
  ).length;
  const highPriorityFindings = results
    .flatMap((result) => result.findings)
    .filter(
      (finding) => severityWeight(finding.severity) >= severityWeight("High"),
    ).length;

  return {
    version: "31.0",
    generatedAt: new Date().toISOString(),
    targetUrl: url.toString(),
    hostname: url.hostname,
    intensity,
    allowedMethods: [
      "GET",
      "HEAD",
      "TLS handshake",
      "DNS query",
      "TCP connect",
    ],
    safetyBoundary: REAL_MODULE_BOUNDARY,
    privateTargetBlocked,
    totalModules: results.length,
    completedModules,
    failedModules,
    blockedModules,
    highPriorityFindings,
    results,
    customerSummary:
      "Real authorized backend modules collected HTTP, TLS, DNS, and controlled service evidence with strict safety controls.",
  };
}
