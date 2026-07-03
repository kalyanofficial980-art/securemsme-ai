import { describe, expect, it } from "vitest";
import {
  customerNotClaim,
  customerReportLinks,
  customerSafeClaim,
  customerTerm,
} from "@/lib/customer-language";

describe("customer language", () => {
  it("replaces internal words with customer-friendly terms", () => {
    expect(customerTerm("Tool Runner")).toBe("Advanced Security Engine");
    expect(customerTerm("Passive ZAP-style Worker")).toBe(
      "Website Review Evidence",
    );
  });

  it("keeps customer links visible and simple", () => {
    expect(customerReportLinks.length).toBeGreaterThan(5);
    expect(
      customerReportLinks.some((link) => link.label === "Tool Runner"),
    ).toBe(false);
  });

  it("does not overclaim", () => {
    expect(customerSafeClaim()).toContain("safe public");
    expect(customerNotClaim()).toContain("not a full penetration test");
  });
});
