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

export function normalizePaidPlanKey(value: string): PaymentCheckout["planKey"] {
  return paidPlanKeys.has(value) ? (value as PaymentCheckout["planKey"]) : "starter";
}

async function getVercelOidcToken() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || null;
}

export async function getPaymentCheckout(planKey: string): Promise<PaymentCheckout | null> {
  const normalizedPlan = normalizePaidPlanKey(planKey);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const oidcToken = await getVercelOidcToken();

  if (!supabaseUrl || !oidcToken) return null;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/veyra-payment-checkout-v1`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${oidcToken}`,
        "content-type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ planKey: normalizedPlan }),
    });

    if (!response.ok) return null;
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
