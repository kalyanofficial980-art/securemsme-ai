import { describe, expect, it } from "vitest";
import {
  classifyResponseTruth,
  classifySensitiveExposure,
  isChallengeLikeResponse,
} from "@/lib/scan-truth";

describe("scan truth classification", () => {
  it("treats WAF, rate-limit and upstream failures as inconclusive", () => {
    expect(classifyResponseTruth({ status: 403, headers: { server: "cloudflare" }, body: "Attention Required" }).truth).toBe("inconclusive");
    expect(classifyResponseTruth({ status: 429, body: "Too many requests" }).truth).toBe("inconclusive");
    expect(classifyResponseTruth({ status: 503, body: "upstream unavailable" }).truth).toBe("inconclusive");
    expect(isChallengeLikeResponse({ status: 200, body: "Please verify you are human" })).toBe(true);
  });

  it("does not call a SPA catch-all 200 a sensitive file exposure", () => {
    const verdict = classifySensitiveExposure({
      path: "/.env",
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<html><body>App shell</body></html>",
      baseline: {
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: "<html><body>App shell</body></html>",
      },
    });
    expect(verdict).toMatchObject({ truth: "verified", exposed: false });
  });

  it("requires path-specific content evidence for real exposures", () => {
    expect(
      classifySensitiveExposure({
        path: "/.env",
        status: 200,
        contentType: "text/plain",
        body: "DATABASE_URL=postgres://example\nAPI_KEY=example-key\nNODE_ENV=production",
      }),
    ).toMatchObject({ truth: "verified", exposed: true });

    expect(
      classifySensitiveExposure({
        path: "/.git/config",
        status: 200,
        contentType: "text/plain",
        body: "[core]\nrepositoryformatversion = 0\n[remote \"origin\"]",
      }),
    ).toMatchObject({ truth: "verified", exposed: true });

    expect(
      classifySensitiveExposure({
        path: "/database.sql",
        status: 200,
        contentType: "text/plain",
        body: "-- backup\nCREATE TABLE users (id int);",
      }),
    ).toMatchObject({ truth: "verified", exposed: true });
  });

  it("keeps generic 2xx content inconclusive instead of inventing exposure", () => {
    expect(
      classifySensitiveExposure({
        path: "/backup.zip",
        status: 200,
        contentType: "text/html",
        body: "Welcome to our website",
      }),
    ).toMatchObject({ truth: "inconclusive", exposed: false });
  });
});
