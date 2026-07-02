import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SecurityReviewWorkspacePanel } from "@/components/SecurityReviewWorkspacePanel";
import { createClient } from "@/lib/supabase/server";

export default async function ReviewWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to view review workspace");

  const { data: workspace } = await supabase
    .from("security_review_workspaces")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!workspace) redirect("/reviews?message=Workspace not found");

  const { data: items } = await supabase
    .from("security_review_bug_items")
    .select(
      "id, item_type, title, severity, priority, lifecycle_status, owner_type, assigned_to, affected_url, evidence_summary, business_impact, customer_data_risk, developer_fix, retest_steps, reviewer_note, client_safe_note, updated_at",
    )
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(300);

  const { data: events } = await supabase
    .from("security_review_activity_events")
    .select("id, event_type, title, details, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8">
          <Link href="/reviews" className="text-sm font-bold text-slate-600">
            Back to security reviews
          </Link>
        </div>

        <SecurityReviewWorkspacePanel
          workspace={workspace}
          items={items || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
