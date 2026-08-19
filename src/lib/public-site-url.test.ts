import { describe, expect, it } from "vitest";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

describe("public site URL", () => {
  it("falls back to the stable production domain", () => {
    expect(resolvePublicSiteUrl()).toBe("https://securemsme-ai-live.vercel.app");
  });

  it("rejects Vercel preview and branch domains", () => {
    expect(
      resolvePublicSiteUrl(
        "https://securemsme-ai-live-git-feature-kalyanofficial980-arts-projects.vercel.app",
      ),
    ).toBe("https://securemsme-ai-live.vercel.app");
  });

  it("keeps an HTTPS custom production domain", () => {
    expect(resolvePublicSiteUrl("https://security.example.com/path"))
      .toBe("https://security.example.com");
  });

  it("rejects invalid or insecure configured URLs", () => {
    expect(resolvePublicSiteUrl("not-a-url")).toBe(
      "https://securemsme-ai-live.vercel.app",
    );
    expect(resolvePublicSiteUrl("http://security.example.com")).toBe(
      "https://securemsme-ai-live.vercel.app",
    );
  });
});
