import {
  createClientPortalLinkAction,
  refreshClientPortalSnapshotAction,
  revokeClientPortalLinkAction,
} from "@/app/report/[id]/client-portal/actions";

type PortalLink = {
  id: string;
  token: string;
  title: string;
  client_name?: string | null;
  client_email?: string | null;
  access_level: string;
  status: string;
  expires_at: string;
  view_count: number;
  last_viewed_at?: string | null;
  created_at: string;
};

type PortalEvent = {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  details: string;
  created_at: string;
};

function statusClass(status: string) {
  if (status === "active")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "revoked" || status === "expired")
    return "border-red-200 bg-red-50 text-red-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function portalUrl(token: string) {
  return `/client-portal/${token}`;
}

export function ClientPortalPanel({
  scanId,
  websiteUrl,
  score,
  riskLevel,
  links,
  events,
  message,
}: {
  scanId: string;
  websiteUrl: string;
  score: number;
  riskLevel: string;
  links: PortalLink[];
  events: PortalEvent[];
  message?: string;
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black text-slate-500">
              Client Portal + Shareable Report Access
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Create client-safe report links
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Share a safe report snapshot with clients without exposing admin
              tools, raw scanner internals, or private security evidence.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black">
            {score}/100 · {riskLevel}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="break-all font-black">{websiteUrl}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The portal snapshot has safe claims and blocked claims. It does not
            claim 100% security, full pentest coverage, or compliance
            certification.
          </p>
        </div>

        <form
          action={createClientPortalLinkAction}
          className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6"
        >
          <input type="hidden" name="scanId" value={scanId} />

          <h3 className="text-xl font-black">Create shareable client link</h3>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Portal title</span>
              <input
                name="title"
                defaultValue={`Security report for ${websiteUrl}`}
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              />
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Client name</span>
              <input
                name="clientName"
                placeholder="optional"
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              />
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Client email</span>
              <input
                name="clientEmail"
                type="email"
                placeholder="optional"
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              />
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Access level</span>
              <select
                name="accessLevel"
                defaultValue="report-hub"
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
              >
                <option value="summary-only">Summary only</option>
                <option value="report-hub">Report hub</option>
                <option value="monitoring-summary">Monitoring summary</option>
                <option value="full-client">Full client</option>
              </select>
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Expires in days</span>
              <input
                name="expiresInDays"
                type="number"
                min="1"
                max="90"
                defaultValue="14"
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              />
            </label>
          </div>

          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Create client portal link
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Shareable links</h3>
        <div className="mt-6 grid gap-4">
          {links.length ? (
            links.map((link) => (
              <div
                key={link.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="font-black">{link.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {link.access_level} · views {link.view_count} · expires{" "}
                      {new Date(link.expires_at).toLocaleString()}
                    </p>
                    <a
                      href={portalUrl(link.token)}
                      target="_blank"
                      className="mt-3 block break-all rounded-2xl bg-white p-3 text-sm font-bold text-blue-700 underline"
                    >
                      {portalUrl(link.token)}
                    </a>
                    {link.client_email ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Client: {link.client_email}
                      </p>
                    ) : null}
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(link.status)}`}
                  >
                    {link.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <form action={refreshClientPortalSnapshotAction}>
                    <input type="hidden" name="scanId" value={scanId} />
                    <input type="hidden" name="linkId" value={link.id} />
                    <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black hover:bg-slate-100">
                      Refresh snapshot
                    </button>
                  </form>

                  {link.status === "active" ? (
                    <form action={revokeClientPortalLinkAction}>
                      <input type="hidden" name="scanId" value={scanId} />
                      <input type="hidden" name="linkId" value={link.id} />
                      <button className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-black text-red-800 hover:bg-red-100">
                        Revoke
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
              No client portal links yet.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Portal access events</h3>
        <div className="mt-6 grid gap-4">
          {events.length ? (
            events.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-xs font-black uppercase text-slate-500">
                  {event.event_type} ·{" "}
                  {new Date(event.created_at).toLocaleString()}
                </p>
                <h4 className="mt-1 font-black">{event.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {event.details}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
              No portal events yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
