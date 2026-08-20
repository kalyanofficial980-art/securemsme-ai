"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

function clean(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function settingsError(message: string): never {
  redirect(`/admin/manual-payments?message=${encodeURIComponent(message)}`);
}

export async function savePaymentSettingsAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const payeeName = clean(formData.get("payeeName"));
  const upiEnabled = clean(formData.get("upiEnabled")) === "on";
  const upiId = clean(formData.get("upiId"));
  const bankEnabled = clean(formData.get("bankEnabled")) === "on";
  const bankAccountName = clean(formData.get("bankAccountName"));
  const bankName = clean(formData.get("bankName"));
  const bankAccountNumber = clean(formData.get("bankAccountNumber")).replace(/\s+/g, "");
  const bankIfsc = clean(formData.get("bankIfsc")).toUpperCase();

  if (payeeName.length < 2 || payeeName.length > 120) {
    settingsError("Enter a valid business/payee name.");
  }
  if (upiEnabled && !/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(upiId)) {
    settingsError("Enter a valid UPI ID before enabling UPI payments.");
  }
  if (bankEnabled) {
    if (bankAccountName.length < 2 || bankName.length < 2) {
      settingsError("Account holder and bank name are required for bank transfer.");
    }
    if (!/^[0-9]{6,24}$/.test(bankAccountNumber)) {
      settingsError("Enter a valid bank account number.");
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) {
      settingsError("Enter a valid IFSC code.");
    }
  }

  const { error } = await supabase.from("payment_settings_v1").upsert(
    {
      id: "primary",
      payee_name: payeeName,
      upi_enabled: upiEnabled,
      upi_id: upiId || null,
      bank_enabled: bankEnabled,
      bank_account_name: bankAccountName || null,
      bank_name: bankName || null,
      bank_account_number: bankAccountNumber || null,
      bank_ifsc: bankIfsc || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) settingsError(error.message || "Could not save payment settings.");

  revalidatePath("/admin/manual-payments");
  revalidatePath("/manual-billing");
  redirect(
    "/admin/manual-payments?message=Payment settings saved. Customer QR and bank instructions now use this configuration.",
  );
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
  revalidatePath("/manual-billing");
  revalidatePath("/dashboard");

  redirect(
    `/admin/manual-payments?message=${encodeURIComponent(
      decision === "approved"
        ? "Payment approved and paid entitlement activated."
        : "Payment request rejected.",
    )}`,
  );
}
