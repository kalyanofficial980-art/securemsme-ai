import {
  processPendingAlertEmails,
  saveEmailProviderSettings,
  sendTestEmail,
} from "@/app/report/[id]/email-delivery/actions";

type EmailSettings = {
  id: string;
  provider: string;
  enabled: boolean;
  from_email?: string | null;
  from_name?: string | null;
  reply_to?: string | null;
  recipient_email?: string | null;
  minimum_severity: string;
  send_regression_alerts: boolean;
  send_score_drop_alerts: boolean;
  send_risk_increase_alerts: boolean;
  send_weekly_summary: boolean;
  configuration_status: string;
  configuration_notes?: string | null;
  last_test_sent_at?: string | null;
  last_delivery_at?: string | null;
};

type DeliveryRun = {
  id: string;
  provider: string;
  delivery_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  provider_message_id?: string | null;
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
};

type EmailEvent = {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  details: string;
  created_at: string;
};

function statusClass(value: string) {
  if (value === "sent" || value === "ready")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (
    value === "failed" ||
    value === "missing-env" ||
    value === "provider-not-configured"
  )
    return "border-red-200 bg-red-50 text-red-900";
  if (value === "skipped") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function severityClass(value: string) {
  if (value === "Critical") return "bg-red-100 text-red-950";
  if (value === "High") return "bg-red-50 text-red-800";
  if (value === "Medium") return "bg-amber-50 text-amber-900";
  if (value === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

export function EmailProviderPanel({
  scanId,
  websiteUrl,
  userEmail,
  settings,
  deliveryRuns,
  events,
  envStatus,
  message,
}: {
  scanId: string;
  websiteUrl: string;
  userEmail: string;
  settings?: EmailSettings | null;
  deliveryRuns: DeliveryRun[];
  events: EmailEvent[];
  envStatus: {
    resendApiKeyConfigured: boolean;
    fromEmailConfigured: boolean;
    siteUrl: string;
  };
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
              Real Email Provider Integration
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Send monitoring alerts with Resend
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Connects email-ready alert queue to a real provider. API keys are
              stored only in environment variables, never in database.
            </p>
          </div>

          <span
            className={`rounded-2xl border px-4 py-3 font-black ${statusClass(settings?.configuration_status || "not-tested")}`}
          >
            {settings?.configuration_status || "not-tested"}
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="font-black">RESEND_API_KEY</p>
            <p className="mt-2 text-sm text-slate-600">
              {envStatus.resendApiKeyConfigured ? "configured" : "missing"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="font-black">From email env</p>
            <p className="mt-2 text-sm text-slate-600">
              {envStatus.fromEmailConfigured ? "configured" : "missing"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="font-black">Site URL</p>
            <p className="mt-2 break-all text-sm text-slate-600">
              {envStatus.siteUrl}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="font-black text-blue-950">
            Required .env.local for real send
          </p>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-white p-4 text-xs font-bold text-blue-900">
            {`EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
ALERT_FROM_EMAIL=alerts@yourdomain.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
          </pre>
        </div>

        <form
          action={saveEmailProviderSettings}
          className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6"
        >
          <input type="hidden" name="scanId" value={scanId} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Provider</span>
              <select
                name="provider"
                defaultValue={settings?.provider || "resend"}
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
              >
                <option value="resend">Resend</option>
                <option value="development">Development no-send</option>
              </select>
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Recipient email</span>
              <input
                name="recipientEmail"
                type="email"
                defaultValue={settings?.recipient_email || userEmail}
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              />
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">From email override</span>
              <input
                name="fromEmail"
                type="email"
                placeholder="optional, env fallback recommended"
                defaultValue={settings?.from_email || ""}
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              />
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">From name</span>
              <input
                name="fromName"
                defaultValue={settings?.from_name || "SecureMSME AI"}
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              />
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Reply to</span>
              <input
                name="replyTo"
                type="email"
                defaultValue={settings?.reply_to || ""}
                className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              />
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Minimum severity</span>
              <select
                name="minimumSeverity"
                defaultValue={settings?.minimum_severity || "Medium"}
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Info">Info</option>
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["enabled", "Enable email delivery", settings?.enabled ?? true],
              [
                "sendRegressionAlerts",
                "Send regression alerts",
                settings?.send_regression_alerts ?? true,
              ],
              [
                "sendScoreDropAlerts",
                "Send score drop alerts",
                settings?.send_score_drop_alerts ?? true,
              ],
              [
                "sendRiskIncreaseAlerts",
                "Send risk increase alerts",
                settings?.send_risk_increase_alerts ?? true,
              ],
              [
                "sendWeeklySummary",
                "Send weekly summary later",
                settings?.send_weekly_summary ?? false,
              ],
            ].map(([name, label, checked]) => (
              <label
                key={String(name)}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold"
              >
                <input
                  type="checkbox"
                  name={String(name)}
                  defaultChecked={Boolean(checked)}
                  className="mt-1"
                />
                <span>{String(label)}</span>
              </label>
            ))}
          </div>

          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Save email provider settings
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-3">
          <form action={sendTestEmail}>
            <input type="hidden" name="scanId" value={scanId} />
            <button className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-black text-white hover:bg-emerald-800">
              Send test email
            </button>
          </form>

          <form action={processPendingAlertEmails}>
            <input type="hidden" name="scanId" value={scanId} />
            <button className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black hover:bg-slate-100">
              Process pending alert emails
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Delivery runs</h3>
        <div className="mt-6 grid gap-4">
          {deliveryRuns.length ? (
            deliveryRuns.map((run) => (
              <div
                key={run.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {run.delivery_type} · {run.provider} ·{" "}
                      {new Date(run.created_at).toLocaleString()}
                    </p>
                    <h4 className="mt-1 font-black">{run.subject}</h4>
                    <p className="mt-2 break-all text-sm text-slate-600">
                      To: {run.recipient_email}
                    </p>
                    {run.provider_message_id ? (
                      <p className="mt-2 break-all text-xs font-bold text-emerald-700">
                        Provider ID: {run.provider_message_id}
                      </p>
                    ) : null}
                    {run.error_message ? (
                      <p className="mt-2 text-sm font-bold text-red-700">
                        {run.error_message}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(run.status)}`}
                  >
                    {run.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No email delivery runs yet.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Email provider events</h3>
        <div className="mt-6 grid gap-4">
          {events.length ? (
            events.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {event.event_type} ·{" "}
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                    <h4 className="mt-1 font-black">{event.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {event.details}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(event.severity)}`}
                  >
                    {event.severity}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No email provider events yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
