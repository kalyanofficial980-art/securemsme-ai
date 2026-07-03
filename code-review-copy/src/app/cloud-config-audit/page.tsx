import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { CloudConfigAuditPanel } from "@/components/CloudConfigAuditPanel";
import { createClient } from "@/lib/supabase/server";

export default async function CloudConfigAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; message?: string }>;
}) {
  const { project: selectedProjectId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to use cloud config audit");

  const { data: scans } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: projects } = await supabase
    .from("cloud_config_projects_v2")
    .select(
      "id, project_name, production_domain, supabase_project_ref, vercel_project_name, dns_provider, project_status, latest_risk_score, latest_risk_level, latest_summary",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const selectedProject = selectedProjectId
    ? projects?.find((item: any) => item.id === selectedProjectId) ||
      projects?.[0]
    : projects?.[0];

  const { data: auditRuns } = selectedProject?.id
    ? await supabase
        .from("cloud_config_audit_runs_v2")
        .select(
          "id, risk_score, risk_level, passed_count, warning_count, failed_count, manual_review_count, summary, developer_action, created_at",
        )
        .eq("project_id", selectedProject.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  const latestRun = auditRuns?.[0];

  const { data: checkItems } = latestRun?.id
    ? await supabase
        .from("cloud_config_check_items_v2")
        .select(
          "id, category, check_title, check_status, severity, evidence_summary, remediation_action, client_safe_note",
        )
        .eq("audit_run_id", latestRun.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };

  const { data: dnsRecords } = latestRun?.id
    ? await supabase
        .from("cloud_config_dns_records_v2")
        .select(
          "id, record_type, record_name, record_value_safe, record_status, security_purpose, finding_summary, remediation_action",
        )
        .eq("audit_run_id", latestRun.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50)
    : { data: [] };

  const { data: tasks } = selectedProject?.id
    ? await supabase
        .from("cloud_config_remediation_tasks_v2")
        .select(
          "id, task_title, task_status, priority, owner_role, task_summary, safe_steps, verification_hint",
        )
        .eq("project_id", selectedProject.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <CloudConfigAuditPanel
          scans={scans || []}
          projects={projects || []}
          selectedProject={selectedProject}
          auditRuns={auditRuns || []}
          checkItems={checkItems || []}
          dnsRecords={dnsRecords || []}
          tasks={tasks || []}
          message={message}
        />
      </section>
    </main>
  );
}
