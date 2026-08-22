export const SCAN_ACCESS_HEADER = "x-veyrasec-scan-token";
export const SCAN_ACCESS_TOKEN_PREFIX = "vyscan_";

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateScanAccessToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${SCAN_ACCESS_TOKEN_PREFIX}${toBase64Url(bytes)}`;
}

export async function hashScanAccessTokenClient(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function scanAccessTokenPrefix(token: string) {
  return `${token.slice(0, 14)}…`;
}
