"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type VerificationMethod,
  buildVerificationToken,
  verifyWebsiteOwnership,
} from "@/lib/ownership-verification";
import { createClient } from "@/lib/supabase/server";
import { updateTrustedWebsiteVerification } from "@/lib/trusted-server-writes";

function getMethod(value: FormDataEntryValue | null): VerificationMethod {
  const method = String(value || "dns_txt");

  if (method === "html_file" || method === "meta_tag") {
    return method;
  }

  return "dns_txt";
}

async function getOwnedWebsite(websiteId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login before verifying website ownership");
  }

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, user_id, url, verification_token, verification_method, verification_status",
    )
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .single();

  if (!website) {
    redirect("/websites?message=Website not found");
  }

  return { user, website };
}

export async function rotateVerificationToken(formData: FormData) {
  const websiteId = String(formData.get("websiteId") || "");
  const { user, website } = await getOwnedWebsite(websiteId);
  const token = buildVerificationToken();

  await updateTrustedWebsiteVerification({
    userId: user.id,
    websiteId: website.id,
    patch: {
      verification_token: token,
      verification_status: "unverified",
      verified_at: null,
      verified_by: null,
      permission_attested_at: null,
      deep_scan_enabled: false,
    },
  });

  revalidatePath(`/websites/${website.id}`);
  revalidatePath(`/websites/${website.id}/verify`);
}

export async function verifyOwnershipAction(formData: FormData) {
  const websiteId = String(formData.get("websiteId") || "");
  const method = getMethod(formData.get("method"));
  const permission = formData.get("permission") === "on";

  if (!permission) {
    redirect(
      `/websites/${websiteId}/verify?message=Please confirm you own or have permission to test this website`,
    );
  }

  const { user, website } = await getOwnedWebsite(websiteId);
  const token = website.verification_token || buildVerificationToken();

  if (!website.verification_token) {
    await updateTrustedWebsiteVerification({
      userId: user.id,
      websiteId: website.id,
      patch: {
        verification_token: token,
        verification_status: "unverified",
        verified_at: null,
        verified_by: null,
        permission_attested_at: null,
        deep_scan_enabled: false,
      },
    });
  }

  const result = await verifyWebsiteOwnership({
    websiteUrl: website.url,
    token,
    method,
  });

  if (!result.verified) {
    await updateTrustedWebsiteVerification({
      userId: user.id,
      websiteId: website.id,
      patch: {
        verification_method: method,
        verification_status: "failed",
        verified_at: null,
        verified_by: null,
        permission_attested_at: null,
        deep_scan_enabled: false,
      },
    });

    redirect(
      `/websites/${website.id}/verify?message=${encodeURIComponent(result.evidence)}`,
    );
  }

  await updateTrustedWebsiteVerification({
    userId: user.id,
    websiteId: website.id,
    patch: {
      verification_method: method,
      verification_status: "verified",
      verified_at: result.checkedAt,
      verified_by: user.id,
      permission_attested_at: new Date().toISOString(),
      deep_scan_enabled: true,
    },
  });

  revalidatePath(`/websites/${website.id}`);
  revalidatePath(`/websites/${website.id}/verify`);
  redirect(
    `/websites/${website.id}?message=Website verified and deep scan unlocked`,
  );
}
