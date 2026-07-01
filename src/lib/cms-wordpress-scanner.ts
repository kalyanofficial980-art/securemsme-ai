import dns from "node:dns/promises";
import type { PentestIntensity } from "@/lib/authorized-pentest-engine";

export type CmsSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";
export type CmsStatus =
  "detected" | "not-detected" | "manual-review" | "blocked";

export type CmsObservation = {
  url: string;
  path: string;
  method: "GET" | "HEAD";
  status: number | null;
  contentType: string | null;
  contentLength: string | null;
  headerSample: string[];
  bodySampleStored: boolean;
  bodySampleLength: number;
  errorMessage?: string;
};

export type CmsFinding = {
  id: string;
  title: string;
  category: string;
  severity: CmsSeverity;
  status: CmsStatus;
  confidence: "High" | "Medium" | "Low";
  evidence: string[];
  customerImpact: string;
  developerFix: string;
  safeClaim: string;
  blockedClaim: string;
};

export type CmsWordPressScannerReport = {
  version: string;
  generatedAt: string;
  targetUrl: string;
  hostname: string;
  intensity: PentestIntensity;
  privateTargetBlocked: boolean;
  wordpressDetected: boolean;
  woocommerceDetected: boolean;
  pluginSignals: string[];
  themeSignals: string[];
  versionSignals: string[];
  observations: CmsObservation[];
  findings: CmsFinding[];
  highPriorityFindings: number;
  safetyBoundary: string[];
  customerSummary: string;
  developerHardeningChecklist: string[];
};

const CMS_SCANNER_BOUNDARY = [
  "Verified website scope required",
  "Permission attestation required",
  "Only GET and HEAD requests",
  "No password guessing",
  "No brute force",
  "No login bypass",
  "No exploit payloads",
  "No XML-RPC POST calls",
  "No form submission",
  "No destructive testing",
  "No private data collection",
  "User endpoint bodies are not stored",
  "Sensitive-path bodies are not stored",
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

function pathForUrl(baseUrl: URL, path: string) {
  const url = new URL(baseUrl.toString());
  url.pathname = path;
  url.search = "";

  return url;
}

function pathWithSearch(baseUrl: URL, path: string, search: string) {
  const url = pathForUrl(baseUrl, path);
  url.search = search;

  return url;
}

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function severityWeight(severity: CmsSeverity) {
  return {
    Critical: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Info: 1,
  }[severity];
}

async function fetchObservation(input: {
  baseUrl: URL;
  path: string;
  method?: "GET" | "HEAD";
  search?: string;
  storeBody?: boolean;
}) {
  const method = input.method || "GET";
  const url = input.search
    ? pathWithSearch(input.baseUrl, input.path, input.search)
    : pathForUrl(input.baseUrl, input.path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url.toString(), {
      method,
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "SecureMSMEAI-Authorized-CMSScanner/1.0",
      },
    });

    const trackedHeaders = [
      "content-type",
      "content-length",
      "location",
      "server",
      "x-powered-by",
      "x-redirect-by",
      "link",
    ];

    const headerSample = trackedHeaders
      .map((header) => {
        const value = response.headers.get(header);
        return value ? `${header}: ${value}` : "";
      })
      .filter(Boolean)
      .slice(0, 10);

    let bodySample = "";
    let bodySampleStored = false;

    if (method === "GET" && input.storeBody) {
      const contentType = response.headers.get("content-type") || "";
      if (
        contentType.includes("text") ||
        contentType.includes("json") ||
        contentType.includes("xml") ||
        contentType.includes("html")
      ) {
        bodySample = (await response.text()).slice(0, 120_000);
        bodySampleStored = true;
      }
    }

    return {
      observation: {
        url: url.toString(),
        path: input.search ? `${input.path}${input.search}` : input.path,
        method,
        status: response.status,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        headerSample,
        bodySampleStored,
        bodySampleLength: bodySample.length,
      } satisfies CmsObservation,
      bodySample,
    };
  } catch (error) {
    return {
      observation: {
        url: url.toString(),
        path: input.search ? `${input.path}${input.search}` : input.path,
        method,
        status: null,
        contentType: null,
        contentLength: null,
        headerSample: [],
        bodySampleStored: false,
        bodySampleLength: 0,
        errorMessage: error instanceof Error ? error.message : "Request failed",
      } satisfies CmsObservation,
      bodySample: "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractPluginSignals(text: string) {
  const matches = [
    ...text.matchAll(/\/wp-content\/plugins\/([a-zA-Z0-9_-]+)\//g),
  ];
  return unique(matches.map((match) => match[1])).slice(0, 30);
}

function extractThemeSignals(text: string) {
  const matches = [
    ...text.matchAll(/\/wp-content\/themes\/([a-zA-Z0-9_-]+)\//g),
  ];
  return unique(matches.map((match) => match[1])).slice(0, 10);
}

function extractVersionSignals(text: string) {
  const signals: string[] = [];

  const generator = text.match(
    /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i,
  );
  if (generator?.[1]) signals.push(`Generator meta: ${generator[1]}`);

  const wpIncludesVersion = [
    ...text.matchAll(/wp-includes\/[^"']+\?ver=([0-9][^"']*)/gi),
  ]
    .map((match) => `wp-includes asset version: ${match[1]}`)
    .slice(0, 5);

  const wpContentVersion = [
    ...text.matchAll(/wp-content\/[^"']+\?ver=([0-9][^"']*)/gi),
  ]
    .map((match) => `wp-content asset version: ${match[1]}`)
    .slice(0, 5);

  return unique([...signals, ...wpIncludesVersion, ...wpContentVersion]).slice(
    0,
    10,
  );
}

function containsWordPressSignal(text: string, headers: string[]) {
  const lower = `${text} ${headers.join(" ")}`.toLowerCase();

  return (
    lower.includes("wp-content") ||
    lower.includes("wp-includes") ||
    lower.includes("wp-json") ||
    lower.includes("wordpress") ||
    lower.includes("x-redirect-by: wordpress")
  );
}

function containsWooCommerceSignal(text: string) {
  const lower = text.toLowerCase();

  return (
    lower.includes("woocommerce") ||
    lower.includes("wp-content/plugins/woocommerce") ||
    lower.includes("wc-ajax") ||
    lower.includes("woocommerce-page") ||
    lower.includes("add_to_cart")
  );
}

function statusEvidence(label: string, observation: CmsObservation) {
  return `${label}: ${observation.method} ${observation.url} returned ${observation.status ?? "failed"}`;
}

function buildPrivateBlockedReport(
  url: URL,
  error: unknown,
  intensity: PentestIntensity,
): CmsWordPressScannerReport {
  const finding: CmsFinding = {
    id: "cms-target-safety-guard",
    title: "CMS scanner blocked by safety policy",
    category: "Safety Control",
    severity: "High",
    status: "blocked",
    confidence: "High",
    evidence: [
      error instanceof Error
        ? error.message
        : "Target blocked by safety policy.",
    ],
    customerImpact:
      "Private/internal targets are blocked to prevent misuse and server-side request risks.",
    developerFix:
      "Use a public verified website domain that you own or are authorized to test.",
    safeClaim: "Can claim target safety guard blocked the CMS scanner run.",
    blockedClaim: "Cannot claim CMS security results for blocked targets.",
  };

  return {
    version: "33.0",
    generatedAt: new Date().toISOString(),
    targetUrl: url.toString(),
    hostname: url.hostname,
    intensity,
    privateTargetBlocked: true,
    wordpressDetected: false,
    woocommerceDetected: false,
    pluginSignals: [],
    themeSignals: [],
    versionSignals: [],
    observations: [],
    findings: [finding],
    highPriorityFindings: 1,
    safetyBoundary: CMS_SCANNER_BOUNDARY,
    customerSummary:
      "CMS/WordPress scanner was blocked because the target is private/internal or unsafe for backend testing.",
    developerHardeningChecklist: getWordPressHardeningChecklist(),
  };
}

export function getWordPressHardeningChecklist() {
  return [
    "Keep WordPress core updated.",
    "Keep plugins and themes updated.",
    "Remove unused plugins and themes.",
    "Use MFA for admin accounts.",
    "Use strong unique admin passwords.",
    "Limit login attempts and monitor suspicious login activity.",
    "Disable or protect XML-RPC if not required.",
    "Hide unnecessary version details where possible.",
    "Block public access to sensitive files and backups.",
    "Use security headers and HTTPS everywhere.",
    "Keep reliable offsite backups.",
    "Use least-privilege admin roles.",
    "Review WooCommerce payment and checkout plugins carefully.",
    "Retest after fixes and keep before/after proof.",
  ];
}

function addFinding(findings: CmsFinding[], finding: CmsFinding) {
  if (!findings.some((item) => item.id === finding.id)) {
    findings.push(finding);
  }
}

export async function runCmsWordPressScanner(input: {
  targetUrl: string;
  intensity?: PentestIntensity;
}): Promise<CmsWordPressScannerReport> {
  const intensity = input.intensity || "standard";
  const url = normalizeTargetUrl(input.targetUrl);

  try {
    await assertPublicTarget(url);
  } catch (error) {
    return buildPrivateBlockedReport(url, error, intensity);
  }

  const observations: CmsObservation[] = [];
  const findings: CmsFinding[] = [];
  const bodySamples: Record<string, string> = {};

  const plannedChecks: Array<{
    path: string;
    method?: "GET" | "HEAD";
    search?: string;
    storeBody?: boolean;
    minIntensity: PentestIntensity[];
  }> = [
    { path: "/", storeBody: true, minIntensity: ["light", "standard", "deep"] },
    {
      path: "/wp-json/",
      storeBody: true,
      minIntensity: ["light", "standard", "deep"],
    },
    {
      path: "/wp-login.php",
      storeBody: true,
      minIntensity: ["standard", "deep"],
    },
    {
      path: "/wp-admin/",
      storeBody: false,
      minIntensity: ["standard", "deep"],
    },
    {
      path: "/xmlrpc.php",
      method: "HEAD",
      storeBody: false,
      minIntensity: ["standard", "deep"],
    },
    {
      path: "/readme.html",
      method: "HEAD",
      storeBody: false,
      minIntensity: ["standard", "deep"],
    },
    {
      path: "/license.txt",
      method: "HEAD",
      storeBody: false,
      minIntensity: ["standard", "deep"],
    },
    {
      path: "/wp-json/wp/v2/users",
      search: "?per_page=1",
      storeBody: false,
      minIntensity: ["deep"],
    },
    { path: "/cart/", storeBody: true, minIntensity: ["deep"] },
    { path: "/checkout/", storeBody: true, minIntensity: ["deep"] },
    { path: "/shop/", storeBody: true, minIntensity: ["deep"] },
  ];

  const checks = plannedChecks.filter((check) =>
    check.minIntensity.includes(intensity),
  );

  for (const check of checks) {
    const result = await fetchObservation({
      baseUrl: url,
      path: check.path,
      method: check.method || "GET",
      search: check.search,
      storeBody: Boolean(check.storeBody),
    });

    observations.push(result.observation);
    bodySamples[result.observation.path] = result.bodySample;
  }

  const combinedText = Object.values(bodySamples).join("\n");
  const combinedHeaders = observations.flatMap(
    (observation) => observation.headerSample,
  );
  const wordpressDetected = containsWordPressSignal(
    combinedText,
    combinedHeaders,
  );
  const woocommerceDetected = containsWooCommerceSignal(combinedText);
  const pluginSignals = extractPluginSignals(combinedText);
  const themeSignals = extractThemeSignals(combinedText);
  const versionSignals = extractVersionSignals(combinedText);

  const rootObservation = observations.find((item) => item.path === "/");
  const wpJsonObservation = observations.find(
    (item) => item.path === "/wp-json/",
  );
  const wpLoginObservation = observations.find(
    (item) => item.path === "/wp-login.php",
  );
  const wpAdminObservation = observations.find(
    (item) => item.path === "/wp-admin/",
  );
  const xmlrpcObservation = observations.find(
    (item) => item.path === "/xmlrpc.php",
  );
  const readmeObservation = observations.find(
    (item) => item.path === "/readme.html",
  );
  const licenseObservation = observations.find(
    (item) => item.path === "/license.txt",
  );
  const usersObservation = observations.find((item) =>
    item.path.startsWith("/wp-json/wp/v2/users"),
  );

  if (wordpressDetected) {
    addFinding(findings, {
      id: "wordpress-detected",
      title: "WordPress technology detected",
      category: "CMS Detection",
      severity: "Info",
      status: "detected",
      confidence: wpJsonObservation?.status === 200 ? "High" : "Medium",
      evidence: [
        rootObservation
          ? statusEvidence("Main page", rootObservation)
          : "Main page checked",
        wpJsonObservation
          ? statusEvidence("WordPress REST API", wpJsonObservation)
          : "WordPress REST API checked",
        `Plugin signals observed: ${pluginSignals.length}`,
        `Theme signals observed: ${themeSignals.length}`,
      ],
      customerImpact:
        "WordPress is common and powerful, but it needs regular updates and hardening.",
      developerFix:
        "Confirm WordPress core, plugin, and theme versions from admin/source and update safely.",
      safeClaim:
        "Can claim WordPress public signals were detected during authorized CMS review.",
      blockedClaim:
        "Cannot claim WordPress is vulnerable only because it was detected.",
    });
  }

  if (wpJsonObservation?.status === 200) {
    addFinding(findings, {
      id: "wordpress-rest-api-public",
      title: "WordPress REST API is publicly reachable",
      category: "WordPress REST API",
      severity: "Low",
      status: "detected",
      confidence: "High",
      evidence: [statusEvidence("REST API", wpJsonObservation)],
      customerImpact:
        "Public REST API access is normal for many WordPress sites, but it should not expose sensitive data.",
      developerFix:
        "Review REST API exposure, plugins, and permissions. Restrict sensitive endpoints if not required.",
      safeClaim:
        "Can claim WordPress REST API public reachability was observed.",
      blockedClaim:
        "Cannot claim data leakage or authorization bypass without endpoint-specific evidence.",
    });
  }

  if (
    wpLoginObservation &&
    [200, 401, 403].includes(wpLoginObservation.status || 0)
  ) {
    addFinding(findings, {
      id: "wordpress-login-surface",
      title: "WordPress login surface observed",
      category: "Admin/Login Surface",
      severity: "Medium",
      status: wpLoginObservation.status === 200 ? "detected" : "manual-review",
      confidence: wpLoginObservation.status === 200 ? "High" : "Medium",
      evidence: [statusEvidence("wp-login.php", wpLoginObservation)],
      customerImpact:
        "Public WordPress login pages need strong protection because attackers commonly target them.",
      developerFix:
        "Enable MFA, strong passwords, login attempt limits, monitoring, and consider admin access restrictions.",
      safeClaim:
        "Can claim WordPress login surface was observed or protected-status reviewed.",
      blockedClaim:
        "Cannot claim password weakness, account compromise, or login bypass.",
    });
  }

  if (
    wpAdminObservation &&
    [200, 301, 302, 401, 403].includes(wpAdminObservation.status || 0)
  ) {
    addFinding(findings, {
      id: "wordpress-admin-surface",
      title: "WordPress admin surface observed",
      category: "Admin/Login Surface",
      severity: "Medium",
      status: "manual-review",
      confidence: "Medium",
      evidence: [statusEvidence("wp-admin", wpAdminObservation)],
      customerImpact:
        "Admin surfaces should be intentionally exposed and protected by strong controls.",
      developerFix:
        "Review admin access controls, MFA, rate limits, monitoring, and user roles.",
      safeClaim: "Can claim WordPress admin surface status was checked.",
      blockedClaim:
        "Cannot claim admin access, privilege escalation, or bypass.",
    });
  }

  if (
    xmlrpcObservation &&
    [200, 405, 401, 403].includes(xmlrpcObservation.status || 0)
  ) {
    addFinding(findings, {
      id: "wordpress-xmlrpc-signal",
      title: "XML-RPC endpoint signal observed",
      category: "WordPress XML-RPC",
      severity:
        xmlrpcObservation.status === 200 || xmlrpcObservation.status === 405
          ? "Medium"
          : "Low",
      status: "manual-review",
      confidence: "Medium",
      evidence: [
        statusEvidence("xmlrpc.php HEAD-only check", xmlrpcObservation),
        "No XML-RPC POST request was sent.",
      ],
      customerImpact:
        "XML-RPC can be abused on poorly protected sites if not needed or not rate-limited.",
      developerFix:
        "Disable XML-RPC if not needed, or protect it with WAF/rate limits and monitoring.",
      safeClaim:
        "Can claim XML-RPC endpoint status was checked using HEAD only.",
      blockedClaim:
        "Cannot claim XML-RPC abuse, brute force, or method exposure because no POST calls were made.",
    });
  }

  if (readmeObservation?.status === 200 || licenseObservation?.status === 200) {
    addFinding(findings, {
      id: "wordpress-public-default-files",
      title: "Public WordPress default files observed",
      category: "Information Exposure",
      severity: "Low",
      status: "detected",
      confidence: "Medium",
      evidence: [
        readmeObservation
          ? statusEvidence("readme.html", readmeObservation)
          : "readme.html not checked",
        licenseObservation
          ? statusEvidence("license.txt", licenseObservation)
          : "license.txt not checked",
      ],
      customerImpact:
        "Default files can reveal platform information and are usually not needed publicly.",
      developerFix:
        "Remove or block public access to unnecessary default files such as readme.html.",
      safeClaim: "Can claim default WordPress file status was checked.",
      blockedClaim:
        "Cannot claim a specific vulnerability from default file presence alone.",
    });
  }

  if (
    usersObservation &&
    [200, 401, 403].includes(usersObservation.status || 0)
  ) {
    addFinding(findings, {
      id: "wordpress-user-endpoint-review",
      title: "WordPress users endpoint needs review",
      category: "User Enumeration",
      severity: usersObservation.status === 200 ? "Medium" : "Low",
      status:
        usersObservation.status === 200 ? "manual-review" : "not-detected",
      confidence: "Medium",
      evidence: [
        statusEvidence("wp/v2/users per_page=1", usersObservation),
        "Response body was not stored by safety policy.",
      ],
      customerImpact:
        "Public user listings can help attackers target valid usernames if exposed.",
      developerFix:
        "Review whether public user listing is needed. Restrict user endpoint exposure where appropriate.",
      safeClaim:
        "Can claim user endpoint status was checked without storing user data.",
      blockedClaim:
        "Cannot claim account compromise, password weakness, or user data breach.",
    });
  }

  if (pluginSignals.length) {
    addFinding(findings, {
      id: "wordpress-plugin-signals",
      title: "Public WordPress plugin signals detected",
      category: "Plugin Risk",
      severity: pluginSignals.length >= 5 ? "Medium" : "Low",
      status: "detected",
      confidence: "Medium",
      evidence: [
        `Plugin slugs observed from public asset paths: ${pluginSignals.slice(0, 15).join(", ")}`,
      ],
      customerImpact:
        "Visible plugin signals help defenders inventory plugins, but attackers may also use them for reconnaissance.",
      developerFix:
        "Confirm plugin inventory in WordPress admin. Update, remove unused plugins, and monitor vulnerable plugins.",
      safeClaim: "Can claim public plugin asset path signals were observed.",
      blockedClaim:
        "Cannot claim plugin vulnerability or exploitation without exact version and affected-range validation.",
    });
  }

  if (themeSignals.length) {
    addFinding(findings, {
      id: "wordpress-theme-signals",
      title: "Public WordPress theme signals detected",
      category: "Theme Risk",
      severity: "Low",
      status: "detected",
      confidence: "Medium",
      evidence: [
        `Theme slugs observed from public asset paths: ${themeSignals.slice(0, 10).join(", ")}`,
      ],
      customerImpact:
        "Themes should be maintained because outdated theme code can create security and reliability issues.",
      developerFix:
        "Confirm active theme and child theme versions. Update safely and remove unused themes.",
      safeClaim: "Can claim public theme asset path signals were observed.",
      blockedClaim:
        "Cannot claim theme vulnerability or compromise without exact version validation.",
    });
  }

  if (versionSignals.length) {
    addFinding(findings, {
      id: "wordpress-version-visibility",
      title: "WordPress or asset version signals visible",
      category: "Information Exposure",
      severity: "Low",
      status: "detected",
      confidence: "Medium",
      evidence: versionSignals.slice(0, 10),
      customerImpact:
        "Version signals can help attackers and defenders identify update priorities.",
      developerFix:
        "Keep all components updated and reduce unnecessary public version disclosure where practical.",
      safeClaim: "Can claim public version-like signals were observed.",
      blockedClaim:
        "Cannot claim CVE applicability without exact version and affected-range validation.",
    });
  }

  if (woocommerceDetected) {
    addFinding(findings, {
      id: "woocommerce-surface-detected",
      title: "WooCommerce/storefront signals detected",
      category: "WooCommerce / Ecommerce",
      severity: "Medium",
      status: "detected",
      confidence: "Medium",
      evidence: [
        "WooCommerce/storefront signals observed in public pages or asset paths.",
        ...observations
          .filter((item) =>
            ["/cart/", "/checkout/", "/shop/"].includes(item.path),
          )
          .map((item) => statusEvidence(item.path, item)),
      ].slice(0, 8),
      customerImpact:
        "Ecommerce sites handle customer journeys and should be reviewed carefully for plugin, checkout, and payment security.",
      developerFix:
        "Update WooCommerce and payment plugins, review checkout scripts, admin MFA, backups, and fraud/security settings.",
      safeClaim:
        "Can claim WooCommerce/storefront public signals were detected.",
      blockedClaim:
        "Cannot claim payment compromise, order data exposure, or checkout bypass.",
    });
  }

  if (!wordpressDetected && wpJsonObservation?.status !== 200) {
    addFinding(findings, {
      id: "wordpress-not-detected",
      title: "WordPress not clearly detected",
      category: "CMS Detection",
      severity: "Info",
      status: "not-detected",
      confidence: "Low",
      evidence: [
        wpJsonObservation
          ? statusEvidence("wp-json", wpJsonObservation)
          : "wp-json not checked",
        rootObservation
          ? statusEvidence("main page", rootObservation)
          : "main page checked",
      ],
      customerImpact:
        "The scanner did not find strong WordPress public signals in the checked paths.",
      developerFix:
        "If the site uses WordPress behind caching/CDN, confirm CMS details manually with the site owner/developer.",
      safeClaim:
        "Can claim WordPress was not clearly detected in checked public signals.",
      blockedClaim: "Cannot claim the site definitely does not use WordPress.",
    });
  }

  const sortedFindings = findings.sort(
    (a, b) => severityWeight(b.severity) - severityWeight(a.severity),
  );
  const highPriorityFindings = sortedFindings.filter(
    (finding) => severityWeight(finding.severity) >= severityWeight("High"),
  ).length;

  return {
    version: "33.0",
    generatedAt: new Date().toISOString(),
    targetUrl: url.toString(),
    hostname: url.hostname,
    intensity,
    privateTargetBlocked: false,
    wordpressDetected,
    woocommerceDetected,
    pluginSignals,
    themeSignals,
    versionSignals,
    observations,
    findings: sortedFindings,
    highPriorityFindings,
    safetyBoundary: CMS_SCANNER_BOUNDARY,
    customerSummary:
      "CMS/WordPress scanner reviewed public WordPress, WooCommerce, plugin, theme, login/admin, XML-RPC, and version signals with safe evidence controls.",
    developerHardeningChecklist: getWordPressHardeningChecklist(),
  };
}
