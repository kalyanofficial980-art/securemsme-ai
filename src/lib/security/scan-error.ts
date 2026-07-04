const SAFE_SCAN_ERROR =
  "Scan could not be completed safely. Please check the website URL and try again.";

const TEMPORARY_DNS_ERROR =
  "DNS lookup is temporarily busy. Please wait a few seconds and try again.";

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
  return toSafeScanErrorMessage(message);
}
