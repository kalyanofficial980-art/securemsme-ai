import Link from "next/link";
import { customerReportLinks } from "@/lib/customer-language";

type AdvancedReportNavigationProps = {
  scanId: string;
  variant?: "full" | "compact";
};

const workflowLinks = [
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
  {
    label: "Security Review Workspace",
    description:
      "Create client workspace with bug lifecycle, developer fixes and retest tracking",
    href: (id: string) => `/report/${id}/security-review-workspace`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Vulnerability Scanner",
    description:
      "Run authorized bug finder with evidence, developer fixes and retest steps",
    href: (id: string) => `/report/${id}/vulnerability-scanner`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Client Portal",
    description: "Create shareable client-safe report access links",
    href: (id: string) => `/report/${id}/client-portal`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Developer Fix Plan",
    description: "Copy useful fix instructions for your website developer",
    href: (id: string) => `/report/${id}/fix-roadmap`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Retest Proof",
    description: "Show before and after evidence after developer fixes",
    href: (id: string) => `/report/${id}/retest-proof`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Monitoring Alerts",
    description: "Track score drift, risk regression and monitoring events",
    href: (id: string) => `/report/${id}/monitoring`,
    primary: true,
    customerVisible: true,
  },
];

const technicalLinks = [
  {
    label: "Truth Cleanup",
    description:
      "Remove generic/fake-looking wording with evidence-specific fixes",
    href: (id: string) => `/report/${id}/truth-cleanup`,
    primary: false,
    customerVisible: true,
  },
  {
    label: "Score Explanation",
    description:
      "Explain score changes, latest scan status and old-vs-new differences",
    href: (id: string) => `/report/${id}/scan-consistency`,
    primary: false,
    customerVisible: true,
  },
  {
    label: "API Security Scanner",
    description:
      "OpenAPI/Swagger discovery, endpoint inventory and API Top 10 mapping",
    href: (id: string) => `/report/${id}/api-security`,
    primary: false,
    customerVisible: true,
  },
  {
    label: "Browser Security Analyzer",
    description:
      "CSP, CORS, cookies, clickjacking, HSTS and client-side signals",
    href: (id: string) => `/report/${id}/browser-security`,
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
        {visibleLinks.slice(0, 30).map((item) => (
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
            Advanced proof-backed workflow
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Orchestrate, prove, validate, fix and retest
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Use Scan Orchestrator to run engines, Evidence Warehouse to build
            proof chain, Accuracy Foundation to validate claims, then Workspace,
            Retest and Client Portal for delivery.
          </p>
        </div>

        <Link
          href={`/report/${scanId}/evidence-warehouse`}
          className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          Sync Evidence
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
