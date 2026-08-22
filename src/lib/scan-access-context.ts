import { AsyncLocalStorage } from "node:async_hooks";
import { isValidScanAccessToken, SCAN_ACCESS_HEADER } from "@/lib/scan-access";

type ScanAccessContext = {
  origin: string;
  token: string;
};

type ScanAccessGlobal = typeof globalThis & {
  __veyraScanAccessStorage?: AsyncLocalStorage<ScanAccessContext>;
  __veyraOriginalFetch?: typeof fetch;
  __veyraScanAccessFetchPatched?: boolean;
};

const globalState = globalThis as ScanAccessGlobal;
const storage =
  globalState.__veyraScanAccessStorage ||
  new AsyncLocalStorage<ScanAccessContext>();
globalState.__veyraScanAccessStorage = storage;

function requestUrl(input: RequestInfo | URL) {
  try {
    if (input instanceof URL) return input;
    if (typeof input === "string") return new URL(input);
    return new URL(input.url);
  } catch {
    return null;
  }
}

export function headersWithVerifiedScanAccess(
  input: string | URL,
  headers?: HeadersInit,
) {
  const output = new Headers(headers);
  const context = storage.getStore();

  let url: URL | null = null;
  try {
    url = input instanceof URL ? input : new URL(input);
  } catch {
    url = null;
  }

  if (context && url && url.origin === context.origin) {
    output.set(SCAN_ACCESS_HEADER, context.token);
  }

  return output;
}

function installFetchPatch() {
  if (globalState.__veyraScanAccessFetchPatched) return;

  const originalFetch = globalState.__veyraOriginalFetch || globalThis.fetch.bind(globalThis);
  globalState.__veyraOriginalFetch = originalFetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);

    if (!url) {
      return originalFetch(input, init);
    }

    const baseHeaders = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => baseHeaders.set(key, value));
    const headers = headersWithVerifiedScanAccess(url, baseHeaders);

    return originalFetch(input, { ...init, headers });
  };

  globalState.__veyraScanAccessFetchPatched = true;
}

export async function runWithVerifiedScanAccess<T>(input: {
  targetUrl: string;
  token?: string | null;
  task: () => Promise<T>;
}) {
  if (!input.token) return input.task();
  if (!isValidScanAccessToken(input.token)) {
    throw new Error("Invalid scan access token format");
  }

  const target = new URL(input.targetUrl);
  installFetchPatch();

  return storage.run(
    { origin: target.origin, token: input.token },
    input.task,
  );
}
