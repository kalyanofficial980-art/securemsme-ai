import { safeFetchPublicUrl } from "@/lib/security/ssrf";
import { classifyResponseTruth } from "@/lib/scan-truth";

export type DeepEvidencePage = {
  url: string;
  path: string;
  status: number | null;
  contentType: string | null;
  truth: "verified" | "inconclusive";
  title: string | null;
  formsObserved: number;
  scriptsObserved: number;
  apiSurface: boolean;
};

export type DeepEvidenceReport = {
  version: "deep-evidence-v2";
  targetUrl: string;
  generatedAt: string;
  status: "completed" | "completed-with-warnings";
  policy: {
    sameOriginOnly: true;
    allowedMethods: ["GET"];
    maxPages: number;
    anchorNavigationOnly: true;
    queryStringsFollowed: false;
    apiRoutesFetched: false;
    actionLikeRoutesFetched: false;
    authRoutesFetched: false;
    noFormSubmission: true;
    noMutationMethods: true;
    noPrivateBodyStorage: true;
  };
  pages: DeepEvidencePage[];
  surface: {
    pagesObserved: number;
    formsObserved: number;
    scriptsObserved: number;
    apiLikeRoutesObserved: string[];
    loginLikeRoutesObserved: string[];
    actionLikeRoutesObserved: string[];
    inconclusivePages: number;
  };
  customerSummary: string;
};

const ACTION_KEYWORDS = [
  "logout",
  "delete",
  "destroy",
  "checkout",
  "payment",
  "cancel",
  "password",
  "upload",
  "publish",
  "edit",
  "update",
  "activate",
  "verify",
  "confirm",
  "subscribe",
  "unsubscribe",
  "reset",
  "revoke",
  "invite",
  "accept",
  "approve",
  "reject",
  "download",
  "export",
  "webhook",
  "callback",
];

function isApiLike(url: URL) {
  const value = url.pathname.toLowerCase();
  return (
    /(?:^|\/)api(?:\/|$)/.test(value) ||
    value.includes("graphql") ||
    value.includes("swagger") ||
    value.includes("openapi") ||
    value.endsWith(".json")
  );
}

function isLoginLike(url: URL) {
  const value = url.pathname.toLowerCase();
  return /(?:^|\/)(?:login|signin|sign-in|signup|sign-up|auth)(?:\/|$)/.test(value);
}

function isActionLike(url: URL) {
  const value = url.pathname.toLowerCase();
  return ACTION_KEYWORDS.some((keyword) => value.includes(keyword));
}

function isLikelyNavigationDocument(url: URL) {
  const lastSegment = url.pathname.split("/").filter(Boolean).at(-1) || "";
  if (!lastSegment || !lastSegment.includes(".")) return true;
  return /\.(?:html?|xhtml)$/i.test(lastSegment);
}

function normalizeObservedUrl(base: URL, rawHref: string) {
  try {
    const candidate = new URL(rawHref, base);
    candidate.hash = "";
    if (candidate.origin !== base.origin) return null;
    if (!["http:", "https:"].includes(candidate.protocol)) return null;
    if (candidate.username || candidate.password) return null;
    return candidate;
  } catch {
    return null;
  }
}

function canFetchNavigation(url: URL) {
  if (url.search) return false;
  if (isApiLike(url) || isLoginLike(url) || isActionLike(url)) return false;
  return isLikelyNavigationDocument(url);
}

export function discoverDeepNavigation(base: URL, html: string) {
  const crawlable: URL[] = [];
  const apiLikeRoutesObserved = new Set<string>();
  const loginLikeRoutesObserved = new Set<string>();
  const actionLikeRoutesObserved = new Set<string>();

  for (const match of html.matchAll(/<a\b[^>]{0,1200}?\bhref\s*=\s*["']([^"']{1,700})["'][^>]*>/gi)) {
    const candidate = normalizeObservedUrl(base, match[1]);
    if (!candidate) continue;

    const path = `${candidate.pathname}${candidate.search}`;
    if (isApiLike(candidate)) apiLikeRoutesObserved.add(path);
    if (isLoginLike(candidate)) loginLikeRoutesObserved.add(path);
    if (isActionLike(candidate)) actionLikeRoutesObserved.add(path);

    if (canFetchNavigation(candidate)) crawlable.push(candidate);
  }

  return {
    crawlable: [...new Map(crawlable.map((url) => [url.toString(), url])).values()],
    apiLikeRoutesObserved: [...apiLikeRoutesObserved],
    loginLikeRoutesObserved: [...loginLikeRoutesObserved],
    actionLikeRoutesObserved: [...actionLikeRoutesObserved],
  };
}

async function readPrefix(response: Response, maxBytes = 120_000) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const remaining = maxBytes - total;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      total += chunk.byteLength;
      if (chunk.byteLength < value.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

async function fetchEvidencePage(url: URL): Promise<{
  page: DeepEvidencePage;
  discovery: ReturnType<typeof discoverDeepNavigation>;
}> {
  try {
    const response = await safeFetchPublicUrl(url.toString(), {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "text/html,text/plain,*/*;q=0.3",
        Range: "bytes=0-119999",
        "User-Agent": "VeyraSec-Deep-Evidence/2.0",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const body =
      contentType.includes("text") || contentType.includes("html")
        ? await readPrefix(response)
        : "";
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    const truth = classifyResponseTruth({ status: response.status, headers, body });
    const isHtml = contentType.includes("html");
    const title = isHtml ? body.match(/<title[^>]*>([^<]{1,180})<\/title>/i)?.[1]?.trim() || null : null;
    const formsObserved = isHtml ? [...body.matchAll(/<form\b/gi)].length : 0;
    const scriptsObserved = isHtml ? [...body.matchAll(/<script\b/gi)].length : 0;
    return {
      page: {
        url: url.toString(),
        path: `${url.pathname}${url.search}`,
        status: response.status,
        contentType: contentType || null,
        truth: truth.truth === "verified" ? "verified" : "inconclusive",
        title,
        formsObserved,
        scriptsObserved,
        apiSurface: isApiLike(url),
      },
      discovery:
        truth.truth === "verified" && isHtml && body
          ? discoverDeepNavigation(url, body)
          : {
              crawlable: [],
              apiLikeRoutesObserved: [],
              loginLikeRoutesObserved: [],
              actionLikeRoutesObserved: [],
            },
    };
  } catch {
    return {
      page: {
        url: url.toString(),
        path: `${url.pathname}${url.search}`,
        status: null,
        contentType: null,
        truth: "inconclusive",
        title: null,
        formsObserved: 0,
        scriptsObserved: 0,
        apiSurface: isApiLike(url),
      },
      discovery: {
        crawlable: [],
        apiLikeRoutesObserved: [],
        loginLikeRoutesObserved: [],
        actionLikeRoutesObserved: [],
      },
    };
  }
}

function safeStartUrl(targetUrl: string) {
  const candidate = new URL(targetUrl);
  candidate.hash = "";
  candidate.search = "";
  if (isApiLike(candidate) || isLoginLike(candidate) || isActionLike(candidate) || !isLikelyNavigationDocument(candidate)) {
    candidate.pathname = "/";
  }
  return candidate;
}

export async function runDeepEvidenceV2(targetUrl: string): Promise<DeepEvidenceReport> {
  const base = safeStartUrl(targetUrl);
  const maxPages = 8;
  const queue: URL[] = [base];
  const queued = new Set([base.toString()]);
  const pages: DeepEvidencePage[] = [];
  const apiLikeRoutesObserved = new Set<string>();
  const loginLikeRoutesObserved = new Set<string>();
  const actionLikeRoutesObserved = new Set<string>();

  while (queue.length && pages.length < maxPages) {
    const current = queue.shift()!;
    const result = await fetchEvidencePage(current);
    pages.push(result.page);

    for (const path of result.discovery.apiLikeRoutesObserved) apiLikeRoutesObserved.add(path);
    for (const path of result.discovery.loginLikeRoutesObserved) loginLikeRoutesObserved.add(path);
    for (const path of result.discovery.actionLikeRoutesObserved) actionLikeRoutesObserved.add(path);

    for (const link of result.discovery.crawlable) {
      if (pages.length + queue.length >= maxPages) break;
      if (queued.has(link.toString())) continue;
      queued.add(link.toString());
      queue.push(link);
    }
  }

  const formsObserved = pages.reduce((sum, page) => sum + page.formsObserved, 0);
  const scriptsObserved = pages.reduce((sum, page) => sum + page.scriptsObserved, 0);
  const inconclusivePages = pages.filter((page) => page.truth === "inconclusive").length;

  return {
    version: "deep-evidence-v2",
    targetUrl: base.toString(),
    generatedAt: new Date().toISOString(),
    status: inconclusivePages ? "completed-with-warnings" : "completed",
    policy: {
      sameOriginOnly: true,
      allowedMethods: ["GET"],
      maxPages,
      anchorNavigationOnly: true,
      queryStringsFollowed: false,
      apiRoutesFetched: false,
      actionLikeRoutesFetched: false,
      authRoutesFetched: false,
      noFormSubmission: true,
      noMutationMethods: true,
      noPrivateBodyStorage: true,
    },
    pages,
    surface: {
      pagesObserved: pages.length,
      formsObserved,
      scriptsObserved,
      apiLikeRoutesObserved: [...apiLikeRoutesObserved],
      loginLikeRoutesObserved: [...loginLikeRoutesObserved],
      actionLikeRoutesObserved: [...actionLikeRoutesObserved],
      inconclusivePages,
    },
    customerSummary: inconclusivePages
      ? `Deep evidence reviewed ${pages.length} same-origin navigation page(s); ${inconclusivePages} page(s) were inconclusive. API, auth, action-like and query-string routes were observed only and not followed.`
      : `Deep evidence reviewed ${pages.length} same-origin navigation page(s) using GET only. Forms were not submitted, and API, auth, action-like and query-string routes were observed only and not followed.`,
  };
}
