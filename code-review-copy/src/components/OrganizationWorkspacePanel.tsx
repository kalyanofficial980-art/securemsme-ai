import {
  assignLatestAssetsToOrganizationAction,
  createOrganizationAction,
  createOrganizationInviteAction,
  updateMemberRoleAction,
} from "@/app/organizations/actions";
import {
  buildAgencyDashboardSummary,
  getOrganizationPolicy,
  type OrganizationRole,
} from "@/lib/organization-engine";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}
function roleClass(role: string) {
  if (role === "owner") return "bg-slate-950 text-white";
  if (role === "admin") return "bg-blue-100 text-blue-950";
  if (role === "member") return "bg-emerald-100 text-emerald-950";
  return "bg-slate-100 text-slate-700";
}

export function OrganizationWorkspacePanel({
  organizations,
  selectedOrganization,
  selectedRole,
  members,
  invites,
  activities,
  metrics,
  message,
}: any) {
  const policy = getOrganizationPolicy(
    (selectedRole || "viewer") as OrganizationRole,
  );
  const summary = buildAgencyDashboardSummary({
    ...metrics,
    members: members.length,
    invites: invites.length,
  });
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-black text-slate-500">
          Organization foundation
        </p>
        <h2 className="mt-2 text-3xl font-black">
          Team accounts + agency workspace
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Create team workspaces, invite members, assign websites/scans and
          prepare agency client delivery.
        </p>
        <form
          action={createOrganizationAction}
          className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6"
        >
          <h3 className="text-xl font-black">Create organization</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Name</span>
              <input
                name="name"
                placeholder="SecureMSME Agency"
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              />
            </label>
            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Type</span>
              <select
                name="organizationType"
                defaultValue="agency"
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
              >
                <option value="solo">Solo</option>
                <option value="agency">Agency</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
          </div>
          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white">
            Create organization
          </button>
        </form>
      </div>
      {organizations.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">Your organizations</h3>
          <div className="mt-6 flex flex-wrap gap-3">
            {organizations.map((org: any) => (
              <a
                key={org.id}
                href={`/organizations?organization=${org.id}`}
                className={
                  selectedOrganization?.id === org.id
                    ? "rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
                    : "rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
                }
              >
                {org.name}
              </a>
            ))}
          </div>
        </div>
      ) : null}
      {selectedOrganization ? (
        <>
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black text-blue-700">
                  Selected workspace
                </p>
                <h3 className="mt-1 text-3xl font-black text-blue-950">
                  {selectedOrganization.name}
                </h3>
                <p className="mt-3 leading-7 text-blue-900">
                  {selectedOrganization.organization_type} · your role:{" "}
                  {selectedRole}
                </p>
              </div>
              <span
                className={`rounded-full px-4 py-2 text-sm font-black ${roleClass(selectedRole)}`}
              >
                {selectedRole}
              </span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <Stat label="Readiness" value={summary.readinessScore} />
            <Stat label="Websites" value={metrics.websites} />
            <Stat label="Scans" value={metrics.scans} />
            <Stat label="Members" value={members.length} />
            <Stat label="Alerts" value={metrics.alerts} />
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Agency readiness</h3>
            <p className="mt-3 leading-7 text-slate-600">{summary.headline}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {summary.nextActions.map((a: string) => (
                <div
                  key={a}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900"
                >
                  {a}
                </div>
              ))}
            </div>
          </div>
          {policy.canAssignWebsites ? (
            <form
              action={assignLatestAssetsToOrganizationAction}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <input
                type="hidden"
                name="organizationId"
                value={selectedOrganization.id}
              />
              <h3 className="text-2xl font-black">Assign latest assets</h3>
              <p className="mt-3 leading-7 text-slate-600">
                Assign latest unassigned websites and scans to this
                organization.
              </p>
              <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white">
                Assign latest websites/scans
              </button>
            </form>
          ) : null}
          {policy.canInviteMembers ? (
            <form
              action={createOrganizationInviteAction}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <input
                type="hidden"
                name="organizationId"
                value={selectedOrganization.id}
              />
              <h3 className="text-2xl font-black">Invite team member</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="email"
                  className="rounded-2xl border border-slate-300 px-4 py-3 font-bold"
                />
                <select
                  name="role"
                  defaultValue="viewer"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <input
                  name="message"
                  placeholder="message"
                  className="rounded-2xl border border-slate-300 px-4 py-3 font-bold"
                />
              </div>
              <button className="mt-6 rounded-full bg-emerald-700 px-6 py-3 text-sm font-black text-white">
                Create invite
              </button>
            </form>
          ) : null}
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Members</h3>
            <div className="mt-6 grid gap-4">
              {members.map((m: any) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <p className="break-all font-black">{m.user_id}</p>
                      <p className="text-sm text-slate-600">{m.status}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${roleClass(m.role)}`}
                      >
                        {m.role}
                      </span>
                      {policy.canManageMembers && m.role !== "owner" ? (
                        <form
                          action={updateMemberRoleAction}
                          className="flex gap-2"
                        >
                          <input
                            type="hidden"
                            name="organizationId"
                            value={selectedOrganization.id}
                          />
                          <input type="hidden" name="memberId" value={m.id} />
                          <input
                            type="hidden"
                            name="targetUserId"
                            value={m.user_id}
                          />
                          <input
                            type="hidden"
                            name="currentTargetRole"
                            value={m.role}
                          />
                          <select
                            name="newRole"
                            defaultValue={m.role}
                            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">
                            Update
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Invites</h3>
            <div className="mt-6 grid gap-4">
              {invites.length ? (
                invites.map((i: any) => (
                  <div
                    key={i.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <p className="font-black">{i.email}</p>
                    <p className="text-sm text-slate-600">
                      {i.role} · {i.status}
                    </p>
                    <p className="mt-2 break-all rounded-2xl bg-white p-3 text-xs font-bold text-slate-600">
                      Dev token: {i.invite_token}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No invites yet.
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
              <h3 className="text-2xl font-black text-emerald-950">
                Safe claims
              </h3>
              {summary.safeClaims.map((c: string) => (
                <div
                  key={c}
                  className="mt-3 rounded-2xl bg-white/80 p-4 text-sm font-bold text-emerald-900"
                >
                  {c}
                </div>
              ))}
            </div>
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
              <h3 className="text-2xl font-black text-red-950">
                Blocked claims
              </h3>
              {summary.blockedClaims.map((c: string) => (
                <div
                  key={c}
                  className="mt-3 rounded-2xl bg-white/80 p-4 text-sm font-bold text-red-900"
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Activity</h3>
            <div className="mt-6 grid gap-4">
              {activities.length ? (
                activities.map((a: any) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <p className="text-xs font-black uppercase text-slate-500">
                      {a.event_type}
                    </p>
                    <h4 className="mt-1 font-black">{a.title}</h4>
                    <p className="mt-2 text-sm text-slate-600">{a.details}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No activity yet.
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">No organization selected</h3>
          <p className="mt-3 text-slate-600">
            Create your first organization to unlock team workspace and agency
            dashboard.
          </p>
        </div>
      )}
    </section>
  );
}
