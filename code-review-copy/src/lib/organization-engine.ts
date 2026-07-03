export type OrganizationRole = "owner" | "admin" | "member" | "viewer";
export type OrganizationType = "solo" | "agency" | "business" | "enterprise";

export function normalizeOrgSlug(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || `org-${Date.now()}`
  );
}

export function getOrganizationPolicy(role: OrganizationRole) {
  return {
    role,
    canManageOrganization: role === "owner" || role === "admin",
    canInviteMembers: role === "owner" || role === "admin",
    canManageMembers: role === "owner" || role === "admin",
    canAssignWebsites:
      role === "owner" || role === "admin" || role === "member",
    canRunScans: role === "owner" || role === "admin" || role === "member",
    canViewReports: true,
    canManageBilling: role === "owner",
    canViewAdminEvidence: role === "owner" || role === "admin",
  };
}

export function roleCanManage(
  currentRole: OrganizationRole,
  targetRole: OrganizationRole,
) {
  if (currentRole === "owner") return true;
  if (currentRole === "admin")
    return targetRole === "member" || targetRole === "viewer";
  return false;
}

export function buildAgencyDashboardSummary(input: {
  websites: number;
  scans: number;
  monitoringJobs: number;
  alerts: number;
  members: number;
  invites: number;
}) {
  let score = 20;
  if (input.members >= 2) score += 15;
  if (input.websites >= 1) score += 15;
  if (input.scans >= 3) score += 15;
  if (input.monitoringJobs >= 1) score += 15;
  if (input.alerts >= 1) score += 10;
  if (input.invites >= 1) score += 10;
  score = Math.max(0, Math.min(100, score));
  const stage =
    score >= 85
      ? "enterprise-ready"
      : score >= 65
        ? "growth-ready"
        : score >= 45
          ? "early-agency"
          : "foundation";
  const nextActions = [
    input.websites === 0 ? "Add first client website to the organization." : "",
    input.scans < 3 ? "Run multiple scans to create client history." : "",
    input.monitoringJobs === 0
      ? "Enable continuous monitoring for at least one client website."
      : "",
    input.alerts === 0 ? "Generate alerts and configure email delivery." : "",
    input.members < 2
      ? "Invite at least one team member or client viewer."
      : "",
  ].filter(Boolean);
  return {
    readinessScore: score,
    stage,
    headline:
      stage === "enterprise-ready"
        ? "Organization workspace is ready for larger client operations."
        : stage === "growth-ready"
          ? "Agency workspace is ready for early paid client delivery."
          : stage === "early-agency"
            ? "Agency foundation is active, but client operations need more setup."
            : "Organization foundation created. Add websites, scans, monitoring and team members.",
    nextActions: nextActions.length
      ? nextActions
      : ["Keep adding client workspaces and monitoring coverage."],
    safeClaims: [
      "Can claim organization workspace foundation is active.",
      "Can claim websites and scans can be organization-scoped.",
      "Can claim agency dashboard summarizes operational readiness.",
    ],
    blockedClaims: [
      "Do not claim enterprise SSO is available yet.",
      "Do not claim billing automation is finished yet.",
      "Do not claim client portal automation is complete yet.",
    ],
  };
}
