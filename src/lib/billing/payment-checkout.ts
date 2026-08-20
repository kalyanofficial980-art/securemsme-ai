import { headers } from "next/headers";

export type PaymentCheckout = {
  configured: boolean;
  planKey: "starter" | "growth" | "agency";
  planName: string;
  amountInr: number;
  payeeName: string | null;
  upiEnabled: boolean;
  upiId: string | null;
  upiUri: string | null;
  qrSvg: string | null;
  bankEnabled: boolean;
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  settingsUpdatedAt: string | null;
};

const paidPlanKeys = new Set(["starter", "growth", "agency"]);
const PAYMENT_FUNCTION = "veyra-payment-checkout-v1";

export function normalizePaidPlanKey(value: string): PaymentCheckout["planKey"] {
  return paidPlanKeys.has(value) ? (value as PaymentCheckout["planKey"]) : "starter";
}

async function getVercelOidcToken() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || null;
}

async function trustedPaymentRequest(body: BodyInit, contentType?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const oidcToken = await getVercelOidcToken();
  if (!supabaseUrl || !oidcToken) return null;

  return fetch(`${supabaseUrl}/functions/v1/${PAYMENT_FUNCTION}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${oidcToken}`,
      ...(contentType ? { "content-type": contentType } : {}),
    },
    cache: "no-store",
    body,
  });
}

export async function getPaymentCheckout(planKey: string): Promise<PaymentCheckout | null> {
  const normalizedPlan = normalizePaidPlanKey(planKey);

  try {
    const response = await trustedPaymentRequest(
      JSON.stringify({ planKey: normalizedPlan }),
      "application/json",
    );
    if (!response?.ok) return null;

    const data = (await response.json()) as Partial<PaymentCheckout>;
    if (
      data.planKey !== normalizedPlan ||
      typeof data.amountInr !== "number" ||
      !Number.isFinite(data.amountInr)
    ) {
      return null;
    }

    return {
      configured: data.configured === true,
      planKey: normalizedPlan,
      planName: typeof data.planName === "string" ? data.planName : normalizedPlan,
      amountInr: data.amountInr,
      payeeName: typeof data.payeeName === "string" ? data.payeeName : null,
      upiEnabled: data.upiEnabled === true,
      upiId: typeof data.upiId === "string" ? data.upiId : null,
      upiUri: typeof data.upiUri === "string" ? data.upiUri : null,
      qrSvg: typeof data.qrSvg === "string" ? data.qrSvg : null,
      bankEnabled: data.bankEnabled === true,
      bankAccountName:
        typeof data.bankAccountName === "string" ? data.bankAccountName : null,
      bankName: typeof data.bankName === "string" ? data.bankName : null,
      bankAccountNumber:
        typeof data.bankAccountNumber === "string" ? data.bankAccountNumber : null,
      bankIfsc: typeof data.bankIfsc === "string" ? data.bankIfsc : null,
      settingsUpdatedAt:
        typeof data.settingsUpdatedAt === "string" ? data.settingsUpdatedAt : null,
    };
  } catch {
    return null;
  }
}

export async function uploadPaymentProofTrusted(input: {
  userId: string;
  file: File;
}): Promise<string | null> {
  const form = new FormData();
  form.set("operation", "upload_payment_proof");
  form.set("userId", input.userId);
  form.set("file", input.file, "payment-proof");

  try {
    const response = await trustedPaymentRequest(form);
    if (!response?.ok) return null;
    const data = (await response.json()) as { path?: unknown };
    if (
      typeof data.path !== "string" ||
      !data.path.startsWith(`${input.userId}/`) ||
      data.path.includes("..")
    ) {
      return null;
    }
    return data.path;
  } catch {
    return null;
  }
}

export async function deletePaymentProofTrusted(input: {
  userId: string;
  path: string;
}): Promise<boolean> {
  if (!input.path.startsWith(`${input.userId}/`) || input.path.includes("..")) return false;

  const form = new FormData();
  form.set("operation", "delete_payment_proof");
  form.set("userId", input.userId);
  form.set("path", input.path);

  try {
    const response = await trustedPaymentRequest(form);
    if (!response?.ok) return false;
    const data = (await response.json()) as { deleted?: unknown };
    return data.deleted === true;
  } catch {
    return false;
  }
}
