import Link from "next/link";
import { customerReportLinks } from "@/lib/customer-language";

type AdvancedReportNavigationProps = {
  scanId: string;
  variant?: "full" | "compact";
};

const launchCustomerLinks = [
  {
    label: "Security Scan",
    description: "Run authorized safe website checks and review security risks",
    href: (id: string) => `/report/${id}`,
    primary: true,
  },
  {
    label: "Reports",
    description:
      "Client-safe report, executive summary and evidence-backed findings",
    href: (id: string) => `/report/${id}/client-report-v4`,
    primary: true,
  },
  {
    label: "Developer Fixes",
    description:
      "Fix tasks, developer actions, comments and remediation workflow",
    href: (id: string) => `/report/${id}/developer-portal`,
    primary: true,
  },
  {
    label: "Retest Proof",
    description: "Verified-fix proof and client portal after remediation",
    href: (id: string) => `/report/${id}/retest-client-portal-pro`,
    primary: true,
  },
  {
    label: "Monitoring",
    description: "Regression alerts and post-fix monitoring",
    href: (id: string) => `/report/${id}/monitoring-pro`,
    primary: true,
  },
  {
    label: "AI Triage",
    description: "Safe remediation priority order and usage-aware triage",
    href: (id: string) => `/report/${id}/billing-ai-triage`,
    primary: true,
  },
];

const launchAccountLinks = [
  {
    label: "Manual Billing",
    description: "Manual payment approval and plan activation",
    href: (_id?: string) => `/manual-billing`,
  },
  {
    label: "Legal Acceptance",
    description: "Terms, privacy, acceptable use and disclaimer acceptance",
    href: (_id?: string) => `/legal-acceptance`,
  },
  {
    label: "Scan Authorization",
    description: "Confirm ownership or written permission before scanning",
    href: (_id?: string) => `/scan-authorization`,
  },
  {
    label: "Trust Center",
    description: "Legal pages, security policy and responsible disclosure",
    href: (_id?: string) => `/trust`,
  },
];

const internalLinks = [
  {
    label: "Production Launch",
    description: "Internal benchmark and launch readiness dashboard",
    href: (_id?: string) => `/production-launch`,
  },
  {
    label: "Agency SOC",
    description: "Agency multi-client monitoring view",
    href: (_id?: string) => `/agency-soc`,
  },
  {
    label: "Advanced Tools",
    description: "Internal engine and evidence workflows",
    href: (id: string) => `/report/${id}/evidence-warehouse`,
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
          <h2 className="mt-2 text-3xl font-black">Simple security workflow</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Customer UI is simplified into scan, report, developer fixes, retest
            proof, monitoring, billing and support. Internal engines stay behind
            advanced/admin routes.
          </p>
        </div>
        <Link
          href="/launch-ready"
          className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          Launch Ready
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
          {customerReportLinks.slice(0, 3).map((item) => (
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
