import Link from "next/link";
import {
  completeOnboardingAction,
  saveCustomerOnboardingProfileAction,
  saveFirstScanFunnelAction,
} from "@/app/onboarding/actions";

type Profile = {
  id: string;
  business_name: string;
  business_type: string;
  country: string;
  industry: string;
  team_size: string;
  primary_goal: string;
  security_maturity: string;
  onboarding_status: string;
  onboarding_progress: number;
  latest_recommended_plan: string;
  latest_summary?: string;
};

type Step = {
  id: string;
  step_key: string;
  step_title: string;
  step_status: string;
  step_order: number;
  step_summary: string;
  action_url: string;
  required_before_launch: boolean;
};

type Recommendation = {
  id: string;
  recommended_plan: string;
  recommendation_score: number;
  recommendation_reason: string;
  included_features: string[];
  next_best_action: string;
  billing_cta: string;
};

type Funnel = {
  id: string;
  website_url: string;
  ownership_status: string;
  funnel_status: string;
  next_action: string;
  client_safe_summary: string;
  created_at: string;
};

function badgeClass(value: string) {
  if (
    [
      "completed",
      "pass",
      "starter",
      "active",
      "ready-to-scan",
      "scan-linked",
    ].includes(value)
  )
    return "bg-emerald-100 text-emerald-950";
  if (
    ["pending", "plan-recommended", "growth", "needs-review", "draft"].includes(
      value,
    )
  )
    return "bg-amber-100 text-amber-950";
  if (["blocked", "enterprise-review", "agency"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export function CustomerOnboardingPanel({
  profile,
  steps,
  recommendation,
  funnels,
  message,
  mode = "profile",
}: {
  profile?: Profile | null;
  steps: Step[];
  recommendation?: Recommendation | null;
  funnels: Funnel[];
  message?: string;
  mode?: "profile" | "first-scan" | "success";
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <p className="text-sm font-black text-blue-700">Mega Part 72</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Customer Onboarding Wizard
        </h1>
        <p className="mt-4 max-w-4xl leading-8 text-blue-900">
          Guided first-time setup for business profile, legal reminder, website
          authorization, first scan funnel and plan recommendation.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {mode === "profile" ? (
            <form
              action={saveCustomerOnboardingProfileAction}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <h2 className="text-2xl font-black">Step 1 — Business profile</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Business name
                  <input
                    name="businessName"
                    defaultValue={profile?.business_name || ""}
                    placeholder="Your business name"
                    className="rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Business type
                  <select
                    name="businessType"
                    defaultValue={profile?.business_type || "msme"}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="msme">MSME</option>
                    <option value="startup">Startup</option>
                    <option value="agency">Agency</option>
                    <option value="freelancer">Freelancer</option>
                    <option value="ngo">NGO</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Country
                  <input
                    name="country"
                    defaultValue={profile?.country || "India"}
                    className="rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Industry
                  <input
                    name="industry"
                    defaultValue={profile?.industry || ""}
                    placeholder="Retail / SaaS / Healthcare / Education"
                    className="rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Team size
                  <select
                    name="teamSize"
                    defaultValue={profile?.team_size || "1-5"}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="1">1</option>
                    <option value="1-5">1-5</option>
                    <option value="6-20">6-20</option>
                    <option value="21-50">21-50</option>
                    <option value="51-200">51-200</option>
                    <option value="200+">200+</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Main goal
                  <select
                    name="primaryGoal"
                    defaultValue={
                      profile?.primary_goal || "first-security-check"
                    }
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="first-security-check">
                      First security check
                    </option>
                    <option value="client-report">Client report</option>
                    <option value="developer-fixes">Developer fixes</option>
                    <option value="scheduled-monitoring">
                      Scheduled monitoring
                    </option>
                    <option value="repo-security">Repo security</option>
                    <option value="cloud-config">Cloud config</option>
                    <option value="agency-workflow">Agency workflow</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Security maturity
                  <select
                    name="securityMaturity"
                    defaultValue={profile?.security_maturity || "beginner"}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="basic">Basic</option>
                    <option value="growing">Growing</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input name="legalAccepted" type="checkbox" />
                  <span>
                    I have completed or will complete legal acceptance.
                  </span>
                </label>
                <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input name="billingStarted" type="checkbox" />
                  <span>
                    I have started or will start manual billing if needed.
                  </span>
                </label>
              </div>

              <button className="mt-6 rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
                Save & Continue
              </button>
            </form>
          ) : null}

          {mode === "first-scan" ? (
            <form
              action={saveFirstScanFunnelAction}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <h2 className="text-2xl font-black">Step 2 — First scan setup</h2>
              {!profile ? (
                <div className="mt-5 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">
                  Create your business profile first.
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Website URL
                  <input
                    name="websiteUrl"
                    placeholder="https://example.com"
                    className="rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Authorization status
                  <select
                    name="ownershipStatus"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="confirmed-owner">
                      I own/administer this website
                    </option>
                    <option value="written-permission">
                      I have written permission
                    </option>
                    <option value="needs-review">Needs manual review</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Scan goal
                  <select
                    name="scanGoal"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="first-safe-check">First safe check</option>
                    <option value="client-report">Client report</option>
                    <option value="developer-fixes">Developer fixes</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="sales-demo">Sales demo</option>
                    <option value="agency-client">Agency client</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Risk tolerance
                  <select
                    name="riskTolerance"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="safe">Safe only</option>
                    <option value="standard">Standard safe checks</option>
                    <option value="manual-review">Manual review first</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input name="authorizationConfirmed" type="checkbox" />
                  <span>
                    I confirm ownership or written permission for this website.
                  </span>
                </label>
                <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input name="legalAccepted" type="checkbox" />
                  <span>
                    I accept that scanning must be authorized and safe.
                  </span>
                </label>
                <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input name="billingStarted" type="checkbox" />
                  <span>Billing can be completed after first scan review.</span>
                </label>
              </div>

              <label className="mt-5 grid gap-2 text-sm font-black text-slate-700">
                Authorization note optional
                <textarea
                  name="authorizationNote"
                  rows={3}
                  className="rounded-2xl border border-slate-300 px-4 py-3"
                  placeholder="Example: I am the website owner / client gave written permission."
                />
              </label>

              <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
                Only run scans on websites you own or have written permission to
                test.
              </div>

              <button className="mt-6 rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
                Prepare First Scan
              </button>
            </form>
          ) : null}

          {mode === "success" ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
              <h2 className="text-3xl font-black text-emerald-950">
                Onboarding ready ✅
              </h2>
              <p className="mt-4 leading-7 text-emerald-900">
                Your first scan funnel is ready. Open the dashboard, run the
                authorized safe scan, then review report, AI Copilot, fixes,
                scheduled scans, repo security and cloud config.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-emerald-950 px-6 py-3 text-sm font-black text-white hover:bg-emerald-900"
                >
                  Open Dashboard
                </Link>
                <Link
                  href="/manual-billing"
                  className="rounded-full bg-white px-6 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-100"
                >
                  Manual Billing
                </Link>
                <Link
                  href="/legal-acceptance"
                  className="rounded-full bg-white px-6 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-100"
                >
                  Legal Acceptance
                </Link>
              </div>
              {profile ? (
                <form action={completeOnboardingAction} className="mt-6">
                  <input type="hidden" name="profileId" value={profile.id} />
                  <button className="rounded-full border border-emerald-900 px-6 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-100">
                    Mark Onboarding Complete
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-black">First scan funnels</h2>
            <div className="mt-5 grid gap-3">
              {funnels.length ? (
                funnels.map((funnel) => (
                  <div key={funnel.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(funnel.funnel_status)}`}
                    >
                      {funnel.funnel_status}
                    </span>
                    <p className="mt-3 break-all font-black">
                      {funnel.website_url}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {funnel.client_safe_summary}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {funnel.next_action}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  No first scan funnel yet.
                </p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Progress</h2>
            <div className="mt-5">
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-950"
                  style={{ width: `${profile?.onboarding_progress || 0}%` }}
                />
              </div>
              <p className="mt-3 text-3xl font-black">
                {profile?.onboarding_progress || 0}%
              </p>
              <span
                className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${badgeClass(profile?.onboarding_status || "started")}`}
              >
                {profile?.onboarding_status || "started"}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Recommended plan</h2>
            {recommendation ? (
              <div className="mt-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(recommendation.recommended_plan)}`}
                >
                  {recommendation.recommended_plan} ·{" "}
                  {recommendation.recommendation_score}/100
                </span>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {recommendation.recommendation_reason}
                </p>
                <p className="mt-3 text-sm font-bold text-slate-800">
                  {recommendation.billing_cta}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {recommendation.included_features?.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Complete profile to get plan recommendation.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Steps</h2>
            <div className="mt-5 grid gap-3">
              {steps.length ? (
                steps.map((step) => (
                  <a
                    key={step.id}
                    href={step.action_url}
                    className="rounded-2xl bg-slate-50 p-4 hover:bg-slate-100"
                  >
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(step.step_status)}`}
                    >
                      {step.step_status}
                    </span>
                    <p className="mt-3 font-black">
                      {step.step_order}. {step.step_title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {step.step_summary}
                    </p>
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  Steps appear after saving profile.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
