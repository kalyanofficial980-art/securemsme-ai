import { createHash, timingSafeEqual } from "node:crypto";

export const SCAN_ACCESS_HEADER = "x-veyrasec-scan-token";
export const SCAN_ACCESS_TOKEN_PREFIX = "vyscan_";

const TOKEN_PATTERN = /^vyscan_[A-Za-z0-9_-]{43}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export function isValidScanAccessToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function isValidScanAccessHash(value: unknown): value is string {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

export function hashScanAccessToken(token: string) {
  if (!isValidScanAccessToken(token)) {
    throw new Error("Invalid scan access token format");
  }

  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function scanAccessPrefix(token: string) {
  if (!isValidScanAccessToken(token)) {
    throw new Error("Invalid scan access token format");
  }

  return `${token.slice(0, 14)}…`;
}

export function scanAccessHeaders(token?: string | null): Record<string, string> {
  if (!token) return {};
  if (!isValidScanAccessToken(token)) {
    throw new Error("Invalid scan access token format");
  }

  return { [SCAN_ACCESS_HEADER]: token };
}

export function hashesMatch(left: string, right: string) {
  if (!isValidScanAccessHash(left) || !isValidScanAccessHash(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}
