import {
  createScheduledScanTargetAction,
  runScheduledScanNowAction,
  saveEmailAlertPreferencesAction,
  updateScheduledScanStatusAction,
} from "@/app/scheduled-scans/actions";

type ScanOption = { id: string; website_url: string };

type Target = {
  id: string;
  target_url: string;
  target_name: string;
  schedule_status: string;
  schedule_frequency: string;
  next_run_at: string | null;
  last_run_at: string | null;
  email_alerts_enabled: boolean;
  risk_threshold: string;
};

type Run = {
  id: string;
  run_status: string;
  risk_level: string;
  risk_score: number;
  summary: string;
  detected_change_summary: string;
  safe_next_action: string;
  email_should_send: boolean;
  email_reason: string;
  created_at: string;
};

type Alert = {
  id: string;
  alert_type: string;
  alert_status: string;
  severity: string;
  alert_title: string;
  client_safe_summary: string;
  developer_action: string;
  created_at: string;
};

type Email = {
  id: string;
  recipient_email: string;
  email_subject: string;
  email_type: string;
  delivery_status: string;
  created_at: string;
};

type Prefs = {
  alert_email: string;
  alert_status: string;
  send_scan_summary: boolean;
  send_high_risk_alerts: boolean;
  send_regression_alerts: boolean;
  send_billing_alerts: boolean;
  send_weekly_digest: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
} | null;

function badgeClass(value: string) {
  if (
    ["active", "completed", "sent", "Low", "Info", "resolved"].includes(value)
  )
    return "bg-emerald-100 text-emerald-950";
  if (
    ["queued", "provider-not-configured", "Medium", "open", "paused"].includes(
      value,
    )
  )
    return "bg-amber-100 text-amber-950";
  if (["Critical", "High", "failed", "disabled"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export function ScheduledScansPanel({
  scans,
  targets,
  selectedTarget,
  runs,
  alerts,
  emails,
  prefs,
  message,
}: {
  scans: ScanOption[];
  targets: Target[];
  selectedTarget?: Target | null;
  runs: Run[];
  alerts: Alert[];
  emails: Email[];
  prefs: Prefs;
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
        <p className="text-sm font-black text-blue-700">Mega Part 69</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Scheduled Scans + Email Alerts
        </h1>
        <p className="mt-4 max-w-4xl leading-8 text-blue-900">
          Safe scheduled monitoring, alert preferences and email queue for
          high-risk or regression updates.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-8">
          <form
            action={createScheduledScanTargetAction}
            className="rounded-3xl border border-slate-200 bg-white p-8"
          >
            <h2 className="text-2xl font-black">Create scheduled scan</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Existing scan optional
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
                Target URL
                <input
                  name="targetUrl"
                  placeholder="example.com"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-slate-700">
                Target name
                <input
                  name="targetName"
                  placeholder="Main website"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-slate-700">
                Frequency
                <select
                  name="frequency"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-black text-slate-700">
                Preferred hour
                <input
                  name="preferredHour"
                  type="number"
                  min="0"
                  max="23"
                  defaultValue="9"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-slate-700">
                Timezone
                <input
                  name="timezone"
                  defaultValue="Asia/Kolkata"
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-slate-700">
                Alert email
                <input
                  name="alertEmail"
                  type="email"
                  defaultValue={prefs?.alert_email || ""}
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-slate-700">
                Risk threshold
                <select
                  name="riskThreshold"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="Critical">Critical only</option>
                  <option value="High">High and above</option>
                  <option value="Medium">Medium and above</option>
                  <option value="Low">Low and above</option>
                </select>
              </label>
            </div>

            <label className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
              <input name="authorizationConfirmed" type="checkbox" />
              <span>
                I confirm I own this website or have written permission for safe
                scheduled checks.
              </span>
            </label>

            <label className="mt-3 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
              <input name="emailAlertsEnabled" type="checkbox" defaultChecked />
              <span>Enable email alerts for this scheduled target.</span>
            </label>

            <label className="mt-5 grid gap-2 text-sm font-black text-slate-700">
              Authorization note optional
              <textarea
                name="authorizationNote"
                rows={3}
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>

            <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
              Scheduled scans are safe monitoring checks only. No unauthorized,
              aggressive, exploit or destructive testing.
            </div>

            <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Create Schedule
            </button>
          </form>

          {selectedTarget ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-black text-slate-500">
                    Selected target
                  </p>
                  <h2 className="mt-2 break-all text-2xl font-black">
                    {selectedTarget.target_url}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedTarget.schedule_frequency} · next{" "}
                    {selectedTarget.next_run_at
                      ? new Date(selectedTarget.next_run_at).toLocaleString()
                      : "not set"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-4 py-2 text-sm font-black ${badgeClass(selectedTarget.schedule_status)}`}
                >
                  {selectedTarget.schedule_status}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <form action={runScheduledScanNowAction}>
                  <input
                    type="hidden"
                    name="targetId"
                    value={selectedTarget.id}
                  />
                  <button className="rounded-full bg-blue-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-900">
                    Run Safe Check Now
                  </button>
                </form>

                {["active", "paused", "disabled"].map((status) => (
                  <form key={status} action={updateScheduledScanStatusAction}>
                    <input
                      type="hidden"
                      name="targetId"
                      value={selectedTarget.id}
                    />
                    <input type="hidden" name="scheduleStatus" value={status} />
                    <button className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-50">
                      Mark {status}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Recent scheduled runs</h2>
            <div className="mt-6 grid gap-4">
              {runs.length ? (
                runs.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="font-black">Risk {run.risk_score}/100</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {run.summary}
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-700">
                          {run.safe_next_action}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(run.risk_level)}`}
                        >
                          {run.risk_level}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(run.run_status)}`}
                        >
                          {run.run_status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No scheduled runs yet.</p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <form
            action={saveEmailAlertPreferencesAction}
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-xl font-black">Email preferences</h2>
            <label className="mt-5 grid gap-2 text-sm font-black text-slate-700">
              Alert email
              <input
                name="alertEmail"
                type="email"
                defaultValue={prefs?.alert_email || ""}
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-black text-slate-700">
              Status
              <select
                name="alertStatus"
                defaultValue={prefs?.alert_status || "enabled"}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="enabled">Enabled</option>
                <option value="paused">Paused</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            {[
              [
                "sendScanSummary",
                "Scan summaries",
                prefs?.send_scan_summary ?? true,
              ],
              [
                "sendHighRiskAlerts",
                "High-risk alerts",
                prefs?.send_high_risk_alerts ?? true,
              ],
              [
                "sendRegressionAlerts",
                "Regression alerts",
                prefs?.send_regression_alerts ?? true,
              ],
              [
                "sendBillingAlerts",
                "Billing alerts",
                prefs?.send_billing_alerts ?? true,
              ],
              [
                "sendWeeklyDigest",
                "Weekly digest",
                prefs?.send_weekly_digest ?? true,
              ],
            ].map(([name, label, checked]) => (
              <label
                key={String(name)}
                className="mt-3 flex gap-3 text-sm font-bold text-slate-700"
              >
                <input
                  name={String(name)}
                  type="checkbox"
                  defaultChecked={Boolean(checked)}
                />
                <span>{String(label)}</span>
              </label>
            ))}
            <label className="mt-3 flex gap-3 text-sm font-bold text-slate-700">
              <input
                name="quietHoursEnabled"
                type="checkbox"
                defaultChecked={prefs?.quiet_hours_enabled || false}
              />
              <span>Quiet hours</span>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                name="quietHoursStart"
                defaultValue={prefs?.quiet_hours_start || "22:00"}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <input
                name="quietHoursEnd"
                defaultValue={prefs?.quiet_hours_end || "07:00"}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>
            <button className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
              Save Preferences
            </button>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Targets</h2>
            <div className="mt-5 grid gap-3">
              {targets.length ? (
                targets.map((target) => (
                  <a
                    key={target.id}
                    href={`/scheduled-scans?target=${target.id}`}
                    className="rounded-2xl bg-slate-50 p-4 hover:bg-slate-100"
                  >
                    <p className="break-all font-black">
                      {target.target_name || target.target_url}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-600">
                      {target.target_url}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${badgeClass(target.schedule_status)}`}
                    >
                      {target.schedule_status}
                    </span>
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-600">No targets yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Alerts</h2>
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
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No alerts yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Email queue</h2>
            <div className="mt-5 grid gap-3">
              {emails.length ? (
                emails.map((email) => (
                  <div key={email.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(email.delivery_status)}`}
                    >
                      {email.delivery_status}
                    </span>
                    <p className="mt-3 break-all font-black">
                      {email.email_subject}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-600">
                      {email.recipient_email}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  No email queue items yet.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
