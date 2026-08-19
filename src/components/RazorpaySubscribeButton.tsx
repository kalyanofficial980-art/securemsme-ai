"use client";

import { useState } from "react";

type SelfServePlan = "starter" | "growth" | "agency";

type SubscriptionCreateResponse = {
  keyId: string;
  subscriptionId: string;
  amount: number;
  currency: "INR";
  plan: SelfServePlan;
  displayPrice: string;
  productName: string;
};

type CheckoutSuccess = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open: () => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckout;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let checkoutScriptPromise: Promise<void> | null = null;

function loadRazorpayCheckout() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Checkout is only available in the browser."));
  }

  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Payment checkout could not be loaded.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Payment checkout could not be loaded."));
    document.head.appendChild(script);
  });

  return checkoutScriptPromise;
}

export function RazorpaySubscribeButton({
  plan,
  label,
}: {
  plan: SelfServePlan;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startCheckout() {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const body = (await response.json().catch(() => null)) as
        | (Partial<SubscriptionCreateResponse> & { error?: string })
        | null;

      if (response.status === 401) {
        window.location.assign(
          `/login?message=${encodeURIComponent("Sign in with Google before subscribing.")}`,
        );
        return;
      }

      if (!response.ok || !body?.subscriptionId || !body.keyId) {
        throw new Error(body?.error || "Checkout could not be started.");
      }

      await loadRazorpayCheckout();

      if (!window.Razorpay) {
        throw new Error("Payment checkout is unavailable in this browser.");
      }

      const checkout = new window.Razorpay({
        key: body.keyId,
        subscription_id: body.subscriptionId,
        name: body.productName || "VeyraSec",
        description: `${label} recurring subscription`,
        handler: async (result: CheckoutSuccess) => {
          try {
            const verifyResponse = await fetch(
              "/api/billing/subscription/verify",
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  razorpay_payment_id: result.razorpay_payment_id,
                  razorpay_subscription_id: result.razorpay_subscription_id,
                  razorpay_signature: result.razorpay_signature,
                }),
              },
            );

            const verification = (await verifyResponse
              .json()
              .catch(() => null)) as
              | {
                  error?: string;
                  active?: boolean;
                  status?: string;
                }
              | null;

            if (!verifyResponse.ok) {
              throw new Error(
                verification?.error ||
                  "Payment was received but verification is still pending.",
              );
            }

            window.location.assign(
              verification?.active
                ? "/dashboard?billing=success"
                : "/dashboard?billing=pending",
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Subscription verification is pending. Please contact support if you were charged.",
            );
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setMessage("Checkout closed. No plan change was made.");
          },
        },
        notes: {
          product: "VeyraSec",
          plan,
        },
      });

      checkout.open();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Checkout could not be started. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={startCheckout}
        disabled={busy}
        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Opening secure checkout…" : label}
      </button>
      {message ? (
        <p className="text-xs font-bold leading-5 text-slate-600">{message}</p>
      ) : null}
    </div>
  );
}
