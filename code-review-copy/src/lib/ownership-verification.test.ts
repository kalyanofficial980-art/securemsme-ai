import { describe, expect, it } from "vitest";
import {
  buildVerificationToken,
  getHostname,
  getVerificationInstructions,
  normalizeWebsiteUrl,
} from "@/lib/ownership-verification";

describe("ownership verification helpers", () => {
  it("normalizes URLs and hostnames", () => {
    expect(normalizeWebsiteUrl("example.com")).toBe("https://example.com");
    expect(getHostname("https://example.com/path")).toBe("example.com");
  });

  it("builds verification instructions", () => {
    const token = buildVerificationToken();
    const instructions = getVerificationInstructions(
      "https://example.com",
      token,
    );

    expect(token).toContain("securemsme_");
    expect(instructions.dns.name).toBe("_securemsme.example.com");
    expect(instructions.dns.value).toBe(`securemsme-verify=${token}`);
    expect(instructions.htmlFile.url).toBe(
      "https://example.com/.well-known/securemsme-verify.txt",
    );
    expect(instructions.metaTag.tag).toContain(token);
  });
});
