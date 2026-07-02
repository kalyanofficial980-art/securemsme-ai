import Link from "next/link";
import { customerReportLinks } from "@/lib/customer-language";

type AdvancedReportNavigationProps = {
  scanId: string;
  variant?: "full" | "compact";
};

const workflowLinks = [
  {
    label: "Billing + AI Triage",
    description:
      "Usage limits, safe AI triage and smart remediation priority order",
    href: (id: string) => `/report/${id}/billing-ai-triage`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Monitoring Pro",
    description:
      "Watch retest proof, fix progress, client readiness and regression alerts",
    href: (id: string) => `/report/${id}/monitoring-pro`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Retest + Client Portal Pro",
    description:
      "Create safe retest proof and generate shareable Client Portal Pro links",
    href: (id: string) => `/report/${id}/retest-client-portal-pro`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Developer Portal",
    description:
      "Create developer fix board, track remediation, comments and safe retest requests",
    href: (id: string) => `/report/${id}/developer-portal`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Client Report v4",
    description:
      "Generate executive dashboard, business impact, evidence strength and client-safe report sections",
    href: (id: string) => `/report/${id}/client-report-v4`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "API Security Review",
    description:
      "Discover API docs/specs, inventory endpoints and review auth/mutation/sensitive API risks",
    href: (id: string) => `/report/${id}/api-security-review`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Authenticated Safe Review",
    description:
      "Review approved login/account areas with safe observations and role comparisons",
    href: (id: string) => `/report/${id}/authenticated-safe-review`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Advanced Crawler",
    description:
      "Discover same-origin assets, forms, login/admin/API/checkout surfaces and asset fingerprints",
    href: (id: string) => `/report/${id}/advanced-crawler`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Advanced Vulnerability Engine",
    description:
      "Correlate findings, evidence, accuracy and workspace bugs into root-cause clusters",
    href: (id: string) => `/report/${id}/advanced-vulnerability-engine`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Evidence Warehouse",
    description:
      "Sync proof chain evidence from engines, findings and accuracy assessments",
    href: (id: string) => `/report/${id}/evidence-warehouse`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Scan Orchestrator",
    description:
      "Run controlled engine pipeline with coverage, logs, retry and safe execution boundaries",
    href: (id: string) => `/report/${id}/scan-orchestrator`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Accuracy Foundation",
    description:
      "Classify findings, score confidence, control false positives and target 99% confirmed-finding correctness",
    href: (id: string) => `/report/${id}/accuracy-foundation`,
    primary: true,
    customerVisible: true,
  },
];

const technicalLinks = [
  {
    label: "Production Launch",
    description:
      "Final accuracy benchmark, production checklist and launch readiness",
    href: () => `/production-launch`,
    primary: false,
    customerVisible: false,
  },
  {
    label: "Agency SOC",
    description: "View multi-client SOC dashboard and risk watchlist",
    href: () => `/agency-soc`,
    primary: false,
    customerVisible: false,
  },
  {
    label: "Billing Dashboard",
    description: "Manage plan limits and AI triage usage",
    href: () => `/billing-ai-triage`,
    primary: false,
    customerVisible: false,
  },
  {
    label: "Security Review Workspace",
    description:
      "Create client workspace with bug lifecycle, developer fixes and retest tracking",
    href: (id: string) => `/report/${id}/security-review-workspace`,
    primary: false,
    customerVisible: true,
  },
];

export function AdvancedReportNavigation({
  scanId,
  variant = "full",
}: AdvancedReportNavigationProps) {
  const visibleLinks = [
    ...workflowLinks,
    ...technicalLinks,
    ...customerReportLinks.filter((item) => item.customerVisible),
  ];

  if (variant === "compact") {
    return (
      <div className="mt-5 flex flex-wrap gap-3">
        {visibleLinks.slice(0, 47).map((item) => (
          <Link
            key={item.label}
            href={item.href(scanId)}
            className={
              item.primary
                ? "rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
                : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black hover:bg-slate-100"
            }
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
            Final production workflow
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Benchmark accuracy and confirm launch readiness
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Use Production Launch after all client, developer, monitoring,
            billing and triage workflows are complete.
          </p>
        </div>

        <Link
          href="/production-launch"
          className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          Production Launch
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href(scanId)}
            className={
              item.primary
                ? "rounded-3xl border border-slate-950 bg-slate-950 p-6 text-white hover:bg-slate-800"
                : "rounded-3xl border border-slate-200 bg-slate-50 p-6 hover:bg-slate-100"
            }
          >
            <h3 className="font-black">{item.label}</h3>
            <p
              className={
                item.primary
                  ? "mt-2 text-sm leading-6 text-slate-300"
                  : "mt-2 text-sm leading-6 text-slate-600"
              }
            >
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
