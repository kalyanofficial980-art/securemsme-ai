import {
  changePlanAction,
  ensureBillingProfileAction,
  runAiTriageAction,
} from "@/app/billing-ai-triage/actions";

type Plan = {
  plan_key: string;
  plan_name: string;
  monthly_price_inr: number;
  monthly_price_usd: number;
  scan_limit: number;
  website_limit: number;
  report_limit: number;
  client_portal_limit: number;
  monitoring_target_limit: number;
  ai_triage_limit: number;
  team_member_limit: number;
  plan_description: string;
};

type Profile = {
  id: string;
  plan_key: string;
  billing_status: string;
  current_period_start: string;
  current_period_end: string;
  billing_summary: string;
  limit_summary: string;
};

type Counter = {
  scans_used: number;
  websites_used: number;
  reports_used: number;
  client_portals_used: number;
  monitoring_targets_used: number;
  ai_triage_used: number;
};

type Run = {
  id: string;
  target_url: string;
  total_item_count: number;
  urgent_count: number;
  high_priority_count: number;
  quick_win_count: number;
  needs_review_count: number;
  triage_score: number;
  business_impact_score: number;
  remediation_efficiency_score: number;
  confidence_score: number;
  executive_summary: string;
  developer_summary: string;
  client_safe_summary: string;
  limitations_summary: string;
  created_at: string;
};

type Item = {
  id: string;
  item_title: string;
  item_status: string;
  priority: string;
  severity: string;
  confidence_level: string;
  triage_rank: number;
  triage_score: number;
  business_impact_score: number;
  fix_effort_score: number;
  confidence_score: number;
  affected_area: string;
  reason_summary: string;
  developer_action: string;
  client_safe_note: string;
  blocked_claim: string;
};

type Event = {
  id: string;
  title: string;
  details: string;
  created_at: string;
};

function badgeClass(value: string) {
  if (["active", "allowed", "Low", "Quick Win", "Info"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["warning", "Medium", "Needs Review"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["blocked", "Urgent", "High", "Critical"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

function ScoreCard({
  label,
  score,
  helper,
}: {
  label: string;
  score: number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-black text-slate-500">{label}</p>
      <p className="mt-3 text-5xl font-black text-slate-950">{score}</p>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-950"
          style={{ width: `${Math.max(3, Math.min(100, score))}%` }}
        />
      </div>
      {helper ? (
        <p className="mt-3 text-sm font-bold text-slate-600">{helper}</p>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const percentage =
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex justify-between gap-3">
        <p className="text-sm font-black text-slate-700">{label}</p>
        <p className="text-sm font-black text-slate-500">
          {used}/{limit}
        </p>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-950"
          style={{ width: `${Math.max(3, percentage)}%` }}
        />
      </div>
    </div>
  );
}

export function BillingAiTriagePanel({
  scanId,
  targetUrl,
  plans,
  profile,
  counter,
  selectedPlan,
  runs,
  selectedRun,
  items,
  events,
  message,
}: {
  scanId?: string;
  targetUrl?: string;
  plans: Plan[];
  profile?: Profile | null;
  counter?: Counter | null;
  selectedPlan?: Plan | null;
  runs: Run[];
  selectedRun?: Run | null;
  items: Item[];
  events: Event[];
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
        <p className="text-sm font-black text-blue-700">Mega Part 65</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Billing + AI Triage + Usage Limits
        </h1>
        <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
          {targetUrl || "Account-level billing and triage"}
        </p>
        <p className="mt-4 max-w-3xl leading-8 text-blue-900">
          Manage plan limits, usage metering and safe rule-based AI triage
          prioritization.
        </p>
      </div>

      {!profile ? (
        <form
          action={ensureBillingProfileAction}
          className="rounded-3xl border border-slate-200 bg-white p-8"
        >
          <h2 className="text-2xl font-black">Create billing profile</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Creates a free billing profile and current-period usage counter.
            Payment processor integration is not enabled in this foundation.
          </p>
          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Create Billing Profile
          </button>
        </form>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <form
            key={plan.plan_key}
            action={changePlanAction}
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >
            <input type="hidden" name="planKey" value={plan.plan_key} />
            <div className="flex justify-between gap-3">
              <h2 className="text-xl font-black">{plan.plan_name}</h2>
              {profile?.plan_key === plan.plan_key ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-950">
                  Current
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-3xl font-black">
              ₹{plan.monthly_price_inr}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {plan.plan_description}
            </p>
            <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
              <p>Scans: {plan.scan_limit}</p>
              <p>Websites: {plan.website_limit}</p>
              <p>Reports: {plan.report_limit}</p>
              <p>AI triage: {plan.ai_triage_limit}</p>
            </div>
            <button className="mt-5 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100">
              Set Plan
            </button>
          </form>
        ))}
      </div>

      {profile && selectedPlan ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black text-slate-500">
                Current billing profile
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {selectedPlan.plan_name} plan
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                {profile.billing_summary || "Billing foundation is active."}
              </p>
            </div>
            <span
              className={`h-fit rounded-full px-4 py-2 text-sm font-black ${badgeClass(profile.billing_status)}`}
            >
              {profile.billing_status}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <UsageBar
              label="Scans"
              used={counter?.scans_used || 0}
              limit={selectedPlan.scan_limit}
            />
            <UsageBar
              label="Reports"
              used={counter?.reports_used || 0}
              limit={selectedPlan.report_limit}
            />
            <UsageBar
              label="Client portals"
              used={counter?.client_portals_used || 0}
              limit={selectedPlan.client_portal_limit}
            />
            <UsageBar
              label="Monitoring targets"
              used={counter?.monitoring_targets_used || 0}
              limit={selectedPlan.monitoring_target_limit}
            />
            <UsageBar
              label="AI triage"
              used={counter?.ai_triage_used || 0}
              limit={selectedPlan.ai_triage_limit}
            />
            <UsageBar
              label="Websites"
              used={counter?.websites_used || 0}
              limit={selectedPlan.website_limit}
            />
          </div>
        </div>
      ) : null}

      {scanId ? (
        <form
          action={runAiTriageAction}
          className="rounded-3xl border border-slate-200 bg-white p-8"
        >
          <input type="hidden" name="scanId" value={scanId} />
          <h2 className="text-2xl font-black">Run safe AI triage</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Prioritizes developer tasks, monitoring alerts, retest items and
            workspace bugs. This is a rule-based prioritization aid, not a
            vulnerability confirmation system.
          </p>
          <button className="mt-6 rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
            Run AI Triage
          </button>
        </form>
      ) : null}

      {selectedRun ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <ScoreCard
              label="Triage Score"
              score={selectedRun.triage_score}
              helper="Priority strength"
            />
            <ScoreCard
              label="Business Impact"
              score={selectedRun.business_impact_score}
              helper="Business risk"
            />
            <ScoreCard
              label="Efficiency"
              score={selectedRun.remediation_efficiency_score}
              helper="Quick wins"
            />
            <ScoreCard
              label="Confidence"
              score={selectedRun.confidence_score}
              helper="Evidence confidence"
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-3xl font-black">AI triage summary</h2>
            <p className="mt-4 max-w-4xl leading-8 text-slate-700">
              {selectedRun.executive_summary}
            </p>
            <p className="mt-2 max-w-4xl leading-7 text-slate-600">
              {selectedRun.developer_summary}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <MiniStat label="Total" value={selectedRun.total_item_count} />
              <MiniStat label="Urgent" value={selectedRun.urgent_count} />
              <MiniStat label="High" value={selectedRun.high_priority_count} />
              <MiniStat
                label="Quick wins"
                value={selectedRun.quick_win_count}
              />
              <MiniStat label="Review" value={selectedRun.needs_review_count} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">
              Prioritized remediation order
            </h2>
            <div className="mt-6 grid gap-5">
              {items.length ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          Rank #{item.triage_rank} · {item.confidence_level} ·
                          score {item.triage_score}/100
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          {item.item_title}
                        </h3>
                        <p className="mt-2 break-all text-sm font-bold text-slate-600">
                          {item.affected_area}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.priority)}`}
                        >
                          {item.priority}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.severity)}`}
                        >
                          {item.severity}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                        <p className="font-black">Reason</p>
                        <p className="mt-2">{item.reason_summary}</p>
                      </div>
                      <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                        <p className="font-black">Developer action</p>
                        <p className="mt-2">{item.developer_action}</p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                        <p className="font-black">Client note</p>
                        <p className="mt-2">{item.client_safe_note}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                      Blocked claim: {item.blocked_claim}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No triage items yet.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent triage runs</h2>
          <div className="mt-6 grid gap-4">
            {runs.length ? (
              runs.map((run) => (
                <a
                  key={run.id}
                  href={
                    scanId
                      ? `/report/${scanId}/billing-ai-triage?run=${run.id}`
                      : `/billing-ai-triage?run=${run.id}`
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
                >
                  <p className="font-black">
                    Triage {run.triage_score}/100 · items {run.total_item_count}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    urgent {run.urgent_count} · high {run.high_priority_count} ·
                    quick wins {run.quick_win_count}
                  </p>
                </a>
              ))
            ) : (
              <p className="text-slate-600">No AI triage runs yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Billing / triage events</h2>
          <div className="mt-6 grid gap-3">
            {events.length ? (
              events.map((event) => (
                <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black">{event.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {event.details}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No events yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
