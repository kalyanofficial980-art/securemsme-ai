import { describe, expect, it } from "vitest";
import {
  buildAgencyDashboardSummary,
  getOrganizationPolicy,
  normalizeOrgSlug,
  roleCanManage,
} from "@/lib/organization-engine";
describe("organization engine", () => {
  it("normalizes slug", () => {
    expect(normalizeOrgSlug("My Secure Agency!!")).toBe("my-secure-agency");
  });
  it("builds role policies", () => {
    expect(getOrganizationPolicy("owner").canManageMembers).toBe(true);
    expect(getOrganizationPolicy("viewer").canRunScans).toBe(false);
  });
  it("protects role management", () => {
    expect(roleCanManage("owner", "admin")).toBe(true);
    expect(roleCanManage("admin", "owner")).toBe(false);
  });
  it("builds summary", () => {
    const s = buildAgencyDashboardSummary({
      websites: 2,
      scans: 5,
      monitoringJobs: 1,
      alerts: 1,
      members: 2,
      invites: 1,
    });
    expect(s.readinessScore).toBeGreaterThan(70);
    expect(s.blockedClaims).toContain(
      "Do not claim enterprise SSO is available yet.",
    );
  });
});
