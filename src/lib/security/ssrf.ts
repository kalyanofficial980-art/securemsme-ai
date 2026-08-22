import { createHash } from "node:crypto";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { SCAN_ACCESS_HEADER } from "@/lib/scan-access";
import { headersWithVerifiedScanAccess } from "@/lib/scan-access-context";

export type PublicAddress = {
  address: string;
  family: 4 | 6;
};

export type ResolvedPublicUrl = {
  url: URL;
  addresses: PublicAddress[];
};

type DohAnswer = {
  name?: string;
  type?: number;
  TTL?: number;
  data?: string;
};

type DohResponse = {
  Status?: number;
  Answer?: DohAnswer[];
};

type DohProvider = {
  host: string;
  path: string;
  ips: readonly string[];
};

type RepresentativeObservation = {
  expiresAt: number;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: Buffer;
};

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
]);

const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".corp",
];

const DOH_PROVIDERS: readonly DohProvider[] = [
  {
    host: "cloudflare-dns.com",
    path: "/dns-query",
    ips: ["1.1.1.1", "1.0.0.1"],
  },
  {
    host: "dns.google",
    path: "/resolve",
    ips: ["8.8.8.8", "8.8.4.4"],
  },
];

const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 1_000_000;
const NETWORK_TIMEOUT_MS = 8_000;
const DOH_TIMEOUT_MS = 4_000;
const DNS_CACHE_TTL_MS = 30_000;
const REPRESENTATIVE_OBSERVATION_TTL_MS = 90_000;
const REPRESENTATIVE_OBSERVATION_MAX_BYTES = 80_000;
const REPRESENTATIVE_OBSERVATION_MAX_ENTRIES = 64;

const dnsCache = new Map<
  string,
  {
    expiresAt: number;
    addresses: PublicAddress[];
  }
>();

const dnsInFlight = new Map<string, Promise<PublicAddress[]>>();
const representativeObservationCache = new Map<string, RepresentativeObservation>();

function stripIpv6Brackets(hostname: string) {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }

  return hostname;
}

function normalizeHostname(hostname: string) {
  return stripIpv6Brackets(hostname)
    .toLowerCase()
    .replace(/\.$/, "");
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }

  const [a, b, c] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    (a >= 224 && a <= 239) ||
    a >= 240
  );
}

function isPrivateIPv6(ip: string): boolean {
  const value = ip.toLowerCase();

  return (
    value === "::" ||
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe") ||
    value.startsWith("ff") ||
    value.startsWith("::ffff:") ||
    value.startsWith("64:ff9b:") ||
    value.startsWith("2001:db8:") ||
    value.startsWith("2002:")
  );
}

function assertPublicAddress(address: string, family: number) {
  if (family === 4) {
    if (net.isIP(address) !== 4 || isPrivateIPv4(address)) {
      throw new Error("Private/internal IPv4 target is blocked");
    }

    return;
  }

  if (family === 6) {
    if (net.isIP(address) !== 6 || isPrivateIPv6(address)) {
      throw new Error("Private/internal IPv6 target is blocked");
    }

    return;
  }

  throw new Error("Unsupported IP address family");
}

function parsePublicUrl(input: string): URL {
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

  if (url.port && !["80", "443"].includes(url.port)) {
    throw new Error("Only standard web ports 80 and 443 are allowed");
  }

  const hostname = normalizeHostname(url.hostname);

  if (
    !hostname ||
    BLOCKED_HOSTS.has(hostname) ||
    BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new Error("Local/internal hostnames are blocked");
  }

  return url;
}

function dohRequest(
  provider: DohProvider,
  serverIp: string,
  name: string,
  type: "A" | "AAAA",
): Promise<DohAnswer[]> {
  return new Promise((resolve, reject) => {
    const path =
      `${provider.path}?name=${encodeURIComponent(name)}` +
      `&type=${encodeURIComponent(type)}`;

    const req = https.request(
      {
        hostname: serverIp,
        port: 443,
        path,
        method: "GET",
        servername: provider.host,
        rejectUnauthorized: true,
        headers: {
          Host: provider.host,
          Accept: "application/dns-json",
          "Accept-Encoding": "identity",
          "User-Agent": "VeyraSec-Secure-DNS/1.0",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;

        if (status !== 200) {
          res.resume();
          reject(
            new Error(
              `Secure DNS resolver ${provider.host} returned HTTP ${status}`,
            ),
          );
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;

        res.on("data", (chunk) => {
          const buffer = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk);

          total += buffer.length;

          if (total > 64_000) {
            res.destroy(new Error("Secure DNS response was too large"));
            return;
          }

          chunks.push(buffer);
        });

        res.on("error", reject);

        res.on("end", () => {
          try {
            const parsed = JSON.parse(
              Buffer.concat(chunks).toString("utf8"),
            ) as DohResponse;

            if (parsed.Status !== 0) {
              resolve([]);
              return;
            }

            resolve(Array.isArray(parsed.Answer) ? parsed.Answer : []);
          } catch {
            reject(new Error("Secure DNS resolver returned invalid JSON"));
          }
        });
      },
    );

    req.setTimeout(DOH_TIMEOUT_MS, () => {
      req.destroy(new Error("Secure DNS resolver timed out"));
    });

    req.on("error", reject);
    req.end();
  });
}

async function resolveFamily(
  provider: DohProvider,
  serverIp: string,
  hostname: string,
  family: 4 | 6,
  depth = 0,
): Promise<PublicAddress[]> {
  if (depth > 4) {
    return [];
  }

  const expectedType = family === 4 ? 1 : 28;
  const answers = await dohRequest(
    provider,
    serverIp,
    hostname,
    family === 4 ? "A" : "AAAA",
  );

  const addresses = answers
    .filter(
      (answer) =>
        answer.type === expectedType &&
        typeof answer.data === "string" &&
        net.isIP(answer.data) === family,
    )
    .map((answer) => ({
      address: answer.data as string,
      family,
    }));

  if (addresses.length > 0) {
    return addresses;
  }

  const cname = answers.find(
    (answer) =>
      answer.type === 5 &&
      typeof answer.data === "string",
  )?.data;

  if (!cname) {
    return [];
  }

  const nextHostname = normalizeHostname(cname);

  if (!nextHostname || nextHostname === hostname) {
    return [];
  }

  return resolveFamily(
    provider,
    serverIp,
    nextHostname,
    family,
    depth + 1,
  );
}

function dedupeAddresses(addresses: PublicAddress[]) {
  const seen = new Set<string>();

  return addresses.filter((item) => {
    const key = `${item.family}:${item.address}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function resolveHostnameUncached(
  hostname: string,
): Promise<PublicAddress[]> {
  let lastError: Error | null = null;

  for (const provider of DOH_PROVIDERS) {
    for (const serverIp of provider.ips) {
      const [ipv4Result, ipv6Result] = await Promise.allSettled([
        resolveFamily(provider, serverIp, hostname, 4),
        resolveFamily(provider, serverIp, hostname, 6),
      ]);

      const addresses: PublicAddress[] = [
        ...(ipv4Result.status === "fulfilled"
          ? ipv4Result.value
          : []),
        ...(ipv6Result.status === "fulfilled"
          ? ipv6Result.value
          : []),
      ];

      if (addresses.length > 0) {
        return dedupeAddresses(addresses);
      }

      if (ipv4Result.status === "rejected") {
        lastError =
          ipv4Result.reason instanceof Error
            ? ipv4Result.reason
            : new Error("IPv4 secure DNS lookup failed");
      }

      if (ipv6Result.status === "rejected") {
        lastError =
          ipv6Result.reason instanceof Error
            ? ipv6Result.reason
            : new Error("IPv6 secure DNS lookup failed");
      }
    }
  }

  throw new Error(
    lastError
      ? `Target hostname did not resolve through secure DNS: ${lastError.message}`
      : "Target hostname did not resolve through secure DNS",
  );
}

async function resolveHostname(
  hostname: string,
): Promise<PublicAddress[]> {
  const cached = dnsCache.get(hostname);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.addresses;
  }

  const existing = dnsInFlight.get(hostname);

  if (existing) {
    return existing;
  }

  const promise = resolveHostnameUncached(hostname)
    .then((addresses) => {
      for (const record of addresses) {
        assertPublicAddress(record.address, record.family);
      }

      dnsCache.set(hostname, {
        expiresAt: Date.now() + DNS_CACHE_TTL_MS,
        addresses,
      });

      return addresses;
    })
    .finally(() => {
      dnsInFlight.delete(hostname);
    });

  dnsInFlight.set(hostname, promise);

  return promise;
}

export async function resolvePublicHttpUrl(
  input: string,
): Promise<ResolvedPublicUrl> {
  const url = parsePublicUrl(input);
  const hostname = normalizeHostname(url.hostname);

  const directIpType = net.isIP(hostname);

  if (directIpType === 4 || directIpType === 6) {
    assertPublicAddress(hostname, directIpType);

    return {
      url,
      addresses: [
        {
          address: hostname,
          family: directIpType,
        },
      ],
    };
  }

  const addresses = await resolveHostname(hostname);

  if (!addresses.length) {
    throw new Error("Target hostname did not resolve");
  }

  for (const record of addresses) {
    assertPublicAddress(record.address, record.family);
  }

  return {
    url,
    addresses,
  };
}

export async function validatePublicHttpUrl(
  input: string,
): Promise<URL> {
  const { url } = await resolvePublicHttpUrl(input);
  return url;
}

function createHeaders(
  url: URL,
  init?: RequestInit,
): Record<string, string> {
  const inputHeaders = headersWithVerifiedScanAccess(url, init?.headers);
  const output: Record<string, string> = {};

  inputHeaders.forEach((value, key) => {
    output[key] = value;
  });

  if (!output["user-agent"]) {
    output["user-agent"] = "VeyraSec-Passive-Scanner/1.0";
  }

  if (!output["accept-encoding"]) {
    output["accept-encoding"] = "identity";
  }

  output.host = url.host;

  return output;
}

function observationKey(url: URL, init?: RequestInit) {
  const headers = headersWithVerifiedScanAccess(url, init?.headers);
  const token = headers.get(SCAN_ACCESS_HEADER) || "";
  const tokenScope = token
    ? createHash("sha256").update(token).digest("hex").slice(0, 24)
    : "public";
  return `${url.toString()}|${tokenScope}`;
}

function isTruthVerificationRequest(init?: RequestInit) {
  const userAgent = new Headers(init?.headers).get("user-agent") || "";
  return (
    userAgent.startsWith("VeyraSec-Truth-Verification/") ||
    userAgent.startsWith("VeyraSec-DeepScan-TruthGate/")
  );
}

function cachedRepresentativeObservation(url: URL, init?: RequestInit) {
  if (!isTruthVerificationRequest(init)) return null;
  const key = observationKey(url, init);
  const cached = representativeObservationCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    representativeObservationCache.delete(key);
    return null;
  }

  const headers = new Headers(cached.headers);
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.set("x-veyrasec-observation-reused", "initial-scan");

  return new Response(Buffer.from(cached.body), {
    status: cached.status,
    statusText: cached.statusText,
    headers,
  });
}

async function rememberRepresentativeObservation(
  url: URL,
  init: RequestInit | undefined,
  response: Response,
) {
  const method = (init?.method || "GET").toUpperCase();
  if (method !== "GET" || response.status < 200 || response.status >= 300) return;

  const contentType = response.headers.get("content-type") || "";
  if (
    contentType &&
    !contentType.includes("text") &&
    !contentType.includes("html") &&
    !contentType.includes("json")
  ) {
    return;
  }

  const body = Buffer.from(await response.clone().arrayBuffer()).subarray(
    0,
    REPRESENTATIVE_OBSERVATION_MAX_BYTES,
  );
  const headers: Array<[string, string]> = [];
  response.headers.forEach((value, key) => headers.push([key, value]));

  representativeObservationCache.set(observationKey(url, init), {
    expiresAt: Date.now() + REPRESENTATIVE_OBSERVATION_TTL_MS,
    status: response.status,
    statusText: response.statusText,
    headers,
    body,
  });

  while (representativeObservationCache.size > REPRESENTATIVE_OBSERVATION_MAX_ENTRIES) {
    const oldestKey = representativeObservationCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    representativeObservationCache.delete(oldestKey);
  }
}

function requestPinnedAddress(
  url: URL,
  target: PublicAddress,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();

  if (method !== "GET" && method !== "HEAD") {
    throw new Error(
      "Passive website checks only support GET and HEAD requests",
    );
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const finish = (response: Response) => {
      if (settled) return;
      settled = true;
      resolve(response);
    };

    const headers = createHeaders(url, init);
    const hostname = normalizeHostname(url.hostname);

    const options: https.RequestOptions = {
      hostname: target.address,
      family: target.family,
      port:
        url.port ||
        (url.protocol === "https:" ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method,
      headers,
    };

    if (
      url.protocol === "https:" &&
      net.isIP(hostname) === 0
    ) {
      options.servername = hostname;
    }

    const handleResponse = (res: http.IncomingMessage) => {
      const status = res.statusCode ?? 502;
      const responseHeaders = new Headers();

      for (const [key, value] of Object.entries(res.headers)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            responseHeaders.append(key, item);
          }
        } else if (value !== undefined) {
          responseHeaders.set(key, String(value));
        }
      }

      const rawLength = res.headers["content-length"];
      const declaredLength = Number(
        Array.isArray(rawLength)
          ? rawLength[0]
          : rawLength || 0,
      );

      if (
        Number.isFinite(declaredLength) &&
        declaredLength > MAX_RESPONSE_BYTES
      ) {
        res.resume();
        fail(new Error("Response too large for passive scan"));
        return;
      }

      if (method === "HEAD") {
        res.resume();

        finish(
          new Response(null, {
            status,
            statusText: res.statusMessage || "",
            headers: responseHeaders,
          }),
        );

        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;

      res.on("data", (chunk) => {
        const buffer = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk);

        total += buffer.length;

        if (total > MAX_RESPONSE_BYTES) {
          res.destroy(
            new Error("Response too large for passive scan"),
          );
          return;
        }

        chunks.push(buffer);
      });

      res.on("error", (error) => {
        fail(
          error instanceof Error
            ? error
            : new Error("Website response failed"),
        );
      });

      res.on("aborted", () => {
        fail(new Error("Website response was aborted"));
      });

      res.on("end", () => {
        const nullBodyStatus =
          status === 204 ||
          status === 205 ||
          status === 304;

        finish(
          new Response(
            nullBodyStatus ? null : Buffer.concat(chunks),
            {
              status,
              statusText: res.statusMessage || "",
              headers: responseHeaders,
            },
          ),
        );
      });
    };

    const req =
      url.protocol === "https:"
        ? https.request(options, handleResponse)
        : http.request(options, handleResponse);

    req.setTimeout(NETWORK_TIMEOUT_MS, () => {
      req.destroy(new Error("Website request timed out"));
    });

    req.on("error", (error) => {
      fail(
        error instanceof Error
          ? error
          : new Error("Website request failed"),
      );
    });

    const signal = init?.signal;

    if (signal) {
      const abort = () => {
        req.destroy(new Error("Website request aborted"));
      };

      if (signal.aborted) {
        abort();
      } else {
        signal.addEventListener("abort", abort, {
          once: true,
        });

        req.on("close", () => {
          signal.removeEventListener("abort", abort);
        });
      }
    }

    req.end();
  });
}

function isRedirectStatus(status: number) {
  return [301, 302, 303, 307, 308].includes(status);
}

function preferredAddresses(addresses: PublicAddress[]) {
  return [...addresses].sort(
    (left, right) => left.family - right.family,
  );
}

export async function safeFetchPublicUrl(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  let current = input;

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount++
  ) {
    const { url, addresses } =
      await resolvePublicHttpUrl(current);

    const reused = cachedRepresentativeObservation(url, init);
    if (reused) return reused;

    let response: Response | null = null;
    let lastError: Error | null = null;

    for (
      const target of preferredAddresses(addresses).slice(0, 4)
    ) {
      try {
        response = await requestPinnedAddress(
          url,
          target,
          init,
        );
        break;
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error("Website request failed");

        if (init?.signal?.aborted) {
          throw lastError;
        }
      }
    }

    if (!response) {
      throw (
        lastError ||
        new Error("Could not connect to validated public target")
      );
    }

    const location = response.headers.get("location");

    if (
      !isRedirectStatus(response.status) ||
      !location
    ) {
      await rememberRepresentativeObservation(url, init, response);
      return response;
    }

    if (init?.redirect === "manual") {
      return response;
    }

    if (init?.redirect === "error") {
      throw new Error("Website redirect was not allowed");
    }

    current = new URL(location, url).toString();
  }

  throw new Error(
    "Too many redirects while checking website",
  );
}

export function assertSafeResponseSize(headers: Headers) {
  const rawLength = headers.get("content-length");

  if (
    rawLength &&
    Number(rawLength) > MAX_RESPONSE_BYTES
  ) {
    throw new Error(
      "Response too large for passive scan",
    );
  }
}
