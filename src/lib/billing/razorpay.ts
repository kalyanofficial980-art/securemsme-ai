import { createHmac, timingSafeEqual } from "node:crypto";

export const selfServePlans = ["starter", "growth", "agency"] as const;
export type SelfServePlan = (typeof selfServePlans)[number];

const PLAN_AMOUNT_ENV: Record<SelfServePlan, string> = {
  starter: "RAZORPAY_STARTER_AMOUNT",
  growth: "RAZORPAY_GROWTH_AMOUNT",
  agency: "RAZORPAY_AGENCY_AMOUNT",
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

export function getPlanAmount(plan: SelfServePlan) {
  const raw = process.env[PLAN_AMOUNT_ENV[plan]];
  if (!raw) return null;

  const amount = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  return amount;
}

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function isSelfServeBillingConfigured(plan: SelfServePlan) {
  return Boolean(getRazorpayConfig() && getPlanAmount(plan));
}

export function shouldActivatePlan(currentPlan: string | null | undefined, paidPlan: SelfServePlan) {
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
