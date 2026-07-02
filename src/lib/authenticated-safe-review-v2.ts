export type AuthReviewDepth = "safe-light" | "safe-standard" | "safe-deep";

export type AuthPageType =
  | "login"
  | "account-page"
  | "profile"
  | "dashboard"
  | "admin-candidate"
  | "checkout-account"
  | "settings"
  | "password-reset"
  | "logout"
  | "unknown";

export type AuthObservationInput = {
  pageUrl: string;
  title?: string | null;
  roleName?: string | null;
  notes?: string | null;
  hasPasswordField?: boolean;
  hasCustomerDataField?: boolean;
  hasPaymentSignal?: boolean;
  hasFileUploadSignal?: boolean;
  hasAdminSignal?: boolean;
};

export type AuthPageObservation = {
  pageUrl: string;
  pageType: AuthPageType;
  accessState:
    | "public"
    | "requires-login"
    | "manual-observed"
    | "not-accessed"
    | "blocked";
  roleName?: string | null;
  containsSensitiveDataSignal: boolean;
  containsAccountActionSignal: boolean;
  containsPaymentSignal: boolean;
  containsFileUploadSignal: boolean;
  cookieSecurityNote: string;
  sessionSecurityNote: string;
  accessControlNote: string;
  evidenceSummary: string;
  developerNote: string;
  clientSafeNote: string;
  blockedClaim: string;
  observationQuality: "strong" | "good" | "partial" | "weak" | "missing";
  validationStatus: "validated" | "needs-review" | "rejected" | "accepted-risk";
  observationPayload: Record<string, unknown>;
};

export type AuthChecklistItem = {
  checklistKey: string;
  title: string;
  category: string;
  status:
    "pass" | "needs-fix" | "not-checked" | "not-applicable" | "accepted-risk";
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  evidenceSummary: string;
  developerNote: string;
  clientSafeNote: string;
  blockedClaim: string;
};

export type RoleComparisonDraft = {
  comparisonName: string;
  pageUrl: string;
  roleA: string;
  roleB: string;
  expectedDifference: string;
  observedDifference: string;
  accessControlSignal:
    | "expected-difference"
    | "unexpected-same-access"
    | "unexpected-extra-access"
    | "needs-review"
    | "not-tested";
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  evidenceSummary: string;
  developerNote: string;
  clientSafeNote: string;
  blockedClaim: string;
};

export const authenticatedReviewBlockedActions = [
  "No password storage inside the platform",
  "No brute force",
  "No password guessing",
  "No login bypass",
  "No exploit payloads",
  "No form mutation",
  "No destructive actions",
  "No payment/order actions",
  "No private data extraction",
  "No mass scraping of account data",
  "No changing account settings",
];

export const defaultAuthChecklist: AuthChecklistItem[] = [
  {
    checklistKey: "test-account-scope-approved",
    title: "Authorized test account scope is approved",
    category: "Governance",
    status: "not-checked",
    severity: "High",
    evidenceSummary:
      "Confirm client approved test account, roles, allowed pages and review boundaries.",
    developerNote:
      "Do not begin authenticated review until test-account scope is clearly approved.",
    clientSafeNote: "Authenticated review requires written scope approval.",
    blockedClaim: "Do not imply unauthorized account testing.",
  },
  {
    checklistKey: "no-password-storage",
    title: "No passwords stored in SecureMSME AI",
    category: "Credential Safety",
    status: "not-checked",
    severity: "High",
    evidenceSummary:
      "Password should remain with client or external secret manager, not stored in SaaS database.",
    developerNote:
      "Use a temporary test account and revoke/rotate after review.",
    clientSafeNote: "The platform records only scope metadata, not passwords.",
    blockedClaim: "Do not store or display client credentials.",
  },
  {
    checklistKey: "session-cookie-flags-reviewed",
    title: "Session cookie flags reviewed",
    category: "Session Security",
    status: "not-checked",
    severity: "Medium",
    evidenceSummary:
      "Check Secure, HttpOnly and SameSite flags on session cookies during authorized manual review.",
    developerNote:
      "Harden sensitive cookies with Secure, HttpOnly and SameSite where appropriate.",
    clientSafeNote:
      "Session cookie protections should be reviewed for account areas.",
    blockedClaim:
      "Do not claim session hijacking occurred from flag review alone.",
  },
  {
    checklistKey: "logout-session-expiry-reviewed",
    title: "Logout and session expiry reviewed",
    category: "Session Security",
    status: "not-checked",
    severity: "Medium",
    evidenceSummary: "Confirm logout works and sessions expire as expected.",
    developerNote:
      "Invalidate server-side sessions on logout and apply reasonable idle/absolute timeouts.",
    clientSafeNote: "Logout and session timeout behavior should be verified.",
    blockedClaim: "Do not mutate account state beyond safe logout test.",
  },
  {
    checklistKey: "role-access-reviewed",
    title: "Role-based access reviewed",
    category: "Access Control",
    status: "not-checked",
    severity: "High",
    evidenceSummary:
      "Compare allowed pages/actions between test roles without bypass attempts.",
    developerNote:
      "Enforce authorization server-side for role-specific pages/actions.",
    clientSafeNote:
      "Role access boundaries should be verified for account areas.",
    blockedClaim:
      "Do not claim privilege escalation without validated role-difference evidence.",
  },
  {
    checklistKey: "customer-data-pages-reviewed",
    title: "Customer data pages identified",
    category: "Customer Data Protection",
    status: "not-checked",
    severity: "High",
    evidenceSummary:
      "Identify pages showing customer/student/patient/order/profile data signals.",
    developerNote:
      "Limit access, mask sensitive data, log access and apply least privilege.",
    clientSafeNote:
      "Customer-data pages should have strict access control and minimal exposure.",
    blockedClaim:
      "Do not extract or store private customer data in the platform.",
  },
  {
    checklistKey: "account-action-pages-reviewed",
    title: "Account action pages identified",
    category: "Account Safety",
    status: "not-checked",
    severity: "Medium",
    evidenceSummary:
      "Identify pages that can update profile, password, email, billing, files or orders.",
    developerNote:
      "Require CSRF protection, re-authentication where needed and server-side authorization.",
    clientSafeNote: "Account-changing pages need extra protection.",
    blockedClaim:
      "Do not perform account mutation except safe logout where explicitly approved.",
  },
];

export function normalizeAuthReviewDepth(
  value?: string | null,
): AuthReviewDepth {
  if (value === "safe-light" || value === "safe-deep") return value;
  return "safe-standard";
}

export function classifyAuthenticatedPage(
  input: AuthObservationInput,
): AuthPageType {
  const text =
    `${input.pageUrl} ${input.title || ""} ${input.notes || ""}`.toLowerCase();

  if (/logout|signout|sign-out/.test(text)) return "logout";
  if (/reset|forgot|password/.test(text) && !input.hasPasswordField)
    return "password-reset";
  if (/login|signin|sign-in/.test(text) || input.hasPasswordField)
    return "login";
  if (
    /\/admin|wp-admin|administrator|manage/.test(text) ||
    input.hasAdminSignal
  )
    return "admin-candidate";
  if (/checkout|billing|order|cart/.test(text) || input.hasPaymentSignal)
    return "checkout-account";
  if (/settings|preferences|security/.test(text)) return "settings";
  if (/profile|account|user/.test(text) || input.hasCustomerDataField)
    return "profile";
  if (/dashboard|portal|panel/.test(text)) return "dashboard";

  return "account-page";
}

export function buildAuthenticatedObservation(
  input: AuthObservationInput,
): AuthPageObservation {
  const pageType = classifyAuthenticatedPage(input);
  const containsSensitiveDataSignal = Boolean(
    input.hasCustomerDataField ||
    pageType === "profile" ||
    pageType === "checkout-account",
  );
  const containsAccountActionSignal = Boolean(
    pageType === "settings" ||
    pageType === "password-reset" ||
    pageType === "checkout-account" ||
    /update|edit|delete|upload|change|save/i.test(input.notes || ""),
  );

  const quality =
    input.notes && input.notes.length > 40
      ? "good"
      : containsSensitiveDataSignal || containsAccountActionSignal
        ? "partial"
        : "weak";

  return {
    pageUrl: input.pageUrl,
    pageType,
    accessState: "manual-observed",
    roleName: input.roleName || null,
    containsSensitiveDataSignal,
    containsAccountActionSignal,
    containsPaymentSignal: Boolean(input.hasPaymentSignal),
    containsFileUploadSignal: Boolean(input.hasFileUploadSignal),
    cookieSecurityNote:
      "Review Secure, HttpOnly and SameSite flags for session cookies in browser devtools or authorized proxy.",
    sessionSecurityNote:
      "Review logout, idle timeout and whether session remains valid after logout.",
    accessControlNote:
      "Compare access with only approved test roles. Do not bypass authentication.",
    evidenceSummary:
      input.notes ||
      `${pageType} page observed manually under approved test account context. No private data was extracted.`,
    developerNote: developerNoteForPage(
      pageType,
      containsSensitiveDataSignal,
      containsAccountActionSignal,
    ),
    clientSafeNote: clientSafeNoteForPage(
      pageType,
      containsSensitiveDataSignal,
    ),
    blockedClaim: blockedClaimForPage(pageType),
    observationQuality: quality,
    validationStatus: "needs-review",
    observationPayload: {
      pageType,
      roleName: input.roleName || null,
      containsSensitiveDataSignal,
      containsAccountActionSignal,
      containsPaymentSignal: Boolean(input.hasPaymentSignal),
      containsFileUploadSignal: Boolean(input.hasFileUploadSignal),
    },
  };
}

function developerNoteForPage(
  pageType: AuthPageType,
  sensitive: boolean,
  action: boolean,
) {
  if (pageType === "admin-candidate")
    return "Confirm this page is admin-only and protected by server-side authorization.";
  if (pageType === "checkout-account")
    return "Review checkout/account data authorization, payment redirects and sensitive data handling.";
  if (sensitive)
    return "Apply least privilege, avoid excessive data display and enforce server-side authorization.";
  if (action)
    return "Protect account-changing actions with CSRF defenses, authorization checks and safe audit logging.";
  return "Confirm page is within approved authenticated scope and uses secure session controls.";
}

function clientSafeNoteForPage(pageType: AuthPageType, sensitive: boolean) {
  if (sensitive)
    return `${pageType} area may show sensitive/customer account information and should be reviewed carefully.`;
  return `${pageType} area was added to authenticated review inventory.`;
}

function blockedClaimForPage(pageType: AuthPageType) {
  if (pageType === "admin-candidate")
    return "Do not claim admin bypass or privilege escalation without validated role comparison evidence.";
  if (pageType === "checkout-account")
    return "Do not perform payment/order actions or claim payment compromise from inventory alone.";
  return "Do not claim data leakage, account compromise or exploitability from page inventory alone.";
}

export function buildRoleComparison(input: {
  pageUrl: string;
  roleA: string;
  roleB: string;
  expectedDifference: string;
  observedDifference: string;
}): RoleComparisonDraft {
  const expected = input.expectedDifference.toLowerCase();
  const observed = input.observedDifference.toLowerCase();

  let signal: RoleComparisonDraft["accessControlSignal"] = "needs-review";
  let severity: RoleComparisonDraft["severity"] = "Medium";

  if (!observed.trim()) {
    signal = "not-tested";
    severity = "Info";
  } else if (
    /same|both can access|no difference/.test(observed) &&
    /different|only|restricted|should not|deny/.test(expected)
  ) {
    signal = "unexpected-same-access";
    severity = "High";
  } else if (/extra|more access|unexpected/.test(observed)) {
    signal = "unexpected-extra-access";
    severity = "High";
  } else if (/expected|correct|different|restricted/.test(observed)) {
    signal = "expected-difference";
    severity = "Low";
  }

  return {
    comparisonName: `${input.roleA} vs ${input.roleB}`,
    pageUrl: input.pageUrl,
    roleA: input.roleA,
    roleB: input.roleB,
    expectedDifference: input.expectedDifference,
    observedDifference: input.observedDifference,
    accessControlSignal: signal,
    severity,
    evidenceSummary: `Compared ${input.roleA} and ${input.roleB} for ${input.pageUrl}. Signal: ${signal}.`,
    developerNote:
      signal === "unexpected-same-access" ||
      signal === "unexpected-extra-access"
        ? "Review server-side authorization for this page/action and enforce role checks."
        : "Keep server-side role checks documented and retest after changes.",
    clientSafeNote:
      signal === "expected-difference"
        ? "Role access behaved as expected in this manual comparison."
        : "Role access needs review using approved test accounts.",
    blockedClaim:
      "Do not claim privilege escalation without validated evidence and client-approved role test accounts.",
  };
}

export function calculateAuthCoverageScore(input: {
  pageCount: number;
  checklistCount: number;
  checkedChecklistCount: number;
  roleComparisonCount: number;
  cookieReviewCount: number;
}) {
  let score = 0;
  if (input.pageCount > 0) score += 25;
  score += Math.min(30, input.checkedChecklistCount * 5);
  if (input.roleComparisonCount > 0) score += 20;
  if (input.cookieReviewCount > 0) score += 15;
  if (
    input.checklistCount &&
    input.checkedChecklistCount === input.checklistCount
  )
    score += 10;
  return Math.max(0, Math.min(100, score));
}

export function calculateAuthRiskScore(input: {
  sensitivePages: number;
  accountActionPages: number;
  roleWarnings: number;
  checklistNeedsFix: number;
}) {
  const score =
    input.sensitivePages * 12 +
    input.accountActionPages * 10 +
    input.roleWarnings * 20 +
    input.checklistNeedsFix * 12;
  return Math.max(0, Math.min(100, score));
}

export function buildAuthReviewSummary(input: {
  pageCount: number;
  sensitivePages: number;
  roleComparisons: number;
  checklistNeedsFix: number;
  coverageScore: number;
  riskScore: number;
}) {
  return {
    safeSummary: `${input.pageCount} authenticated page observation(s), ${input.roleComparisons} role comparison(s), coverage ${input.coverageScore}/100.`,
    developerSummary: `${input.sensitivePages} sensitive/account-data signal(s) and ${input.checklistNeedsFix} checklist item(s) need developer review.`,
    clientSafeSummary: `Authenticated safe review inventory completed with risk score ${input.riskScore}/100. No private data extraction or exploit testing was performed.`,
  };
}
