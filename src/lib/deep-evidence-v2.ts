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
    noFormSubmission: true;
    noMutationRequests: true;
    noPrivateBodyStorage: true;
  };
  pages: DeepEvidencePage[];
  surface: {
    pagesObserved: number;
    formsObserved: number;
    scriptsObserved: number;
    apiLikeRoutesObserved: string[];
    loginLikeRoutesObserved: string[];
    inconclusivePages: number;
  };
  customerSummary: string;
};

const BLOCKED_KEYWORDS = [
  "logout",
  "delete",
  "destroy",
  "checkout",
  "payment",
  "order/cancel",
  "cart/checkout",
  "settings/password",
  "upload",
  "publish",
  "edit",
  "update",
];

function isSafePath(url: URL) {
  const text = `${url.pathname}${url.search}`.toLowerCase();
  return !BLOCKED_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isApiLike(url: URL) {
  const value = `${url.pathname}${url.search}`.toLowerCase();
  return (
    value.includes("/api") ||
    value.includes("graphql") ||
    value.includes("swagger") ||
    value.includes("openapi") ||
    value.endsWith(".json")
  );
}

function isLoginLike(url: URL) {
  const value = url.pathname.toLowerCase();
  return value.includes("login") || value.includes("signin") || value.includes("auth");
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

function discoveredLinks(base: URL, html: string) {
  const urls: URL[] = [];
  for (const match of html.matchAll(/\s(?:href|src)=["']([^"']{1,700})["']/gi)) {
    try {
      const candidate = new URL(match[1], base);
      candidate.hash = "";
      if (candidate.origin !== base.origin) continue;
      if (!["http:", "https:"].includes(candidate.protocol)) continue;
      if (!isSafePath(candidate)) continue;
      urls.push(candidate);
    } catch {
      // Ignore malformed discovery strings.
    }
  }
  return [...new Map(urls.map((url) => [url.toString(), url])).values()];
}

async function fetchEvidencePage(url: URL): Promise<{ page: DeepEvidencePage; links: URL[] }> {
  try {
    const response = await safeFetchPublicUrl(url.toString(), {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "text/html,application/json,text/plain,*/*;q=0.5",
        Range: "bytes=0-119999",
        "User-Agent": "VeyraSec-Deep-Evidence/2.0",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const body =
      contentType.includes("text") || contentType.includes("html") || contentType.includes("json")
        ? await readPrefix(response)
        : "";
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    const truth = classifyResponseTruth({ status: response.status, headers, body });
    const title = body.match(/<title[^>]*>([^<]{1,180})<\/title>/i)?.[1]?.trim() || null;
    const formsObserved = [...body.matchAll(/<form\b/gi)].length;
    const scriptsObserved = [...body.matchAll(/<script\b/gi)].length;
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
      links: truth.truth === "verified" && body ? discoveredLinks(url, body) : [],
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
      links: [],
    };
  }
}

export async function runDeepEvidenceV2(targetUrl: string): Promise<DeepEvidenceReport> {
  const base = new URL(targetUrl);
  base.hash = "";
  const maxPages = 8;
  const queue: URL[] = [base];
  const queued = new Set([base.toString()]);
  const pages: DeepEvidencePage[] = [];

  while (queue.length && pages.length < maxPages) {
    const current = queue.shift()!;
    const result = await fetchEvidencePage(current);
    pages.push(result.page);
    for (const link of result.links) {
      if (pages.length + queue.length >= maxPages) break;
      if (queued.has(link.toString())) continue;
      queued.add(link.toString());
      queue.push(link);
    }
  }

  const apiLikeRoutesObserved = pages
    .filter((page) => page.apiSurface && page.truth === "verified")
    .map((page) => page.path);
  const loginLikeRoutesObserved = pages
    .filter((page) => isLoginLike(new URL(page.url)) && page.truth === "verified")
    .map((page) => page.path);
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
      noFormSubmission: true,
      noMutationRequests: true,
      noPrivateBodyStorage: true,
    },
    pages,
    surface: {
      pagesObserved: pages.length,
      formsObserved,
      scriptsObserved,
      apiLikeRoutesObserved,
      loginLikeRoutesObserved,
      inconclusivePages,
    },
    customerSummary: inconclusivePages
      ? `Deep evidence reviewed ${pages.length} same-origin page(s); ${inconclusivePages} page(s) were inconclusive and were not treated as vulnerabilities.`
      : `Deep evidence reviewed ${pages.length} same-origin page(s) using read-only GET requests without submitting forms or mutating the target.`,
  };
}
