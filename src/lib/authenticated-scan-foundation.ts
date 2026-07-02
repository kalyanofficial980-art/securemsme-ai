import type { PentestIntensity } from "@/lib/authorized-pentest-engine";

export type AuthenticatedScanStatus =
  | "requested"
  | "admin-review"
  | "approved"
  | "rejected"
  | "ready-for-session"
  | "completed"
  | "cancelled";

export type AuthenticatedAuthMethod =
  | "test-account"
  | "staging-test-account"
  | "magic-link-test-account"
  | "future-sso";

export type AuthenticatedScanPlan = {
  version: string;
  generatedAt: string;
  targetUrl: string;
  loginUrl: string;
  authMethod: AuthenticatedAuthMethod;
  requestedIntensity: PentestIntensity;
  testAccountRole: string;
  credentialHandlingMode:
    "do-not-store-password" | "customer-enters-session-later" | "future-vault";
  verifiedScope: boolean;
  canRequest: boolean;
  blockedReason?: string;
  scopeSummary: Record<string, unknown>;
  allowedPaths: string[];
  blockedPaths: string[];
  blockedActions: string[];
  safetyChecklist: string[];
  customerAttestations: string[];
  crawlPolicy: Record<string, unknown>;
  mutationPolicy: Record<string, unknown>;
  privacyPolicy: Record<string, unknown>;
  evidencePolicy: Record<string, unknown>;
  customerSummary: string;
  safeClaim: string;
  blockedClaim: string;
};

export const AUTHENTICATED_SCAN_BLOCKED_ACTIONS = [
  "No password guessing",
  "No brute force",
  "No login bypass",
  "No MFA bypass",
  "No privilege escalation",
  "No payment/order mutation",
  "No checkout completion",
  "No delete/edit/publish actions",
  "No account settings modification",
  "No email/SMS sending actions",
  "No file upload testing without separate written scope",
  "No private data scraping",
  "No destructive testing",
  "No testing outside verified website scope",
];

export function getAuthenticatedScanSafetyChecklist() {
  return [
    "Use a low-privilege test account only.",
    "Do not use a real customer/admin account.",
    "Do not enter real customer data.",
    "Do not enter real payment details.",
    "Use staging site when possible.",
    "Limit allowed paths to safe pages.",
    "Block checkout, payment, delete, edit, publish, and account-change paths.",
    "Revoke or rotate the test account after testing.",
    "Keep permission written and time-limited.",
    "Review results before sharing with developers.",
    "Do not claim full pentest or 100% security.",
  ];
}

export function getDefaultAllowedPaths() {
  return [
    "/dashboard",
    "/account",
    "/profile",
    "/orders",
    "/my-account",
    "/user",
    "/members",
  ];
}

export function getDefaultBlockedPaths() {
  return [
    "/checkout",
    "/cart/checkout",
    "/payment",
    "/pay",
    "/orders/create",
    "/orders/cancel",
    "/delete",
    "/remove",
    "/edit",
    "/update",
    "/publish",
    "/upload",
    "/admin/delete",
    "/admin/users",
    "/settings/password",
    "/settings/email",
    "/logout",
  ];
}

function normalizePathList(value?: string) {
  return (value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith("/") ? item : `/${item}`))
    .slice(0, 50);
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed.");
  }

  return url.toString();
}

export function buildAuthenticatedScanPlan(input: {
  targetUrl: string;
  loginUrl?: string;
  authMethod?: AuthenticatedAuthMethod;
  requestedIntensity?: PentestIntensity;
  testAccountRole?: string;
  allowedPathsText?: string;
  blockedPathsText?: string;
  verifiedScope?: boolean;
}): AuthenticatedScanPlan {
  const targetUrl = normalizeUrl(input.targetUrl);
  const loginUrl = normalizeUrl(input.loginUrl || input.targetUrl);
  const requestedIntensity = input.requestedIntensity || "standard";
  const authMethod = input.authMethod || "test-account";
  const verifiedScope = Boolean(input.verifiedScope);
  const customAllowedPaths = normalizePathList(input.allowedPathsText);
  const customBlockedPaths = normalizePathList(input.blockedPathsText);
  const allowedPaths = customAllowedPaths.length
    ? customAllowedPaths
    : getDefaultAllowedPaths();
  const blockedPaths = [
    ...new Set([...getDefaultBlockedPaths(), ...customBlockedPaths]),
  ];
  const canRequest = verifiedScope;

  return {
    version: "35.0",
    generatedAt: new Date().toISOString(),
    targetUrl,
    loginUrl,
    authMethod,
    requestedIntensity,
    testAccountRole: input.testAccountRole?.trim() || "low-privilege-test-user",
    credentialHandlingMode: "do-not-store-password",
    verifiedScope,
    canRequest,
    blockedReason: verifiedScope
      ? undefined
      : "Website ownership verification and permission attestation are required before requesting authenticated scan.",
    scopeSummary: {
      targetUrl,
      loginUrl,
      authMethod,
      requestedIntensity,
      verifiedScope,
      testAccountRole:
        input.testAccountRole?.trim() || "low-privilege-test-user",
      credentialHandlingMode: "do-not-store-password",
      expiresInDays: 14,
    },
    allowedPaths,
    blockedPaths,
    blockedActions: AUTHENTICATED_SCAN_BLOCKED_ACTIONS,
    safetyChecklist: getAuthenticatedScanSafetyChecklist(),
    customerAttestations: [
      "I own or am authorized to test this website.",
      "I will provide only a low-privilege test account.",
      "I will not provide real customer/admin credentials.",
      "I understand destructive actions and data scraping are blocked.",
      "I understand this is not a guarantee that no vulnerabilities exist.",
    ],
    crawlPolicy: {
      allowedMethods: ["GET", "HEAD"],
      maxPages:
        requestedIntensity === "light"
          ? 10
          : requestedIntensity === "deep"
            ? 50
            : 25,
      maxDepth:
        requestedIntensity === "light"
          ? 1
          : requestedIntensity === "deep"
            ? 3
            : 2,
      sameOriginOnly: true,
      respectBlockedPaths: true,
      noFormSubmission: true,
      noMutationRequests: true,
    },
    mutationPolicy: {
      allowedMutationMethods: [],
      blockedMethods: ["POST", "PUT", "PATCH", "DELETE"],
      blockPaymentOrderCheckout: true,
      blockEditDeletePublishUpload: true,
      blockAccountSettingChanges: true,
    },
    privacyPolicy: {
      storePasswords: false,
      storeSessionCookies: false,
      storePrivatePageBodies: false,
      maskEmailsPhoneTokens: true,
      evidenceStorage: "metadata-and-safe-snippets-only",
    },
    evidencePolicy: {
      allowedEvidence: [
        "route path",
        "status code",
        "page title",
        "security headers",
        "safe metadata",
        "masked error messages",
      ],
      blockedEvidence: [
        "passwords",
        "session cookies",
        "personal data",
        "payment data",
        "private documents",
        "full private page bodies",
      ],
    },
    customerSummary:
      "Authenticated scan foundation prepares a safe workflow for customer-provided low-privilege test accounts without storing passwords or running destructive actions.",
    safeClaim:
      "Can claim authenticated scan request scope and safety policy were created for verified website.",
    blockedClaim:
      "Cannot claim authenticated scanning was performed, login was attempted, or private pages were tested in this foundation stage.",
  };
}

export function buildAuthenticatedSessionPlan(input: {
  requestId: string;
  userId: string;
  websiteId: string;
  plan: AuthenticatedScanPlan;
}) {
  return {
    request_id: input.requestId,
    user_id: input.userId,
    website_id: input.websiteId,
    plan_status: "planned",
    session_handling: "customer-controlled-session",
    crawl_policy: input.plan.crawlPolicy,
    mutation_policy: input.plan.mutationPolicy,
    privacy_policy: input.plan.privacyPolicy,
    planned_routes: input.plan.allowedPaths,
    blocked_routes: input.plan.blockedPaths,
    evidence_policy: input.plan.evidencePolicy,
  };
}
