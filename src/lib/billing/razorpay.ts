import { createHmac, timingSafeEqual } from "node:crypto";

export const selfServePlans = ["starter", "growth", "agency"] as const;
export type SelfServePlan = (typeof selfServePlans)[number];

export const launchPlanConfig: Record<
  SelfServePlan,
  {
    amount: number;
    currency: "INR";
    interval: 1;
    period: "monthly";
    displayPrice: string;
    scanLimit: number;
  }
> = {
  starter: {
    amount: 99_900,
    currency: "INR",
    interval: 1,
    period: "monthly",
    displayPrice: "₹999/month",
    scanLimit: 20,
  },
  growth: {
    amount: 249_900,
    currency: "INR",
    interval: 1,
    period: "monthly",
    displayPrice: "₹2,499/month",
    scanLimit: 100,
  },
  agency: {
    amount: 699_900,
    currency: "INR",
    interval: 1,
    period: "monthly",
    displayPrice: "₹6,999/month",
    scanLimit: 500,
  },
};

const PLAN_ID_ENV: Record<SelfServePlan, string> = {
  starter: "RAZORPAY_STARTER_PLAN_ID",
  growth: "RAZORPAY_GROWTH_PLAN_ID",
  agency: "RAZORPAY_AGENCY_PLAN_ID",
};

const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  agency: 3,
  "enterprise-review": 4,
};

export type RazorpayOrder = {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string | null;
  status: string;
};

export type RazorpayPayment = {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: string;
  order_id?: string | null;
};

export type RazorpayPlan = {
  id: string;
  entity: "plan";
  interval: number;
  period: string;
  item: {
    id?: string;
    active?: boolean;
    name?: string;
    description?: string;
    amount: number;
    currency: string;
  };
};

export type RazorpaySubscription = {
  id: string;
  entity: "subscription";
  plan_id: string;
  status:
    | "created"
    | "authenticated"
    | "active"
    | "pending"
    | "halted"
    | "cancelled"
    | "completed"
    | "expired"
    | string;
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  charge_at?: number | null;
  paid_count?: number;
  total_count?: number;
  short_url?: string;
};

export function getPlanAmount(plan: SelfServePlan) {
  return launchPlanConfig[plan].amount;
}

export function getRazorpayPlanId(plan: SelfServePlan) {
  return process.env[PLAN_ID_ENV[plan]]?.trim() || null;
}

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function isSelfServeBillingConfigured(plan: SelfServePlan) {
  return Boolean(getRazorpayConfig() && getRazorpayPlanId(plan));
}

export function shouldActivatePlan(
  currentPlan: string | null | undefined,
  paidPlan: SelfServePlan,
) {
  return (PLAN_RANK[paidPlan] ?? 0) >= (PLAN_RANK[currentPlan || "free"] ?? 0);
}

function safeEqualHex(expectedHex: string, receivedHex: string) {
  if (!/^[a-f0-9]+$/i.test(receivedHex)) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");

  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export function verifyCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}) {
  const expected = createHmac("sha256", input.keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  return safeEqualHex(expected, input.signature);
}

export function verifySubscriptionCheckoutSignature(input: {
  subscriptionId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}) {
  const expected = createHmac("sha256", input.keySecret)
    .update(`${input.paymentId}|${input.subscriptionId}`)
    .digest("hex");

  return safeEqualHex(expected, input.signature);
}

export function verifyWebhookSignature(input: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}) {
  const expected = createHmac("sha256", input.webhookSecret)
    .update(input.rawBody)
    .digest("hex");

  return safeEqualHex(expected, input.signature);
}

export function unixSecondsToIso(value?: number | null) {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

export async function razorpayRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const config = getRazorpayConfig();
  if (!config) {
    throw new Error("Razorpay server credentials are not configured.");
  }

  const response = await fetch(`https://api.razorpay.com${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: { description?: string } })
    | null;

  if (!response.ok || !body) {
    const message = body?.error?.description || "Razorpay request failed.";
    throw new Error(message);
  }

  return body;
}
