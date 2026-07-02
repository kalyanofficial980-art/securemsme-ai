import Link from "next/link";

type AdvancedReportNavigationProps = {
  scanId: string;
  variant?: "full" | "compact";
};
type NavItem = {
  label: string;
  description: string;
  href: (id: string) => string;
  primary?: boolean;
};

const launchCustomerLinks: NavItem[] = [
  {
    label: "Public Launch",
    description: "Landing, pricing and demo funnel",
    href: () => `/public-launch`,
    primary: true,
  },
  {
    label: "Onboarding",
    description: "Customer setup, first scan funnel and plan recommendation",
    href: () => `/onboarding`,
    primary: true,
  },
  {
    label: "Security Scan",
    description: "Run authorized safe website checks and review security risks",
    href: (id) => `/report/${id}`,
    primary: true,
  },
  {
    label: "AI Copilot",
    description: "Ask safe questions over reports, fixes and client wording",
    href: (id) => `/report/${id}/ai-copilot`,
    primary: true,
  },
  {
    label: "Repo Security",
    description: "Dependency and masked secret review for code-side risk",
    href: (id) => `/report/${id}/repo-security`,
    primary: true,
  },
  {
    label: "Cloud Config",
    description: "Supabase, Vercel and DNS launch security checklist",
    href: (id) => `/report/${id}/cloud-config-audit`,
    primary: true,
  },
  {
    label: "Reports",
    description:
      "Client-safe report, executive summary and evidence-backed findings",
    href: (id) => `/report/${id}/client-report-v4`,
    primary: true,
  },
  {
    label: "Developer Fixes",
    description:
      "Fix tasks, developer actions, comments and remediation workflow",
    href: (id) => `/report/${id}/developer-portal`,
    primary: true,
  },
  {
    label: "Retest Proof",
    description: "Verified-fix proof and client portal after remediation",
    href: (id) => `/report/${id}/retest-client-portal-pro`,
    primary: true,
  },
  {
    label: "Monitoring",
    description: "Regression alerts and post-fix monitoring",
    href: (id) => `/report/${id}/monitoring-pro`,
    primary: true,
  },
  {
    label: "Scheduled Scans",
    description: "Safe scheduled checks and email alert queue",
    href: (id) => `/report/${id}/scheduled-scans`,
    primary: true,
  },
  {
    label: "AI Triage",
    description: "Safe remediation priority order and usage-aware triage",
    href: (id) => `/report/${id}/billing-ai-triage`,
    primary: true,
  },
];

const launchAccountLinks: NavItem[] = [
  {
    label: "Pricing",
    description: "Plans and manual billing CTA",
    href: () => `/pricing`,
  },
  {
    label: "Demo Request",
    description: "Public demo request funnel",
    href: () => `/demo`,
  },
  {
    label: "Cloud Config Home",
    description: "All cloud config audit projects",
    href: () => `/cloud-config-audit`,
  },
  {
    label: "Repo Security Home",
    description: "All repository security projects",
    href: () => `/repo-security`,
  },
  {
    label: "AI Copilot Home",
    description: "All report copilot sessions",
    href: () => `/ai-copilot`,
  },
  {
    label: "Scheduled Scans Home",
    description: "All scheduled scan targets and email alerts",
    href: () => `/scheduled-scans`,
  },
  {
    label: "Manual Billing",
    description: "Manual payment approval and plan activation",
    href: () => `/manual-billing`,
  },
  {
    label: "Legal Acceptance",
    description: "Terms, privacy, acceptable use and disclaimer acceptance",
    href: () => `/legal-acceptance`,
  },
  {
    label: "Scan Authorization",
    description: "Confirm ownership or written permission before scanning",
    href: () => `/scan-authorization`,
  },
  {
    label: "Trust Center",
    description: "Legal pages, security policy and responsible disclosure",
    href: () => `/trust`,
  },
];

const internalLinks: NavItem[] = [
  {
    label: "Demo Funnel Admin",
    description: "Public demo and pricing lead observability",
    href: () => `/admin/demo-funnel`,
  },
  {
    label: "Customer Onboarding Admin",
    description: "Internal onboarding funnel observability",
    href: () => `/admin/onboarding`,
  },
  {
    label: "Production Launch",
    description: "Internal benchmark and launch readiness dashboard",
    href: () => `/production-launch`,
  },
  {
    label: "Agency SOC",
    description: "Agency multi-client monitoring view",
    href: () => `/agency-soc`,
  },
  {
    label: "Advanced Tools",
    description: "Internal engine and evidence workflows",
    href: (id) => `/report/${id}/evidence-warehouse`,
  },
];

export function AdvancedReportNavigation({
  scanId,
  variant = "full",
}: AdvancedReportNavigationProps) {
  const compactLinks = [...launchCustomerLinks, ...launchAccountLinks];

  if (variant === "compact") {
    return (
      <div className="mt-5 flex flex-wrap gap-3">
        {compactLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href(scanId)}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
          >
            {item.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black text-slate-500">
            Launch-ready customer workflow
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Simple AI security workflow
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Customer UI is simplified into public launch funnel, onboarding,
            scan, AI copilot, repo security, cloud config, report, developer
            fixes, retest proof, scheduled monitoring, billing and support.
          </p>
        </div>
        <Link
          href="/public-launch"
          className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          Public Launch
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {launchCustomerLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href(scanId)}
            className="rounded-3xl border border-slate-950 bg-slate-950 p-6 text-white hover:bg-slate-800"
          >
            <h3 className="font-black">{item.label}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {item.description}
            </p>
          </Link>
        ))}

        {launchAccountLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href(scanId)}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-6 hover:bg-slate-100"
          >
            <h3 className="font-black">{item.label}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
          </Link>
        ))}
      </div>

      <details className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <summary className="cursor-pointer font-black text-amber-950">
          Advanced/internal tools
        </summary>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {internalLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href(scanId)}
              className="rounded-2xl bg-white p-4 hover:bg-amber-100"
            >
              <h3 className="font-black">{item.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </details>
    </section>
  );
}
