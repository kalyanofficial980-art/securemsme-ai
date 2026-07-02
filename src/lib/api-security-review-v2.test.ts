import { describe, expect, it } from "vitest";
import {
  createManualApiEndpoint,
  normalizeApiReviewMode,
  normalizeApiTarget,
  sameOrigin,
} from "@/lib/api-security-review-v2";

describe("api security review v2", () => {
  it("normalizes target and mode", () => {
    const target = normalizeApiTarget("example.com");
    expect(target.toString()).toBe("https://example.com/");
    expect(normalizeApiReviewMode("safe-deep")).toBe("safe-deep");
    expect(normalizeApiReviewMode("bad")).toBe("safe-standard");
  });

  it("checks same origin", () => {
    expect(
      sameOrigin(
        new URL("https://example.com/api"),
        new URL("https://example.com/docs"),
      ),
    ).toBe(true);
    expect(
      sameOrigin(
        new URL("https://example.com/api"),
        new URL("https://other.com/docs"),
      ),
    ).toBe(false);
  });

  it("classifies manual endpoint risk", () => {
    const endpoint = createManualApiEndpoint({
      endpointPath: "/api/admin/users",
      method: "GET",
      summary: "Admin users endpoint",
      authRequirement: "unclear",
      origin: "https://example.com",
    });

    expect(endpoint.endpointType).toBe("admin-api");
    expect(endpoint.riskLevel).toBe("High");
    expect(endpoint.blockedClaim).toContain("Do not claim");
  });

  it("marks mutation endpoints", () => {
    const endpoint = createManualApiEndpoint({
      endpointPath: "/api/profile",
      method: "PATCH",
      summary: "Update user profile",
      authRequirement: "required",
      origin: "https://example.com",
    });

    expect(endpoint.mutationRisk).toBe(true);
    expect(endpoint.endpointType).toBe("user-data");
  });
});
