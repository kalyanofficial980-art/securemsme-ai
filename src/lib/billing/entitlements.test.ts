import { describe, expect, it } from "vitest";
import {
  canUseDeepScan,
  canUseRetest,
  getEffectivePlan,
} from "./entitlements";

describe("billing entitlements", () => {
  it("treats expired and invalid paid plans as free", () => {
    expect(
      getEffectivePlan({
        plan: "growth",
        plan_expires_at: "2000-01-01T00:00:00.000Z",
      }),
    ).toBe("free");
    expect(getEffectivePlan({ plan: "enterprise" })).toBe("free");
  });

  it("keeps manually provisioned launch accounts backward compatible", () => {
    expect(getEffectivePlan({ plan: "starter", plan_expires_at: null })).toBe(
      "starter",
    );
  });

  it("allows retest for Starter and above only", () => {
    expect(canUseRetest("free")).toBe(false);
    expect(canUseRetest("starter")).toBe(true);
    expect(canUseRetest("growth")).toBe(true);
    expect(canUseRetest("agency")).toBe(true);
  });

  it("allows deep scan for Growth and Agency only", () => {
    expect(canUseDeepScan("free")).toBe(false);
    expect(canUseDeepScan("starter")).toBe(false);
    expect(canUseDeepScan("growth")).toBe(true);
    expect(canUseDeepScan("agency")).toBe(true);
  });
});
