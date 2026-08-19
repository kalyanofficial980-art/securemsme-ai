"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

function clean(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export async function setUserPlanAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const userId = clean(formData.get("userId"));
  const plan = clean(formData.get("plan"));
  const expiresAtRaw = clean(formData.get("expiresAt"));
  const reason = clean(formData.get("reason"));

  if (!userId || !["free", "starter", "growth", "agency"].includes(plan)) {
    redirect("/admin/plan-control?message=Invalid plan update request");
  }

  let expiresAt: string | null = null;
  if (plan !== "free") {
    const date = new Date(expiresAtRaw);
    if (!expiresAtRaw || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      redirect("/admin/plan-control?message=Paid plan requires a future expiry date");
    }
    expiresAt = date.toISOString();
  }

  const { error } = await supabase.rpc("admin_set_user_plan_v2", {
    p_user_id: userId,
    p_plan: plan,
    p_expires_at: expiresAt,
    p_reason: reason || null,
  });

  if (error) {
    redirect(`/admin/plan-control?message=${encodeURIComponent(error.message || "Plan update failed")}`);
  }

  revalidatePath("/admin/plan-control");
  revalidatePath("/admin/audit-log");
  revalidatePath("/dashboard");
  revalidatePath("/billing");
  redirect("/admin/plan-control?message=Plan entitlement updated.");
}
