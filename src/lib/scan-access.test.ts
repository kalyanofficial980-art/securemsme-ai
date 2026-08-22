import { describe, expect, it } from "vitest";
import {
  hashScanAccessToken,
  isValidScanAccessHash,
  isValidScanAccessToken,
  SCAN_ACCESS_HEADER,
  scanAccessHeaders,
  scanAccessPrefix,
} from "@/lib/scan-access";
import {
  headersWithVerifiedScanAccess,
  runWithVerifiedScanAccess,
} from "@/lib/scan-access-context";

const TOKEN = `vyscan_${"A".repeat(43)}`;

describe("Verified Scan Access token contract", () => {
  it("accepts only the fixed high-entropy token format", () => {
    expect(isValidScanAccessToken(TOKEN)).toBe(true);
    expect(isValidScanAccessToken("vyscan_short")).toBe(false);
    expect(isValidScanAccessToken("not-vyscan_" + "A".repeat(43))).toBe(false);
  });

  it("hashes deterministically without exposing the raw token", () => {
    const hash = hashScanAccessToken(TOKEN);
    expect(hash).toHaveLength(64);
    expect(isValidScanAccessHash(hash)).toBe(true);
    expect(hash).not.toContain(TOKEN);
    expect(hashScanAccessToken(TOKEN)).toBe(hash);
    expect(scanAccessPrefix(TOKEN)).not.toBe(TOKEN);
  });

  it("builds only the dedicated scanner access header", () => {
    expect(scanAccessHeaders(TOKEN)).toEqual({ [SCAN_ACCESS_HEADER]: TOKEN });
    expect(scanAccessHeaders(null)).toEqual({});
  });

  it("injects the token only for the exact authorized origin", async () => {
    expect(headersWithVerifiedScanAccess("https://example.com/").has(SCAN_ACCESS_HEADER)).toBe(false);

    await runWithVerifiedScanAccess({
      targetUrl: "https://example.com/",
      token: TOKEN,
      task: async () => {
        expect(
          headersWithVerifiedScanAccess("https://example.com/path").get(SCAN_ACCESS_HEADER),
        ).toBe(TOKEN);
        expect(
          headersWithVerifiedScanAccess("https://sub.example.com/path").has(SCAN_ACCESS_HEADER),
        ).toBe(false);
        expect(
          headersWithVerifiedScanAccess("https://example.org/path").has(SCAN_ACCESS_HEADER),
        ).toBe(false);
      },
    });
  });
});
