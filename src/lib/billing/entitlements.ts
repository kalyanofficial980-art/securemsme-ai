export type VeyraSecPlan = "free" | "starter" | "growth" | "agency";

export const PLAN_SCAN_LIMITS: Record<VeyraSecPlan, number> = {
  free: 3,
  starter: 20,
  growth: 100,
  agency: 500,
};

export function getEffectivePlan(profile?: {
  plan?: string | null;
  plan_expires_at?: string | null;
} | null): VeyraSecPlan {
  const plan = profile?.plan;
  if (plan !== "starter" && plan !== "growth" && plan !== "agency") {
    return "free";
  }

  const expiresAt = profile?.plan_expires_at;
  if (!expiresAt) {
    // Backward compatibility for manually provisioned launch accounts.
    return plan;
  }

  const expiry = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    return "free";
  }

  return plan;
}

export function getPlanScanLimit(plan: VeyraSecPlan) {
  return PLAN_SCAN_LIMITS[plan];
}

export function getScanWindowStart(plan: VeyraSecPlan) {
  const windowStart = new Date();

  if (plan === "free") {
    windowStart.setHours(0, 0, 0, 0);
  } else {
    windowStart.setDate(1);
    windowStart.setHours(0, 0, 0, 0);
  }

  return windowStart;
}
