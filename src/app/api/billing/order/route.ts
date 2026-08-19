import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPlanAmount,
  getRazorpayConfig,
  razorpayRequest,
  selfServePlans,
  type RazorpayOrder,
} from "@/lib/billing/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/security/request-guard";

export const runtime = "nodejs";

const orderSchema = z.object({
  plan: z.enum(selfServePlans),
});

export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(request, "billing-order", 5, 60_000);
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Please sign in before checkout." }, { status: 401 });
    }

    const parsed = orderSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid paid plan." }, { status: 400 });
    }

    const { plan } = parsed.data;
    const amount = getPlanAmount(plan);
    const config = getRazorpayConfig();

    if (!amount || !config) {
      return NextResponse.json(
        { error: "Self-serve billing is not configured for this plan yet." },
        { status: 503 },
      );
    }

    const receipt = `vyr_${Date.now().toString(36)}_${user.id.replaceAll("-", "").slice(0, 8)}`;
    const order = await razorpayRequest<RazorpayOrder>("/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        partial_payment: false,
        notes: {
          product: "VeyraSec",
          plan,
          user_id: user.id,
        },
      }),
    });

    if (
      !order.id ||
      Number(order.amount) !== amount ||
      order.currency !== "INR"
    ) {
      throw new Error("Razorpay returned an unexpected order response.");
    }

    const admin = createSupabaseAdminClient();
    const { error: paymentError } = await admin.from("payments").insert({
      user_id: user.id,
      razorpay_order_id: order.id,
      amount,
      currency: "INR",
      status: "created",
      plan,
      receipt,
      updated_at: new Date().toISOString(),
    });

    if (paymentError) {
      console.error("billing order persistence failed", {
        code: paymentError.code,
        orderId: order.id,
      });
      return NextResponse.json(
        { error: "Payment order could not be prepared safely. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        keyId: config.keyId,
        orderId: order.id,
        amount,
        currency: "INR",
        plan,
        productName: "VeyraSec",
      },
      {
        headers: { "cache-control": "no-store" },
      },
    );
  } catch (error) {
    console.error("billing order failed", {
      message: error instanceof Error ? error.message : "Unknown billing error",
    });

    return NextResponse.json(
      { error: "Checkout could not be started. Please try again." },
      { status: 500 },
    );
  }
}
