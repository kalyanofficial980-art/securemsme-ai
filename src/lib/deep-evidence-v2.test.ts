import { describe, expect, it } from "vitest";
import { discoverDeepNavigation } from "@/lib/deep-evidence-v2";

describe("Deep Evidence v2 navigation safety", () => {
  it("follows only same-origin anchor navigation without query, API, auth or action-like routes", () => {
    const base = new URL("https://example.com/");
    const result = discoverDeepNavigation(
      base,
      `
        <a href="/about">About</a>
        <a href="/docs/security.html#overview">Docs</a>
        <a href="/pricing?plan=growth">Pricing query</a>
        <a href="/api/users">API</a>
        <a href="/login">Login</a>
        <a href="/account/activate">Activate</a>
        <a href="https://other.example/path">External</a>
        <script src="/api/run"></script>
        <img src="/delete-account" />
      `,
    );

    expect(result.crawlable.map((url) => url.pathname)).toEqual([
      "/about",
      "/docs/security.html",
    ]);
    expect(result.apiLikeRoutesObserved).toEqual(["/api/users"]);
    expect(result.loginLikeRoutesObserved).toEqual(["/login"]);
    expect(result.actionLikeRoutesObserved).toEqual(["/account/activate"]);
    expect(result.apiLikeRoutesObserved).not.toContain("/api/run");
  });

  it("deduplicates safe navigation and never follows file-like assets", () => {
    const base = new URL("https://example.com/");
    const result = discoverDeepNavigation(
      base,
      `
        <a href="/about">About</a>
        <a href="/about#team">About team</a>
        <a href="/assets/app.js">JS</a>
        <a href="/report.pdf">PDF</a>
        <a href="/docs/guide.htm">Guide</a>
      `,
    );

    expect(result.crawlable.map((url) => url.pathname)).toEqual([
      "/about",
      "/docs/guide.htm",
    ]);
  });
});
