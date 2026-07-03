import { describe, expect, it } from "vitest";
import {
  allowedSectionsForAccessLevel,
  buildClientPortalSnapshot,
  buildPortalExpiry,
} from "@/lib/client-portal-engine";

describe("client portal engine", () => {
  it("builds client-safe snapshot", () => {
    const snapshot = buildClientPortalSnapshot({
      id: "scan-1",
      website_url: "https://example.com",
      score: 72,
      risk_level: "Medium risk",
      report: {
        topFixes: [
          {
            title: "Missing CSP",
            severity: "High",
            description: "Content-Security-Policy is missing.",
            fix: "Add a restrictive CSP header.",
            confidence: "High",
          },
        ],
      },
    });

    expect(snapshot.score).toBe(72);
    expect(snapshot.clientSafeFindings[0].title).toBe("Missing CSP");
    expect(snapshot.blockedClaims).toContain(
      "Do not claim the website is 100% secure.",
    );
  });

  it("returns correct sections", () => {
    expect(allowedSectionsForAccessLevel("summary-only")).toContain(
      "executive-summary",
    );
    expect(allowedSectionsForAccessLevel("full-client")).toContain(
      "fix-guidance",
    );
  });

  it("caps expiry", () => {
    const expiry = new Date(buildPortalExpiry(200)).getTime();
    expect(expiry).toBeGreaterThan(Date.now());
  });
});
