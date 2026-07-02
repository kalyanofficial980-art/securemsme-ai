import { describe, expect, it } from "vitest";
import {
  classifyAsset,
  createAssetDiscoverySnapshot,
  createAssetFromObservation,
  extractForms,
  extractLinks,
  normalizeDiscoveredUrl,
  normalizeTargetUrl,
  sameOrigin,
} from "@/lib/advanced-crawler-asset-discovery-v2";

describe("advanced crawler asset discovery v2", () => {
  it("normalizes and checks same origin", () => {
    const base = normalizeTargetUrl("example.com");
    const next = normalizeDiscoveredUrl("/login", base);
    expect(next?.toString()).toBe("https://example.com/login");
    expect(next && sameOrigin(base, next)).toBe(true);
  });

  it("classifies important assets", () => {
    expect(classifyAsset(new URL("https://example.com/admin"))).toBe("admin");
    expect(classifyAsset(new URL("https://example.com/api/docs"))).toBe("api");
    expect(classifyAsset(new URL("https://example.com/checkout"))).toBe(
      "checkout",
    );
  });

  it("extracts links and forms safely", () => {
    const base = new URL("https://example.com");
    const html = `
      <a href="/login">Login</a>
      <form method="post" action="/contact">
        <input type="email" name="email" />
        <input type="password" name="password" />
      </form>
    `;

    expect(extractLinks(html, base)[0].url.toString()).toBe(
      "https://example.com/login",
    );
    const forms = extractForms(html, base);
    expect(forms[0].customerDataSignal).toBe(true);
    expect(forms[0].passwordFieldCount).toBe(1);
  });

  it("creates asset with fingerprint and risk tags", () => {
    const origin = new URL("https://example.com");
    const { asset, forms } = createAssetFromObservation({
      url: new URL("https://example.com/login"),
      origin,
      depth: 0,
      discoverySource: "seed",
      httpStatus: 200,
      contentType: "text/html",
      html: "<title>Login</title><form><input type='password' /></form>",
      isCrawled: true,
    });

    expect(asset.assetType).toBe("login");
    expect(asset.assetFingerprint).toHaveLength(64);
    expect(forms.length).toBe(1);
  });

  it("creates deterministic snapshot", () => {
    const origin = new URL("https://example.com");
    const { asset, forms } = createAssetFromObservation({
      url: origin,
      origin,
      depth: 0,
      discoverySource: "seed",
      html: "<title>Home</title>",
    });

    const snapshot = createAssetDiscoverySnapshot({
      assets: [asset],
      forms,
      targetUrl: origin.toString(),
    });

    expect(snapshot.snapshotHash).toHaveLength(64);
  });
});
