import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login as admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, plan, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard?message=Admin access required");
  }

  return {
    supabase,
    user,
    profile,
  };
}
