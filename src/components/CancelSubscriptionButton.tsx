"use client";

import { useState } from "react";

export function CancelSubscriptionButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function cancelSubscription() {
    if (busy) return;

    const confirmed = window.confirm(
      "Cancel recurring billing? If a paid billing cycle is active, access stays available through the end of that paid cycle.",
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/billing/subscription/cancel", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | {
            error?: string;
            atCycleEnd?: boolean;
            currentEnd?: string | null;
          }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Cancellation could not be completed.");
      }

      if (body?.atCycleEnd && body.currentEnd) {
        setMessage(
          `Recurring billing is cancelled. Paid access remains available through ${new Date(
            body.currentEnd,
          ).toLocaleDateString()}.`,
        );
      } else {
        setMessage("Subscription is cancelled and recurring billing has stopped.");
      }

      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Cancellation could not be completed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={cancelSubscription}
        disabled={busy}
        className="rounded-full border border-red-300 bg-white px-5 py-3 text-sm font-black text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Cancelling…" : "Cancel recurring billing"}
      </button>
      {message ? (
        <p className="max-w-xl text-sm font-bold leading-6 text-slate-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
