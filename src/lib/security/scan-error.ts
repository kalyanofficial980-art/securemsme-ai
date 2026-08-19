const SAFE_SCAN_ERROR =
  "Scan could not be completed safely. Please check the website URL and try again.";

const TEMPORARY_DNS_ERROR =
  "DNS lookup is temporarily busy. Please wait a few seconds and try again.";

const CLIENT_SAFE_SCAN_ERRORS = new Set([
  "Please login before scanning a website.",
  "Please enter a valid website URL.",
  "Saved website was not found.",
  "Please enter a website URL or select a saved website.",
  "Free daily scan limit reached. Please try again tomorrow or upgrade.",
  "Monthly scan limit reached for your current plan.",
]);

export function toSafeScanErrorMessage(
  error: unknown,
  fallback = SAFE_SCAN_ERROR,
) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const text = raw.trim();

  if (!text) {
    return fallback;
  }

  if (/EBUSY|EAI_AGAIN|ETIMEOUT|ETIMEDOUT|AbortError/i.test(text)) {
    return TEMPORARY_DNS_ERROR;
  }

  if (
    /getaddrinfo|ENOTFOUND|ECONNREFUSED|ECONNRESET|fetch failed|network error|could not resolve/i.test(
      text,
    )
  ) {
    return SAFE_SCAN_ERROR;
  }

  if (/service_role|supabase_service_role|postgres:\/\/|database url|private key|authorization:\s*bearer/i.test(text)) {
    return SAFE_SCAN_ERROR;
  }

  return fallback;
}

export function toClientSafeScanError(message?: string) {
  const text = message?.trim() || "";

  if (CLIENT_SAFE_SCAN_ERRORS.has(text)) {
    return text;
  }

  return toSafeScanErrorMessage(message);
}
