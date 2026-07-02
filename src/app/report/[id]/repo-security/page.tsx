import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { RepoSecurityPanel } from "@/components/RepoSecurityPanel";
import { createClient } from "@/lib/supabase/server";

export default async function ReportRepoSecurityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ project?: string; message?: string }>;
}) {
  const { id } = await params;
  const { project: selectedProjectId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to use repo security");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: projects } = await supabase
    .from("repo_security_projects_v2")
    .select(
      "id, project_name, repo_url, repo_provider, project_status, latest_risk_score, latest_risk_level, latest_summary",
    )
    .eq("user_id", user.id)
    .eq("scan_id", scan.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const selectedProject = selectedProjectId
    ? projects?.find((item: any) => item.id === selectedProjectId) ||
      projects?.[0]
    : projects?.[0];

  const { data: dependencyRuns } = selectedProject?.id
    ? await supabase
        .from("repo_dependency_scan_runs_v2")
        .select(
          "id, dependency_count, risky_dependency_count, dependency_risk_score, dependency_risk_level, summary, developer_action, created_at",
        )
        .eq("project_id", selectedProject.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  const { data: dependencyItems } = selectedProject?.id
    ? await supabase
        .from("repo_dependency_items_v2")
        .select(
          "id, package_name, current_version, dependency_scope, risk_level, risk_reason, safe_fix, item_status",
        )
        .eq("project_id", selectedProject.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const { data: secretRuns } = selectedProject?.id
    ? await supabase
        .from("repo_secret_scan_runs_v2")
        .select(
          "id, secret_signal_count, high_confidence_secret_count, secret_risk_score, secret_risk_level, summary, developer_action, created_at",
        )
        .eq("project_id", selectedProject.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  const { data: secretFindings } = selectedProject?.id
    ? await supabase
        .from("repo_secret_findings_v2")
        .select(
          "id, secret_type, masked_value, line_number, risk_level, confidence_level, evidence_summary, developer_action, finding_status",
        )
        .eq("project_id", selectedProject.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const { data: alerts } = selectedProject?.id
    ? await supabase
        .from("repo_security_alerts_v2")
        .select(
          "id, alert_type, severity, alert_title, client_safe_summary, developer_action",
        )
        .eq("project_id", selectedProject.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}`}
              className="text-sm font-bold text-slate-600"
            >
              Back to report
            </Link>
            <p className="mt-4 break-all text-sm font-bold text-slate-500">
              {scan.website_url}
            </p>
          </div>
          <Link
            href="/repo-security"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            All Repo Projects
          </Link>
        </div>

        <RepoSecurityPanel
          scans={[scan]}
          projects={projects || []}
          selectedProject={selectedProject}
          dependencyRuns={dependencyRuns || []}
          dependencyItems={dependencyItems || []}
          secretRuns={secretRuns || []}
          secretFindings={secretFindings || []}
          alerts={alerts || []}
          message={message}
        />
      </section>
    </main>
  );
}
