import {
  generateAlertsFromMonitoring,
  processPendingAlertNotifications,
  saveAlertPreferences,
} from "@/app/report/[id]/alerts/actions";

type AlertPreference = {
  id: string;
  status: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  recipient_email?: string | null;
  min_severity: string;
  alert_types: string[];
  created_at: string;
};

type Notification = {
  id: string;
  channel: string;
  recipient?: string | null;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  delivery_mode: string;
  action_url?: string | null;
  created_at: string;
};

type Attempt = {
  id: string;
  channel: string;
  provider: string;
  attempt_number: number;
  status: string;
  created_at: string;
};

function severityClass(value: string) {
  if (value === "Critical") return "bg-red-100 text-red-950";
  if (value === "High") return "bg-red-50 text-red-800";
  if (value === "Medium") return "bg-amber-50 text-amber-900";
  if (value === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

function statusClass(value: string) {
  if (value === "failed") return "border-red-200 bg-red-50 text-red-900";
  if (value === "queued") return "border-amber-200 bg-amber-50 text-amber-900";
  if (value === "sent")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}

export function AlertsPanel({
  scanId,
  websiteUrl,
  preferences,
  notifications,
  attempts,
  monitoringEventCount,
  message,
}: {
  scanId: string;
  websiteUrl: string;
  preferences?: AlertPreference | null;
  notifications: Notification[];
  attempts: Attempt[];
  monitoringEventCount: number;
  message?: string;
}) {
  const queued = notifications.filter(
    (item) => item.status === "queued",
  ).length;
  const sent = notifications.filter((item) => item.status === "sent").length;
  const email = notifications.filter((item) => item.channel === "email").length;
  const inApp = notifications.filter(
    (item) => item.channel === "in-app",
  ).length;

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
              Alerts + Email Notification Foundation
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Turn monitoring events into customer alerts
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Creates in-app alerts and email-ready notification queue from
              monitoring events. Email delivery is simulated in development
              until provider integration is added.
            </p>
          </div>
          <span className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black">
            {monitoringEventCount} monitoring events
          </span>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="break-all font-black">{websiteUrl}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Production email sending needs provider setup. This part creates the
            safe queue and delivery tracking first.
          </p>
        </div>

        <form
          action={saveAlertPreferences}
          className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6"
        >
          <input type="hidden" name="scanId" value={scanId} />

          <div className="grid gap-4 md:grid-cols-3">
            <label className="rounded-2xl border border-slate-200 bg-white p-4 font-bold">
              <input
                type="checkbox"
                name="inAppEnabled"
                defaultChecked={preferences?.in_app_enabled ?? true}
                className="mr-2"
              />
              In-app alerts
            </label>
            <label className="rounded-2xl border border-slate-200 bg-white p-4 font-bold">
              <input
                type="checkbox"
                name="emailEnabled"
                defaultChecked={preferences?.email_enabled ?? false}
                className="mr-2"
              />
              Email-ready queue
            </label>
            <label className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-black">Minimum severity</span>
              <select
                name="minSeverity"
                defaultValue={preferences?.min_severity || "Medium"}
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

          <label className="mt-5 block rounded-2xl border border-slate-200 bg-white p-4">
            <span className="font-black">Recipient email</span>
            <input
              name="recipientEmail"
              defaultValue={preferences?.recipient_email || ""}
              placeholder="customer@example.com"
              className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3"
            />
          </label>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              "score-drop",
              "risk-increase",
              "regression",
              "baseline-updated",
            ].map((type) => (
              <label
                key={type}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold"
              >
                <input
                  type="checkbox"
                  name="alertTypes"
                  value={type}
                  defaultChecked={(
                    preferences?.alert_types || [
                      "score-drop",
                      "risk-increase",
                      "regression",
                    ]
                  ).includes(type)}
                  className="mr-2"
                />
                {type}
              </label>
            ))}
          </div>

          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Save alert preferences
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-3">
          <form action={generateAlertsFromMonitoring}>
            <input type="hidden" name="scanId" value={scanId} />
            <button className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-black text-white hover:bg-emerald-800">
              Generate alerts from monitoring
            </button>
          </form>
          <form action={processPendingAlertNotifications}>
            <input type="hidden" name="scanId" value={scanId} />
            <button className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black hover:bg-slate-100">
              Process pending alerts
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Queued" value={queued} />
        <StatCard label="Sent" value={sent} />
        <StatCard label="In-app" value={inApp} />
        <StatCard label="Email-ready" value={email} />
      </div>

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <h3 className="text-2xl font-black text-blue-950">Alert truth</h3>
        <p className="mt-3 max-w-3xl leading-7 text-blue-900">
          Alerts are generated from monitoring events. They do not prove
          compromise, exploitation, or full continuous pentest coverage. Email
          delivery is development-simulated until provider setup is added.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Alert notifications</h3>
        <div className="mt-6 grid gap-4">
          {notifications.length ? (
            notifications.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {item.channel} · {item.alert_type} ·{" "}
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                    <h4 className="mt-1 font-black">{item.title}</h4>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                      {item.message}
                    </p>
                    {item.recipient ? (
                      <p className="mt-2 text-sm font-bold text-slate-500">
                        To: {item.recipient}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(item.severity)}`}
                    >
                      {item.severity}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No alert notifications yet.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h3 className="text-2xl font-black">Delivery attempts</h3>
        <div className="mt-6 grid gap-4">
          {attempts.length ? (
            attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="font-black">
                  {attempt.provider} · {attempt.channel}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Attempt {attempt.attempt_number} · {attempt.status} ·{" "}
                  {new Date(attempt.created_at).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No delivery attempts yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
