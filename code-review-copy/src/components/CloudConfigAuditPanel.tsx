import {
  createCloudConfigProjectAction,
  runCloudConfigAuditAction,
  updateCloudConfigTaskAction,
} from "@/app/cloud-config-audit/actions";

type ScanOption = { id: string; website_url: string };

type Project = {
  id: string;
  project_name: string;
  production_domain: string;
  supabase_project_ref: string;
  vercel_project_name: string;
  dns_provider: string;
  project_status: string;
  latest_risk_score: number;
  latest_risk_level: string;
  latest_summary: string;
};

type AuditRun = {
  id: string;
  risk_score: number;
  risk_level: string;
  passed_count: number;
  warning_count: number;
  failed_count: number;
  manual_review_count: number;
  summary: string;
  developer_action: string;
  created_at: string;
};

type CheckItem = {
  id: string;
  category: string;
  check_title: string;
  check_status: string;
  severity: string;
  evidence_summary: string;
  remediation_action: string;
  client_safe_note: string;
};

type DnsRecord = {
  id: string;
  record_type: string;
  record_name: string;
  record_value_safe: string;
  record_status: string;
  security_purpose: string;
  finding_summary: string;
  remediation_action: string;
};

type Task = {
  id: string;
  task_title: string;
  task_status: string;
  priority: string;
  owner_role: string;
  task_summary: string;
  safe_steps: string;
  verification_hint: string;
};

function badgeClass(value: string) {
  if (["pass", "Info", "Low", "active", "done", "present"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["warning", "Medium", "manual-review", "open", "weak"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["fail", "High", "Critical", "missing"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export function CloudConfigAuditPanel({
  scans,
  projects,
  selectedProject,
  auditRuns,
  checkItems,
  dnsRecords,
  tasks,
  message,
}: {
  scans: ScanOption[];
  projects: Project[];
  selectedProject?: Project | null;
  auditRuns: AuditRun[];
  checkItems: CheckItem[];
  dnsRecords: DnsRecord[];
  tasks: Task[];
  message?: string;
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <p className="text-sm font-black text-blue-700">Mega Part 71</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Cloud Config Audit
        </h1>
        <p className="mt-4 max-w-4xl leading-8 text-blue-900">
          Manual launch security audit for Supabase, Vercel, DNS/email security
          and support process readiness.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <form
            action={createCloudConfigProjectAction}
            className="rounded-3xl border border-slate-200 bg-white p-8"
          >
            <h2 className="text-2xl font-black">Create cloud config project</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Link scan optional
                <select
                  name="scanId"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="">No linked scan</option>
                  {scans.map((scan) => (
                    <option key={scan.id} value={scan.id}>
                      {scan.website_url}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Project name
                <input
                  name="projectName"
                  placeholder="Production app"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Production domain
                <input
                  name="productionDomain"
                  placeholder="https://securemsme-ai-live.vercel.app"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Supabase project ref optional
                <input
                  name="supabaseProjectRef"
                  placeholder="Do not paste keys"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Vercel project name optional
                <input
                  name="vercelProjectName"
                  placeholder="securemsme-ai-live"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                DNS provider optional
                <input
                  name="dnsProvider"
                  placeholder="Cloudflare / GoDaddy / Namecheap"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
            </div>

            <label className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
              <input name="authorizationConfirmed" type="checkbox" />
              <span>
                I confirm I own or administer this cloud/project configuration.
              </span>
            </label>

            <label className="mt-5 grid gap-2 text-sm font-black text-slate-700">
              Authorization note optional
              <textarea
                name="authorizationNote"
                rows={3}
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>

            <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Create Cloud Project
            </button>
          </form>

          {selectedProject ? (
            <form
              action={runCloudConfigAuditAction}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <input
                type="hidden"
                name="projectId"
                value={selectedProject.id}
              />
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-black text-slate-500">
                    Selected project
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    {selectedProject.project_name}
                  </h2>
                  <p className="mt-2 break-all text-sm text-slate-600">
                    {selectedProject.production_domain || "No domain set"}
                  </p>
                </div>
                <span
                  className={`h-fit rounded-full px-4 py-2 text-sm font-black ${badgeClass(selectedProject.latest_risk_level)}`}
                >
                  {selectedProject.latest_risk_level} ·{" "}
                  {selectedProject.latest_risk_score}/100
                </span>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {[
                  [
                    "supabaseSiteUrlSet",
                    "Supabase Site URL is production domain",
                  ],
                  [
                    "supabaseRedirectUrlsRestricted",
                    "Supabase redirect URLs are restricted",
                  ],
                  [
                    "supabaseRlsEnabled",
                    "RLS enabled for customer data tables",
                  ],
                  [
                    "supabaseStoragePrivateByDefault",
                    "Storage buckets private by default",
                  ],
                  [
                    "supabaseServiceRoleNotClientExposed",
                    "Service role key not exposed client-side",
                  ],
                  [
                    "vercelEnvProductionSet",
                    "Vercel production env vars are set",
                  ],
                  [
                    "vercelPreviewSecretsSeparated",
                    "Preview/prod secrets are separated",
                  ],
                  [
                    "vercelBuildLogsNoSecrets",
                    "Build logs do not expose secrets",
                  ],
                  ["supportEmailReady", "Support/security email is ready"],
                  [
                    "incidentProcessReady",
                    "Incident response process is documented",
                  ],
                ].map(([name, label]) => (
                  <label
                    key={name}
                    className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700"
                  >
                    <input name={name} type="checkbox" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <label className="mt-6 grid gap-2 text-sm font-black text-slate-700">
                Paste DNS records text optional
                <textarea
                  name="dnsText"
                  rows={8}
                  className="rounded-2xl border border-slate-300 px-4 py-3 font-mono text-xs"
                  placeholder="TXT @ v=spf1 include:_spf.google.com -all&#10;TXT _dmarc v=DMARC1; p=reject&#10;TXT selector._domainkey v=DKIM1; ..."
                />
              </label>

              <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
                Do not paste Supabase service role keys, Vercel tokens, private
                keys, passwords, OTPs or API secrets.
              </div>

              <button className="mt-6 rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
                Run Cloud Config Audit
              </button>
            </form>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-black">Audit runs</h2>
            <div className="mt-5 grid gap-3">
              {auditRuns.length ? (
                auditRuns.map((run) => (
                  <div key={run.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(run.risk_level)}`}
                      >
                        {run.risk_level}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                        {run.risk_score}/100
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {run.summary}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {run.developer_action}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No audit runs yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-black">Cloud config checks</h2>
            <div className="mt-5 grid gap-3">
              {checkItems.length ? (
                checkItems.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.check_status)}`}
                      >
                        {item.check_status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.severity)}`}
                      >
                        {item.severity}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                        {item.category}
                      </span>
                    </div>
                    <p className="mt-3 font-black">{item.check_title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.evidence_summary}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {item.remediation_action}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No check items yet.</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-black">DNS records</h2>
              <div className="mt-5 grid gap-3">
                {dnsRecords.length ? (
                  dnsRecords.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(record.record_status)}`}
                      >
                        {record.record_status}
                      </span>
                      <p className="mt-3 font-black">
                        {record.record_type} · {record.record_name}
                      </p>
                      <p className="mt-2 text-xs break-all text-slate-600">
                        {record.record_value_safe}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {record.finding_summary}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">No DNS records yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-black">Remediation tasks</h2>
              <div className="mt-5 grid gap-3">
                {tasks.length ? (
                  tasks.map((task) => (
                    <div key={task.id} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(task.task_status)}`}
                        >
                          {task.task_status}
                        </span>
                      </div>
                      <p className="mt-3 font-black">{task.task_title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {task.safe_steps}
                      </p>
                      <form
                        action={updateCloudConfigTaskAction}
                        className="mt-4 flex flex-wrap gap-2"
                      >
                        <input type="hidden" name="taskId" value={task.id} />
                        <input
                          type="hidden"
                          name="projectId"
                          value={selectedProject?.id || ""}
                        />
                        {["in-progress", "done", "accepted-risk"].map(
                          (status) => (
                            <button
                              key={status}
                              name="taskStatus"
                              value={status}
                              className="rounded-full bg-white px-3 py-2 text-xs font-black hover:bg-slate-100"
                            >
                              {status}
                            </button>
                          ),
                        )}
                      </form>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">
                    No remediation tasks yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Projects</h2>
            <div className="mt-5 grid gap-3">
              {projects.length ? (
                projects.map((project) => (
                  <a
                    key={project.id}
                    href={`/cloud-config-audit?project=${project.id}`}
                    className="rounded-2xl bg-slate-50 p-4 hover:bg-slate-100"
                  >
                    <p className="font-black">{project.project_name}</p>
                    <p className="mt-1 break-all text-xs text-slate-600">
                      {project.production_domain}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${badgeClass(project.latest_risk_level)}`}
                    >
                      {project.latest_risk_level} · {project.latest_risk_score}
                      /100
                    </span>
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-600">No cloud projects yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-xl font-black text-amber-950">
              Manual audit foundation
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-amber-900">
              This does not connect to Supabase/Vercel/DNS APIs yet. It stores
              checklist evidence, DNS text signals and remediation tasks without
              collecting secrets.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
