"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getOrganizationPolicy,
  normalizeOrgSlug,
  roleCanManage,
  type OrganizationRole,
  type OrganizationType,
} from "@/lib/organization-engine";
import { createClient } from "@/lib/supabase/server";

function text(v: FormDataEntryValue | null, fallback = "") {
  return String(v || fallback).trim();
}
function orgType(v: FormDataEntryValue | null): OrganizationType {
  return v === "solo" || v === "business" || v === "enterprise" ? v : "agency";
}
function role(v: FormDataEntryValue | null): OrganizationRole {
  return v === "admin" || v === "member" || v === "viewer" ? v : "viewer";
}
async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login");
  return { supabase, user };
}
async function membership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  organizationId: string,
) {
  const { data } = await supabase
    .from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return data as { role: OrganizationRole; status: string } | null;
}

export async function createOrganizationAction(formData: FormData) {
  const { supabase, user } = await auth();
  const name = text(formData.get("name"), "My Agency");
  const slug = `${normalizeOrgSlug(name)}-${user.id.slice(0, 6)}`;
  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      owner_user_id: user.id,
      name,
      slug,
      organization_type: orgType(formData.get("organizationType")),
      settings: { clientWorkspaceFoundation: true, megaPart: 50 },
    })
    .select("id")
    .single();
  if (error || !org?.id)
    redirect(
      `/organizations?message=${encodeURIComponent(`Could not create organization: ${error?.message || "Unknown error"}`)}`,
    );
  await supabase.from("organization_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "owner",
    status: "active",
    invited_by: user.id,
  });
  await supabase.from("organization_activity_events").insert({
    organization_id: org.id,
    actor_user_id: user.id,
    event_type: "organization-created",
    title: "Organization created",
    details: `${name} workspace was created.`,
  });
  revalidatePath("/organizations");
  redirect(
    `/organizations?organization=${org.id}&message=${encodeURIComponent("Organization created. You are the owner.")}`,
  );
}

export async function createOrganizationInviteAction(formData: FormData) {
  const { supabase, user } = await auth();
  const organizationId = text(formData.get("organizationId"));
  const email = text(formData.get("email")).toLowerCase();
  const inviteRole = role(formData.get("role"));
  const my = await membership(supabase, user.id, organizationId);
  if (!getOrganizationPolicy(my?.role || "viewer").canInviteMembers)
    redirect(
      `/organizations?organization=${organizationId}&message=${encodeURIComponent("No invite permission.")}`,
    );
  const { data: invite, error } = await supabase
    .from("organization_invites")
    .insert({
      organization_id: organizationId,
      invited_by: user.id,
      email,
      role: inviteRole,
      message: text(formData.get("message")),
      status: "pending",
    })
    .select("id,invite_token")
    .single();
  if (error || !invite?.id)
    redirect(
      `/organizations?organization=${organizationId}&message=${encodeURIComponent(`Could not create invite: ${error?.message || "Unknown error"}`)}`,
    );
  await supabase.from("organization_activity_events").insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    event_type: "invite-created",
    title: "Invite created",
    details: `${email} was invited as ${inviteRole}.`,
    metadata: { inviteId: invite.id },
  });
  revalidatePath("/organizations");
  redirect(
    `/organizations?organization=${organizationId}&message=${encodeURIComponent(`Invite created. Development token: ${invite.invite_token}`)}`,
  );
}

export async function updateMemberRoleAction(formData: FormData) {
  const { supabase, user } = await auth();
  const organizationId = text(formData.get("organizationId"));
  const memberId = text(formData.get("memberId"));
  const targetUserId = text(formData.get("targetUserId"));
  const oldRole = role(formData.get("currentTargetRole"));
  const newRole = role(formData.get("newRole"));
  const my = await membership(supabase, user.id, organizationId);
  const currentRole = my?.role || "viewer";
  if (
    !roleCanManage(currentRole, oldRole) ||
    !roleCanManage(currentRole, newRole)
  )
    redirect(
      `/organizations?organization=${organizationId}&message=${encodeURIComponent("No role update permission.")}`,
    );
  await supabase
    .from("organization_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("organization_id", organizationId);
  await supabase.from("organization_activity_events").insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    target_user_id: targetUserId,
    event_type: "member-role-updated",
    title: "Member role updated",
    details: `Member role changed to ${newRole}.`,
  });
  revalidatePath("/organizations");
  redirect(
    `/organizations?organization=${organizationId}&message=${encodeURIComponent("Member role updated.")}`,
  );
}

export async function assignLatestAssetsToOrganizationAction(
  formData: FormData,
) {
  const { supabase, user } = await auth();
  const organizationId = text(formData.get("organizationId"));
  const my = await membership(supabase, user.id, organizationId);
  if (!getOrganizationPolicy(my?.role || "viewer").canAssignWebsites)
    redirect(
      `/organizations?organization=${organizationId}&message=${encodeURIComponent("No asset assignment permission.")}`,
    );
  const { data: websites } = await supabase
    .from("websites")
    .select("id")
    .eq("user_id", user.id)
    .is("organization_id", null)
    .limit(25);
  const { data: scans } = await supabase
    .from("scans")
    .select("id")
    .eq("user_id", user.id)
    .is("organization_id", null)
    .limit(50);
  const websiteIds = (websites || []).map((x: any) => x.id);
  const scanIds = (scans || []).map((x: any) => x.id);
  if (websiteIds.length)
    await supabase
      .from("websites")
      .update({ organization_id: organizationId })
      .in("id", websiteIds)
      .eq("user_id", user.id);
  if (scanIds.length)
    await supabase
      .from("scans")
      .update({ organization_id: organizationId })
      .in("id", scanIds)
      .eq("user_id", user.id);
  await supabase.from("organization_activity_events").insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    event_type: "website-assigned",
    title: "Assets assigned",
    details: `${websiteIds.length} websites and ${scanIds.length} scans assigned.`,
    metadata: { websiteCount: websiteIds.length, scanCount: scanIds.length },
  });
  revalidatePath("/organizations");
  revalidatePath("/agency-dashboard");
  redirect(
    `/organizations?organization=${organizationId}&message=${encodeURIComponent("Latest unassigned assets assigned.")}`,
  );
}
