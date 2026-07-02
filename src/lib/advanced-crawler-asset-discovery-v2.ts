import { createHash } from "node:crypto";

export type CrawlerMode = "safe-light" | "safe-standard" | "safe-deep";

export type AssetType =
  | "page"
  | "login"
  | "admin"
  | "checkout"
  | "payment"
  | "api"
  | "documentation"
  | "form"
  | "privacy"
  | "contact"
  | "sitemap"
  | "robots"
  | "static"
  | "unknown";

export type DiscoveredAsset = {
  assetUrl: string;
  normalizedUrl: string;
  origin: string;
  path: string;
  depth: number;
  parentUrl?: string | null;
  assetType: AssetType;
  httpStatus?: number | null;
  contentType?: string | null;
  title?: string | null;
  metaDescription?: string | null;
  discoverySource:
    | "seed"
    | "crawler"
    | "sitemap"
    | "robots"
    | "link"
    | "form"
    | "script"
    | "manual";
  hasForm: boolean;
  hasPasswordField: boolean;
  hasCustomerDataField: boolean;
  hasPaymentSignal: boolean;
  hasAdminSignal: boolean;
  hasApiSignal: boolean;
  isSameOrigin: boolean;
  isCrawled: boolean;
  isBlocked: boolean;
  riskTags: string[];
  assetFingerprint: string;
  evidenceSummary: string;
  developerNote: string;
  clientSafeNote: string;
  rawObservation: Record<string, unknown>;
};

export type LinkEdge = {
  fromUrl: string;
  toUrl: string;
  linkText?: string | null;
  relationship:
    | "links-to"
    | "form-action"
    | "script-src"
    | "sitemap-entry"
    | "robots-reference"
    | "redirects-to";
  isSameOrigin: boolean;
};

export type FormInventory = {
  pageUrl: string;
  formIndex: number;
  method: string;
  actionUrl?: string | null;
  fieldCount: number;
  passwordFieldCount: number;
  emailFieldCount: number;
  phoneFieldCount: number;
  fileFieldCount: number;
  paymentFieldSignal: boolean;
  customerDataSignal: boolean;
  csrfSignal: boolean;
  formRiskLevel: "High" | "Medium" | "Low" | "Info";
  evidenceSummary: string;
  developerNote: string;
  safeClaim: string;
  blockedClaim: string;
  rawForm: Record<string, unknown>;
};

export type CrawlerReport = {
  targetUrl: string;
  normalizedOrigin: string;
  crawlerMode: CrawlerMode;
  runStatus: "completed" | "completed-with-warnings" | "blocked" | "failed";
  maxPages: number;
  maxDepth: number;
  discoveredUrlCount: number;
  crawledPageCount: number;
  skippedUrlCount: number;
  blockedUrlCount: number;
  formCount: number;
  loginSurfaceCount: number;
  adminSurfaceCount: number;
  apiSurfaceCount: number;
  checkoutSurfaceCount: number;
  customerDataSurfaceCount: number;
  coverageScore: number;
  assetRiskScore: number;
  safeSummary: string;
  developerSummary: string;
  clientSafeSummary: string;
  blockedActions: string[];
  assets: DiscoveredAsset[];
  edges: LinkEdge[];
  forms: FormInventory[];
};

export const crawlerBlockedActions = [
  "No form submission",
  "No POST/PUT/PATCH/DELETE requests",
  "No brute force",
  "No password guessing",
  "No login bypass",
  "No exploit payloads",
  "No destructive testing",
  "No private data extraction",
  "No payment/order mutation",
  "No denial-of-service crawling",
];

const STATIC_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".css",
  ".js",
  ".woff",
  ".woff2",
  ".ttf",
  ".pdf",
  ".zip",
  ".rar",
  ".7z",
  ".mp4",
  ".mp3",
  ".avi",
];

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeTargetUrl(input: string) {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);
  url.hash = "";
  return url;
}

export function normalizeDiscoveredUrl(input: string, baseUrl: URL) {
  try {
    const url = new URL(input, baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    url.searchParams.sort();
    return url;
  } catch {
    return null;
  }
}

export function sameOrigin(a: URL, b: URL) {
  return (
    a.protocol === b.protocol && a.hostname === b.hostname && a.port === b.port
  );
}

export function stripQueryForFingerprint(url: URL) {
  const copy = new URL(url.toString());
  copy.hash = "";
  copy.search = "";
  return copy.toString().replace(/\/$/, "");
}

export function classifyAsset(url: URL, html?: string | null): AssetType {
  const path = url.pathname.toLowerCase();
  const combined = `${path} ${String(html || "")
    .slice(0, 5000)
    .toLowerCase()}`;

  if (path.endsWith("/sitemap.xml") || path.includes("sitemap"))
    return "sitemap";
  if (path.endsWith("/robots.txt")) return "robots";
  if (STATIC_EXTENSIONS.some((ext) => path.endsWith(ext))) return "static";
  if (/wp-login|\/login|signin|sign-in|account|password/.test(combined))
    return "login";
  if (/\/admin|wp-admin|dashboard|cpanel|administrator/.test(combined))
    return "admin";
  if (/checkout|cart|order|billing/.test(combined)) return "checkout";
  if (/payment|razorpay|stripe|paytm|paypal|upi/.test(combined))
    return "payment";
  if (/\/api\/|graphql|swagger|openapi|api-docs/.test(combined)) return "api";
  if (/docs|documentation|swagger|openapi/.test(combined))
    return "documentation";
  if (/privacy|privacy-policy/.test(combined)) return "privacy";
  if (/contact|support/.test(combined)) return "contact";
  if (/<form[\s>]/i.test(String(html || ""))) return "form";
  return "page";
}

export function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match
    ? decodeHtml(match[1].replace(/\s+/g, " ").trim()).slice(0, 200)
    : null;
}

export function extractMetaDescription(html: string) {
  const match =
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ) ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
    );
  return match
    ? decodeHtml(match[1].replace(/\s+/g, " ").trim()).slice(0, 300)
    : null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function extractLinks(html: string, baseUrl: URL) {
  const edges: {
    href: string;
    text: string;
    relationship: LinkEdge["relationship"];
  }[] = [];

  for (const match of html.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    edges.push({
      href: match[1],
      text: decodeHtml(
        match[2]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      ).slice(0, 120),
      relationship: "links-to",
    });
  }

  for (const match of html.matchAll(
    /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi,
  )) {
    edges.push({ href: match[1], text: "script", relationship: "script-src" });
  }

  return edges
    .map((edge) => {
      const url = normalizeDiscoveredUrl(edge.href, baseUrl);
      return url ? { ...edge, url } : null;
    })
    .filter(Boolean) as {
    href: string;
    text: string;
    relationship: LinkEdge["relationship"];
    url: URL;
  }[];
}

export function extractForms(html: string, pageUrl: URL): FormInventory[] {
  const forms: FormInventory[] = [];
  let index = 0;

  for (const match of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const methodMatch = attrs.match(/method=["']?([a-zA-Z]+)["']?/i);
    const actionMatch = attrs.match(/action=["']([^"']+)["']/i);
    const method = (methodMatch?.[1] || "GET").toUpperCase();
    const actionUrl = actionMatch?.[1]
      ? normalizeDiscoveredUrl(actionMatch[1], pageUrl)?.toString() || null
      : pageUrl.toString();

    const inputs = [...body.matchAll(/<(input|textarea|select)\b([^>]*)>/gi)];
    const fieldText = body.toLowerCase();
    const passwordFieldCount = inputs.filter((input) =>
      /type=["']?password/i.test(input[2]),
    ).length;
    const emailFieldCount = inputs.filter(
      (input) =>
        /type=["']?email/i.test(input[2]) || /name=["']?email/i.test(input[2]),
    ).length;
    const phoneFieldCount = inputs.filter(
      (input) =>
        /type=["']?tel/i.test(input[2]) ||
        /name=["']?(phone|mobile|contact)/i.test(input[2]),
    ).length;
    const fileFieldCount = inputs.filter((input) =>
      /type=["']?file/i.test(input[2]),
    ).length;
    const paymentFieldSignal = /card|cvv|payment|billing|upi|pay/i.test(
      fieldText,
    );
    const customerDataSignal =
      passwordFieldCount > 0 ||
      emailFieldCount > 0 ||
      phoneFieldCount > 0 ||
      /name|address|message|patient|student|customer/i.test(fieldText);
    const csrfSignal = /csrf|_token|authenticity_token/i.test(fieldText);

    const riskLevel =
      passwordFieldCount || paymentFieldSignal
        ? "High"
        : customerDataSignal
          ? "Medium"
          : "Low";

    forms.push({
      pageUrl: pageUrl.toString(),
      formIndex: index,
      method,
      actionUrl,
      fieldCount: inputs.length,
      passwordFieldCount,
      emailFieldCount,
      phoneFieldCount,
      fileFieldCount,
      paymentFieldSignal,
      customerDataSignal,
      csrfSignal,
      formRiskLevel: riskLevel,
      evidenceSummary: `Form ${index + 1} observed with ${inputs.length} field(s), method ${method}, customer-data signal ${customerDataSignal ? "yes" : "no"}.`,
      developerNote:
        "Review form validation, CSRF/spam protection, HTTPS submission, privacy notice and backend data handling.",
      safeClaim: "A public form was inventoried without submitting data.",
      blockedClaim:
        "Do not claim data leakage or form exploit without authorized validation.",
      rawForm: {
        method,
        actionUrl,
        fieldCount: inputs.length,
        passwordFieldCount,
        emailFieldCount,
        phoneFieldCount,
        fileFieldCount,
        paymentFieldSignal,
        customerDataSignal,
        csrfSignal,
      },
    });

    index += 1;
  }

  return forms;
}

export function buildAssetFingerprint(input: {
  normalizedUrl: string;
  assetType: AssetType;
  httpStatus?: number | null;
  title?: string | null;
}) {
  return sha256(
    `${input.normalizedUrl}|${input.assetType}|${input.httpStatus || ""}|${input.title || ""}`,
  );
}

export function buildRiskTags(input: {
  assetType: AssetType;
  html?: string | null;
  forms?: FormInventory[];
}) {
  const tags = new Set<string>();
  const html = String(input.html || "").toLowerCase();
  const forms = input.forms || [];

  if (input.assetType === "login") tags.add("login-surface");
  if (input.assetType === "admin") tags.add("admin-surface");
  if (input.assetType === "checkout" || input.assetType === "payment")
    tags.add("payment-or-checkout");
  if (input.assetType === "api" || input.assetType === "documentation")
    tags.add("api-or-docs");
  if (input.assetType === "privacy") tags.add("privacy-page");
  if (forms.some((form) => form.customerDataSignal))
    tags.add("customer-data-form");
  if (forms.some((form) => form.passwordFieldCount > 0))
    tags.add("password-form");
  if (forms.some((form) => form.paymentFieldSignal)) tags.add("payment-form");
  if (/wp-content|wp-login|wp-admin/i.test(html)) tags.add("wordpress-signal");
  if (/woocommerce|shopify|cart|checkout/i.test(html))
    tags.add("ecommerce-signal");

  return [...tags];
}

export function createAssetFromObservation(input: {
  url: URL;
  origin: URL;
  depth: number;
  parentUrl?: string | null;
  discoverySource: DiscoveredAsset["discoverySource"];
  httpStatus?: number | null;
  contentType?: string | null;
  html?: string | null;
  isCrawled?: boolean;
  isBlocked?: boolean;
}): { asset: DiscoveredAsset; forms: FormInventory[] } {
  const html = input.html || "";
  const forms = extractForms(html, input.url);
  const assetType = classifyAsset(input.url, html);
  const title = extractTitle(html);
  const metaDescription = extractMetaDescription(html);
  const normalizedUrl = stripQueryForFingerprint(input.url);
  const riskTags = buildRiskTags({ assetType, html, forms });

  const asset: DiscoveredAsset = {
    assetUrl: input.url.toString(),
    normalizedUrl,
    origin: input.origin.origin,
    path: input.url.pathname || "/",
    depth: input.depth,
    parentUrl: input.parentUrl || null,
    assetType,
    httpStatus: input.httpStatus || null,
    contentType: input.contentType || null,
    title,
    metaDescription,
    discoverySource: input.discoverySource,
    hasForm: forms.length > 0,
    hasPasswordField: forms.some((form) => form.passwordFieldCount > 0),
    hasCustomerDataField: forms.some((form) => form.customerDataSignal),
    hasPaymentSignal:
      forms.some((form) => form.paymentFieldSignal) ||
      assetType === "payment" ||
      assetType === "checkout",
    hasAdminSignal: assetType === "admin",
    hasApiSignal: assetType === "api" || assetType === "documentation",
    isSameOrigin: sameOrigin(input.url, input.origin),
    isCrawled: Boolean(input.isCrawled),
    isBlocked: Boolean(input.isBlocked),
    riskTags,
    assetFingerprint: buildAssetFingerprint({
      normalizedUrl,
      assetType,
      httpStatus: input.httpStatus,
      title,
    }),
    evidenceSummary: `${assetType} asset observed at ${input.url.pathname || "/"} with ${forms.length} form(s) and ${riskTags.length} risk tag(s).`,
    developerNote: buildDeveloperNote(assetType, riskTags),
    clientSafeNote: buildClientSafeNote(assetType, riskTags),
    rawObservation: {
      depth: input.depth,
      httpStatus: input.httpStatus,
      contentType: input.contentType,
      title,
      metaDescription,
      riskTags,
    },
  };

  return { asset, forms };
}

function buildDeveloperNote(assetType: AssetType, tags: string[]) {
  if (tags.includes("customer-data-form"))
    return "Review form protection, privacy notice, validation, CSRF/spam controls and backend storage.";
  if (tags.includes("api-or-docs"))
    return "Confirm API/docs exposure is intended and sensitive endpoints are not publicly documented.";
  if (tags.includes("admin-surface"))
    return "Confirm admin page is intended, protected and not exposing sensitive details.";
  if (tags.includes("payment-or-checkout"))
    return "Review checkout/payment flow, redirects, HTTPS, scripts and customer data handling.";
  if (assetType === "privacy")
    return "Confirm privacy page is linked from data collection forms.";
  return "Review this asset as part of authorized security scope.";
}

function buildClientSafeNote(assetType: AssetType, tags: string[]) {
  if (tags.length)
    return `${assetType} asset has ${tags.join(", ")} signal(s) for security review.`;
  return `${assetType} asset was discovered during safe same-origin crawling.`;
}

async function safeFetch(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "SecureMSME-AI-AdvancedCrawler/2.0",
        accept: "text/html,application/xml,text/plain,*/*",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    let body = "";

    if (/html|xml|text/i.test(contentType)) {
      body = (await response.text()).slice(0, 120_000);
    }

    return {
      ok: true,
      status: response.status,
      contentType,
      body,
      location: response.headers.get("location"),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      contentType: "",
      body: "",
      location: null,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function crawlLimits(mode: CrawlerMode) {
  if (mode === "safe-light") return { maxPages: 10, maxDepth: 1 };
  if (mode === "safe-deep") return { maxPages: 75, maxDepth: 3 };
  return { maxPages: 25, maxDepth: 2 };
}

function seedUrls(origin: URL) {
  return [
    origin.toString(),
    new URL("/robots.txt", origin).toString(),
    new URL("/sitemap.xml", origin).toString(),
    new URL("/privacy", origin).toString(),
    new URL("/contact", origin).toString(),
  ];
}

function extractSitemapUrls(xml: string, origin: URL) {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
    .map((match) => normalizeDiscoveredUrl(match[1], origin))
    .filter((url): url is URL => Boolean(url))
    .filter((url) => sameOrigin(url, origin))
    .slice(0, 100);
}

function extractRobotsReferences(text: string, origin: URL) {
  const urls: URL[] = [];

  for (const match of text.matchAll(
    /(?:Sitemap|Allow|Disallow):\s*([^\s#]+)/gi,
  )) {
    const path = match[1].trim();
    if (!path || path === "/") continue;
    const url = normalizeDiscoveredUrl(path, origin);
    if (url && sameOrigin(url, origin)) urls.push(url);
  }

  return urls.slice(0, 100);
}

function isCrawlable(url: URL) {
  const path = url.pathname.toLowerCase();
  if (STATIC_EXTENSIONS.some((ext) => path.endsWith(ext))) return false;
  return true;
}

export async function runAdvancedCrawler(input: {
  targetUrl: string;
  mode?: CrawlerMode;
  maxPages?: number;
  maxDepth?: number;
  permissionAccepted?: boolean;
  verifiedScope?: boolean;
}): Promise<CrawlerReport> {
  const mode = input.mode || "safe-standard";
  const limits = crawlLimits(mode);
  const maxPages = Math.min(input.maxPages || limits.maxPages, limits.maxPages);
  const maxDepth = Math.min(input.maxDepth || limits.maxDepth, limits.maxDepth);
  const target = normalizeTargetUrl(input.targetUrl);
  const origin = new URL(target.origin);

  if (!input.permissionAccepted) {
    return emptyReport(
      target.toString(),
      origin.origin,
      mode,
      maxPages,
      maxDepth,
      "blocked",
      "Crawler blocked because authorization was not accepted.",
    );
  }

  const queue: {
    url: URL;
    depth: number;
    parentUrl?: string | null;
    source: DiscoveredAsset["discoverySource"];
  }[] = [];
  const seen = new Set<string>();
  const assets = new Map<string, DiscoveredAsset>();
  const forms: FormInventory[] = [];
  const edges: LinkEdge[] = [];

  for (const seed of seedUrls(target)) {
    const url = normalizeDiscoveredUrl(seed, target);
    if (url)
      queue.push({
        url,
        depth: seed === target.toString() ? 0 : 1,
        source: seed.endsWith("robots.txt")
          ? "robots"
          : seed.endsWith("sitemap.xml")
            ? "sitemap"
            : "seed",
      });
  }

  let blockedUrlCount = 0;
  let skippedUrlCount = 0;

  while (queue.length && assets.size < maxPages) {
    const item = queue.shift();
    if (!item) continue;

    const normalized = stripQueryForFingerprint(item.url);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    if (!sameOrigin(item.url, origin)) {
      blockedUrlCount += 1;
      continue;
    }

    if (item.depth > maxDepth) {
      skippedUrlCount += 1;
      continue;
    }

    const fetchResult = await safeFetch(item.url);
    const html = fetchResult.body || "";
    const { asset, forms: extractedForms } = createAssetFromObservation({
      url: item.url,
      origin,
      depth: item.depth,
      parentUrl: item.parentUrl,
      discoverySource: item.source,
      httpStatus: fetchResult.status,
      contentType: fetchResult.contentType,
      html,
      isCrawled: fetchResult.ok,
      isBlocked: false,
    });

    assets.set(asset.normalizedUrl, asset);
    forms.push(...extractedForms);

    if (fetchResult.location) {
      const redirect = normalizeDiscoveredUrl(fetchResult.location, item.url);
      if (redirect) {
        edges.push({
          fromUrl: item.url.toString(),
          toUrl: redirect.toString(),
          relationship: "redirects-to",
          isSameOrigin: sameOrigin(redirect, origin),
        });
      }
    }

    if (
      item.url.pathname.endsWith("/sitemap.xml") ||
      html.includes("<urlset") ||
      html.includes("<sitemapindex")
    ) {
      for (const sitemapUrl of extractSitemapUrls(html, origin)) {
        edges.push({
          fromUrl: item.url.toString(),
          toUrl: sitemapUrl.toString(),
          relationship: "sitemap-entry",
          isSameOrigin: sameOrigin(sitemapUrl, origin),
        });
        if (
          !seen.has(stripQueryForFingerprint(sitemapUrl)) &&
          assets.size + queue.length < maxPages * 2
        ) {
          queue.push({
            url: sitemapUrl,
            depth: Math.min(item.depth + 1, maxDepth),
            parentUrl: item.url.toString(),
            source: "sitemap",
          });
        }
      }
    }

    if (item.url.pathname.endsWith("/robots.txt")) {
      for (const robotsUrl of extractRobotsReferences(html, origin)) {
        edges.push({
          fromUrl: item.url.toString(),
          toUrl: robotsUrl.toString(),
          relationship: "robots-reference",
          isSameOrigin: sameOrigin(robotsUrl, origin),
        });
        if (
          !seen.has(stripQueryForFingerprint(robotsUrl)) &&
          assets.size + queue.length < maxPages * 2
        ) {
          queue.push({
            url: robotsUrl,
            depth: Math.min(item.depth + 1, maxDepth),
            parentUrl: item.url.toString(),
            source: "robots",
          });
        }
      }
    }

    if (/html/i.test(fetchResult.contentType) || html.includes("<html")) {
      for (const link of extractLinks(html, item.url)) {
        const isSame = sameOrigin(link.url, origin);
        edges.push({
          fromUrl: item.url.toString(),
          toUrl: link.url.toString(),
          linkText: link.text,
          relationship: link.relationship,
          isSameOrigin: isSame,
        });

        if (!isSame) {
          blockedUrlCount += 1;
          continue;
        }

        if (!isCrawlable(link.url)) {
          const { asset: staticAsset } = createAssetFromObservation({
            url: link.url,
            origin,
            depth: item.depth + 1,
            parentUrl: item.url.toString(),
            discoverySource:
              link.relationship === "script-src" ? "script" : "link",
            isCrawled: false,
          });
          assets.set(staticAsset.normalizedUrl, staticAsset);
          continue;
        }

        if (
          item.depth + 1 <= maxDepth &&
          !seen.has(stripQueryForFingerprint(link.url)) &&
          assets.size + queue.length < maxPages * 2
        ) {
          queue.push({
            url: link.url,
            depth: item.depth + 1,
            parentUrl: item.url.toString(),
            source: link.relationship === "script-src" ? "script" : "link",
          });
        }
      }
    }
  }

  const assetList = [...assets.values()].slice(0, maxPages + 50);
  const coverageScore = calculateCoverageScore(assetList, forms, maxPages);
  const assetRiskScore = calculateAssetRiskScore(assetList, forms);

  const loginSurfaceCount = assetList.filter(
    (asset) => asset.assetType === "login" || asset.hasPasswordField,
  ).length;
  const adminSurfaceCount = assetList.filter(
    (asset) => asset.assetType === "admin" || asset.hasAdminSignal,
  ).length;
  const apiSurfaceCount = assetList.filter(
    (asset) =>
      asset.assetType === "api" ||
      asset.assetType === "documentation" ||
      asset.hasApiSignal,
  ).length;
  const checkoutSurfaceCount = assetList.filter(
    (asset) =>
      asset.assetType === "checkout" ||
      asset.assetType === "payment" ||
      asset.hasPaymentSignal,
  ).length;
  const customerDataSurfaceCount = assetList.filter(
    (asset) => asset.hasCustomerDataField,
  ).length;

  return {
    targetUrl: target.toString(),
    normalizedOrigin: origin.origin,
    crawlerMode: mode,
    runStatus: "completed",
    maxPages,
    maxDepth,
    discoveredUrlCount: seen.size,
    crawledPageCount: assetList.filter((asset) => asset.isCrawled).length,
    skippedUrlCount,
    blockedUrlCount,
    formCount: forms.length,
    loginSurfaceCount,
    adminSurfaceCount,
    apiSurfaceCount,
    checkoutSurfaceCount,
    customerDataSurfaceCount,
    coverageScore,
    assetRiskScore,
    safeSummary: `${assetList.length} asset(s), ${forms.length} form(s), ${apiSurfaceCount} API/doc signal(s), ${loginSurfaceCount} login signal(s) discovered using safe same-origin GET crawling.`,
    developerSummary: buildDeveloperSummary(assetList, forms),
    clientSafeSummary: buildClientSafeSummary(assetList, forms),
    blockedActions: crawlerBlockedActions,
    assets: assetList,
    edges: edges.slice(0, 500),
    forms: forms.slice(0, 200),
  };
}

function emptyReport(
  targetUrl: string,
  normalizedOrigin: string,
  mode: CrawlerMode,
  maxPages: number,
  maxDepth: number,
  status: CrawlerReport["runStatus"],
  summary: string,
): CrawlerReport {
  return {
    targetUrl,
    normalizedOrigin,
    crawlerMode: mode,
    runStatus: status,
    maxPages,
    maxDepth,
    discoveredUrlCount: 0,
    crawledPageCount: 0,
    skippedUrlCount: 0,
    blockedUrlCount: 0,
    formCount: 0,
    loginSurfaceCount: 0,
    adminSurfaceCount: 0,
    apiSurfaceCount: 0,
    checkoutSurfaceCount: 0,
    customerDataSurfaceCount: 0,
    coverageScore: 0,
    assetRiskScore: 0,
    safeSummary: summary,
    developerSummary: "No crawling was performed.",
    clientSafeSummary: "Asset discovery was blocked.",
    blockedActions: crawlerBlockedActions,
    assets: [],
    edges: [],
    forms: [],
  };
}

function calculateCoverageScore(
  assets: DiscoveredAsset[],
  forms: FormInventory[],
  maxPages: number,
) {
  if (!assets.length) return 0;
  let score = Math.min(
    50,
    Math.round(
      (assets.filter((asset) => asset.isCrawled).length /
        Math.max(1, Math.min(maxPages, assets.length))) *
        50,
    ),
  );
  if (assets.some((asset) => asset.assetType === "robots")) score += 10;
  if (assets.some((asset) => asset.assetType === "sitemap")) score += 10;
  if (assets.some((asset) => asset.assetType === "privacy")) score += 10;
  if (assets.some((asset) => asset.assetType === "contact")) score += 5;
  if (forms.length) score += 10;
  if (
    assets.some(
      (asset) =>
        asset.assetType === "api" || asset.assetType === "documentation",
    )
  )
    score += 5;
  return Math.max(0, Math.min(100, score));
}

function calculateAssetRiskScore(
  assets: DiscoveredAsset[],
  forms: FormInventory[],
) {
  let score = 0;
  score += assets.filter((asset) => asset.assetType === "admin").length * 15;
  score += assets.filter((asset) => asset.assetType === "login").length * 10;
  score +=
    assets.filter(
      (asset) =>
        asset.assetType === "api" || asset.assetType === "documentation",
    ).length * 10;
  score +=
    assets.filter(
      (asset) =>
        asset.assetType === "checkout" || asset.assetType === "payment",
    ).length * 12;
  score += forms.filter((form) => form.formRiskLevel === "High").length * 15;
  score += forms.filter((form) => form.customerDataSignal).length * 8;
  return Math.max(0, Math.min(100, score));
}

function buildDeveloperSummary(
  assets: DiscoveredAsset[],
  forms: FormInventory[],
) {
  const priorities = [];
  if (assets.some((asset) => asset.assetType === "admin"))
    priorities.push("review public admin surfaces");
  if (
    assets.some(
      (asset) =>
        asset.assetType === "api" || asset.assetType === "documentation",
    )
  )
    priorities.push("review API/docs exposure");
  if (forms.some((form) => form.customerDataSignal))
    priorities.push("review customer-data forms");
  if (
    assets.some(
      (asset) =>
        asset.assetType === "checkout" || asset.assetType === "payment",
    )
  )
    priorities.push("review checkout/payment flow");
  return priorities.length
    ? `Developer priorities: ${priorities.join(", ")}.`
    : "No major asset priority signals found from safe crawling.";
}

function buildClientSafeSummary(
  assets: DiscoveredAsset[],
  forms: FormInventory[],
) {
  return `${assets.length} website asset(s) and ${forms.length} form(s) were inventoried using safe same-origin discovery.`;
}

export function createAssetDiscoverySnapshot(input: {
  assets: DiscoveredAsset[];
  forms: FormInventory[];
  targetUrl: string;
}) {
  const payload = {
    targetUrl: input.targetUrl,
    assetCount: input.assets.length,
    formCount: input.forms.length,
    assetFingerprints: input.assets
      .map((asset) => asset.assetFingerprint)
      .sort(),
    formSummaries: input.forms.map((form) => ({
      pageUrl: form.pageUrl,
      method: form.method,
      fieldCount: form.fieldCount,
      customerDataSignal: form.customerDataSignal,
    })),
  };

  return {
    snapshotHash: sha256(JSON.stringify(payload)),
    payload,
    summary: `${input.assets.length} asset(s) and ${input.forms.length} form(s) captured in discovery snapshot.`,
  };
}
