"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

function clean(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export async function reviewManualPaymentAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const requestId = clean(formData.get("requestId"));
  const decision = clean(formData.get("decision"));
  const adminNote = clean(formData.get("adminNote"));

  if (!requestId || (decision !== "approved" && decision !== "rejected")) {
    redirect("/admin/manual-payments?message=Invalid payment review request");
  }

  const { error } = await supabase.rpc("admin_review_manual_payment_v2", {
    p_request_id: requestId,
    p_decision: decision,
    p_admin_note: adminNote || null,
  });

  if (error) {
    redirect(
      `/admin/manual-payments?message=${encodeURIComponent(error.message || "Payment review failed")}`,
    );
  }

  revalidatePath("/admin/manual-payments");
  revalidatePath("/billing");
  revalidatePath("/dashboard");

  redirect(
    `/admin/manual-payments?message=${encodeURIComponent(
      decision === "approved"
        ? "Payment approved and paid entitlement activated."
        : "Payment request rejected.",
    )}`,
  );
}
