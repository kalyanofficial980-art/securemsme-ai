import Link from "next/link";
import {
  createBetaCustomerAction,
  queueLaunchNotificationAction,
  updateLaunchChecklistItemAction,
} from "@/app/launch-ops/actions";
import { launchReadinessScore } from "@/lib/final-launch-ops-engine";

type ChecklistItem = {
  id: string;
  check_title: string;
  category: string;
  check_status: "pending" | "in-progress" | "done" | "blocked" | "later";
  priority: string;
  owner_note: string;
};

function badge(value: string) {
  if (
    [
      "done",
      "active",
      "safe-draft",
      "sent-manual",
      "Beta-launch ready",
    ].includes(value)
  )
    return "bg-emerald-100 text-emerald-950";
  if (
    [
      "pending",
      "in-progress",
      "later",
      "ready-for-manual-send",
      "Nearly ready",
      "Needs work",
    ].includes(value)
  )
    return "bg-amber-100 text-amber-950";
  if (["blocked", "failed", "needs-review", "Not ready"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export function FinalLaunchOpsPanel({
  checklist,
  betaCustomers,
  notifications,
  events,
  message,
}: {
  checklist: ChecklistItem[];
  betaCustomers: any[];
  notifications: any[];
  events: any[];
  message?: string;
}) {
  const readiness = launchReadinessScore(checklist);

  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <p className="text-sm font-black text-blue-700">Mega Part 76</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Final Launch Operations Pack
        </h1>
        <p className="mt-4 max-w-4xl leading-8 text-blue-900">
          Combined final pack for email queue foundation, lead CRM, CSV export,
          abuse protection, beta customers and launch checklist. Custom domain
          tasks are marked later.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black text-slate-500">Readiness</p>
          <p className="mt-2 text-4xl font-black">{readiness.score}%</p>
          <span
            className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-black ${badge(readiness.status)}`}
          >
            {readiness.status}
          </span>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black text-slate-500">Checklist</p>
          <p className="mt-2 text-4xl font-black">{checklist.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black text-slate-500">Beta customers</p>
          <p className="mt-2 text-4xl font-black">{betaCustomers.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black text-slate-500">Email drafts</p>
          <p className="mt-2 text-4xl font-black">{notifications.length}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Final launch checklist</h2>
          <div className="mt-6 grid gap-4">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${badge(item.check_status)}`}
                  >
                    {item.check_status}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                    {item.category}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                    {item.priority}
                  </span>
                </div>
                <p className="mt-3 font-black">{item.check_title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.owner_note}
                </p>
                <form
                  action={updateLaunchChecklistItemAction}
                  className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_auto]"
                >
                  <input type="hidden" name="itemId" value={item.id} />
                  <select
                    name="checkStatus"
                    defaultValue={item.check_status}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                  >
                    <option value="pending">pending</option>
                    <option value="in-progress">in-progress</option>
                    <option value="done">done</option>
                    <option value="blocked">blocked</option>
                    <option value="later">later</option>
                  </select>
                  <input
                    name="ownerNote"
                    defaultValue={item.owner_note || ""}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                  />
                  <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                    Update
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <form
            action={createBetaCustomerAction}
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-xl font-black">Add beta customer</h2>
            <div className="mt-4 grid gap-3">
              <input
                name="fullName"
                placeholder="Full name"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <input
                name="email"
                placeholder="email@example.com"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <input
                name="companyName"
                placeholder="Company"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <input
                name="websiteUrl"
                placeholder="https://example.com"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <select
                name="betaPlan"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
              >
                <option value="starter">starter</option>
                <option value="growth">growth</option>
                <option value="agency">agency</option>
                <option value="enterprise-review">enterprise-review</option>
              </select>
              <textarea
                name="onboardingNotes"
                placeholder="Onboarding notes"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <button className="rounded-full bg-blue-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-900">
                Create Beta
              </button>
            </div>
          </form>

          <form
            action={queueLaunchNotificationAction}
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-xl font-black">Queue manual notification</h2>
            <div className="mt-4 grid gap-3">
              <input
                name="toEmail"
                placeholder="to@example.com"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <input
                name="subject"
                placeholder="Subject"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <textarea
                name="body"
                placeholder="Manual email body. Do not include secrets."
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <button className="rounded-full bg-blue-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-900">
                Queue Manual Email
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Quick links</h2>
            <div className="mt-4 grid gap-3">
              <Link
                href="/admin/lead-crm"
                className="rounded-2xl bg-slate-50 p-4 text-sm font-black hover:bg-slate-100"
              >
                Lead CRM + Export
              </Link>
              <Link
                href="/admin/abuse-protection"
                className="rounded-2xl bg-slate-50 p-4 text-sm font-black hover:bg-slate-100"
              >
                Abuse Protection
              </Link>
              <Link
                href="/admin/support-inbox"
                className="rounded-2xl bg-slate-50 p-4 text-sm font-black hover:bg-slate-100"
              >
                Support Inbox
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Beta customers</h2>
          <div className="mt-5 grid gap-3">
            {betaCustomers.length ? (
              betaCustomers.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${badge(item.beta_status)}`}
                  >
                    {item.beta_status}
                  </span>
                  <p className="mt-3 font-black">
                    {item.full_name || item.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.company_name} · {item.beta_plan}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No beta customers yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Manual email queue</h2>
          <div className="mt-5 grid gap-3">
            {notifications.length ? (
              notifications.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${badge(item.notification_status)}`}
                  >
                    {item.notification_status}
                  </span>
                  <p className="mt-3 break-all font-black">{item.to_email}</p>
                  <p className="mt-2 text-sm font-bold">{item.subject}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.body_preview}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No manual notifications yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
