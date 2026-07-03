import {
  createRepoSecurityProjectAction,
  runRepoSecurityScanAction,
  updateRepoSecretFindingStatusAction,
} from "@/app/repo-security/actions";

type ScanOption = { id: string; website_url: string };

type Project = {
  id: string;
  project_name: string;
  repo_url: string;
  repo_provider: string;
  project_status: string;
  latest_risk_score: number;
  latest_risk_level: string;
  latest_summary: string;
};

type DependencyRun = {
  id: string;
  dependency_count: number;
  risky_dependency_count: number;
  dependency_risk_score: number;
  dependency_risk_level: string;
  summary: string;
  developer_action: string;
  created_at: string;
};

type DependencyItem = {
  id: string;
  package_name: string;
  current_version: string;
  dependency_scope: string;
  risk_level: string;
  risk_reason: string;
  safe_fix: string;
  item_status: string;
};

type SecretRun = {
  id: string;
  secret_signal_count: number;
  high_confidence_secret_count: number;
  secret_risk_score: number;
  secret_risk_level: string;
  summary: string;
  developer_action: string;
  created_at: string;
};

type SecretFinding = {
  id: string;
  secret_type: string;
  masked_value: string;
  line_number: number;
  risk_level: string;
  confidence_level: string;
  evidence_summary: string;
  developer_action: string;
  finding_status: string;
};

type Alert = {
  id: string;
  alert_type: string;
  severity: string;
  alert_title: string;
  client_safe_summary: string;
  developer_action: string;
};

function badgeClass(value: string) {
  if (
    [
      "Info",
      "Low",
      "active",
      "fixed",
      "rotated",
      "revoked",
      "resolved",
    ].includes(value)
  )
    return "bg-emerald-100 text-emerald-950";
  if (["Medium", "needs-review", "open"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["High", "Critical"].includes(value)) return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export function RepoSecurityPanel({
  scans,
  projects,
  selectedProject,
  dependencyRuns,
  dependencyItems,
  secretRuns,
  secretFindings,
  alerts,
  message,
}: {
  scans: ScanOption[];
  projects: Project[];
  selectedProject?: Project | null;
  dependencyRuns: DependencyRun[];
  dependencyItems: DependencyItem[];
  secretRuns: SecretRun[];
  secretFindings: SecretFinding[];
  alerts: Alert[];
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
        <p className="text-sm font-black text-blue-700">Mega Part 70</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Repository / Dependency / Secrets Scanner
        </h1>
        <p className="mt-4 max-w-4xl leading-8 text-blue-900">
          Safe code-side security foundation for package.json dependency review,
          SBOM-lite inventory and masked secret detection.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <form
            action={createRepoSecurityProjectAction}
            className="rounded-3xl border border-slate-200 bg-white p-8"
          >
            <h2 className="text-2xl font-black">Create repository project</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Link website scan optional
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
                  placeholder="Main web app"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Repo URL optional
                <input
                  name="repoUrl"
                  placeholder="https://github.com/user/repo"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Default branch
                <input
                  name="defaultBranch"
                  defaultValue="main"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
            </div>

            <label className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
              <input name="authorizationConfirmed" type="checkbox" />
              <span>
                I confirm I own this repository or have written permission to
                review this code/security data.
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
              Create Repo Project
            </button>
          </form>

          {selectedProject ? (
            <form
              action={runRepoSecurityScanAction}
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
                    {selectedProject.repo_url || "Manual input project"}
                  </p>
                </div>
                <span
                  className={`h-fit rounded-full px-4 py-2 text-sm font-black ${badgeClass(selectedProject.latest_risk_level)}`}
                >
                  {selectedProject.latest_risk_level} ·{" "}
                  {selectedProject.latest_risk_score}/100
                </span>
              </div>

              <div className="mt-6 grid gap-4">
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Paste package.json / dependency list
                  <textarea
                    name="packageManifest"
                    rows={10}
                    className="rounded-2xl border border-slate-300 px-4 py-3 font-mono text-xs"
                    placeholder='{"dependencies":{"next":"^16.2.9","jsonwebtoken":"latest"}}'
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Paste code/env text for secret pattern scan
                  <textarea
                    name="secretScanText"
                    rows={8}
                    className="rounded-2xl border border-slate-300 px-4 py-3 font-mono text-xs"
                    placeholder="API_KEY=...  Raw secrets will be masked in results. Do not paste unnecessary real secrets."
                  />
                </label>
              </div>

              <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
                Raw secrets are not displayed in results. If a real credential
                is detected, rotate/revoke it and move it to a secret manager.
              </div>

              <button className="mt-6 rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
                Run Repo Security Scan
              </button>
            </form>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-black">Dependency runs</h2>
              <div className="mt-5 grid gap-3">
                {dependencyRuns.length ? (
                  dependencyRuns.map((run) => (
                    <div key={run.id} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(run.dependency_risk_level)}`}
                        >
                          {run.dependency_risk_level}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                          {run.dependency_count} deps
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
                  <p className="text-sm text-slate-600">
                    No dependency runs yet.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-black">Secret runs</h2>
              <div className="mt-5 grid gap-3">
                {secretRuns.length ? (
                  secretRuns.map((run) => (
                    <div key={run.id} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(run.secret_risk_level)}`}
                        >
                          {run.secret_risk_level}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                          {run.secret_signal_count} signals
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
                  <p className="text-sm text-slate-600">No secret runs yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-black">Dependency items</h2>
            <div className="mt-5 grid gap-3">
              {dependencyItems.length ? (
                dependencyItems.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.risk_level)}`}
                      >
                        {item.risk_level}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                        {item.dependency_scope}
                      </span>
                    </div>
                    <p className="mt-3 font-black">
                      {item.package_name} · {item.current_version}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.risk_reason}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {item.safe_fix}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  No dependency items yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-black">Masked secret findings</h2>
            <div className="mt-5 grid gap-3">
              {secretFindings.length ? (
                secretFindings.map((finding) => (
                  <div key={finding.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(finding.risk_level)}`}
                      >
                        {finding.risk_level}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(finding.finding_status)}`}
                      >
                        {finding.finding_status}
                      </span>
                    </div>
                    <p className="mt-3 font-black">
                      {finding.secret_type} · {finding.masked_value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {finding.evidence_summary}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {finding.developer_action}
                    </p>

                    <form
                      action={updateRepoSecretFindingStatusAction}
                      className="mt-4 flex flex-wrap gap-2"
                    >
                      <input
                        type="hidden"
                        name="findingId"
                        value={finding.id}
                      />
                      <input
                        type="hidden"
                        name="projectId"
                        value={selectedProject?.id || ""}
                      />
                      {[
                        "rotated",
                        "revoked",
                        "false-positive",
                        "needs-review",
                      ].map((status) => (
                        <button
                          key={status}
                          name="findingStatus"
                          value={status}
                          className="rounded-full bg-white px-3 py-2 text-xs font-black hover:bg-slate-100"
                        >
                          {status}
                        </button>
                      ))}
                    </form>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  No masked secret findings yet.
                </p>
              )}
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
                    href={`/repo-security?project=${project.id}`}
                    className="rounded-2xl bg-slate-50 p-4 hover:bg-slate-100"
                  >
                    <p className="font-black">{project.project_name}</p>
                    <p className="mt-1 break-all text-xs text-slate-600">
                      {project.repo_url || "Manual input"}
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
                <p className="text-sm text-slate-600">No projects yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Repo alerts</h2>
            <div className="mt-5 grid gap-3">
              {alerts.length ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(alert.severity)}`}
                    >
                      {alert.severity}
                    </span>
                    <p className="mt-3 font-black">{alert.alert_title}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {alert.client_safe_summary}
                    </p>
                    <p className="mt-2 text-xs font-bold leading-5 text-slate-800">
                      {alert.developer_action}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No repo alerts yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-xl font-black text-amber-950">Limitations</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-amber-900">
              This is a local/manual repo security foundation. It does not clone
              private repositories, does not verify live CVE databases, and does
              not prove all secrets or vulnerabilities are found.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
