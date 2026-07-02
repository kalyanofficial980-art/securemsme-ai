import Link from "next/link";
import { customerReportLinks } from "@/lib/customer-language";

type AdvancedReportNavigationProps = {
  scanId: string;
  variant?: "full" | "compact";
};

const extraLinks = [
  {
    label: "Email Delivery",
    description:
      "Send real provider-backed email alerts and test notifications",
    href: (id: string) => `/report/${id}/email-delivery`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Continuous Monitoring",
    description: "Track score drift, risk regression and monitoring events",
    href: (id: string) => `/report/${id}/monitoring`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Truth Cleanup",
    description:
      "Remove generic/fake-looking wording with evidence-specific fixes",
    href: (id: string) => `/report/${id}/truth-cleanup`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Score Explanation",
    description:
      "Explain score changes, latest scan status and old-vs-new differences",
    href: (id: string) => `/report/${id}/scan-consistency`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "International Security Engine",
    description: "Advanced backend core: jobs, modules, evidence and lifecycle",
    href: (id: string) => `/report/${id}/security-engine`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Attack Surface Discovery",
    description:
      "Advanced crawler: routes, API signals, forms, inputs and JS routes",
    href: (id: string) => `/report/${id}/attack-surface`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "API Security Scanner",
    description:
      "OpenAPI/Swagger discovery, endpoint inventory and API Top 10 mapping",
    href: (id: string) => `/report/${id}/api-security`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Browser Security Analyzer",
    description:
      "CSP, CORS, cookies, clickjacking, HSTS and client-side signals",
    href: (id: string) => `/report/${id}/browser-security`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "GraphQL Risk Analyzer",
    description:
      "GraphQL endpoint, IDE, introspection, mutation and schema signals",
    href: (id: string) => `/report/${id}/graphql-risk`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Authenticated Safe Crawler",
    description:
      "Approved allowed-path route inventory with private evidence protection",
    href: (id: string) => `/report/${id}/authenticated-crawler`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Access Control Signals",
    description:
      "Broken access control, object ID and role-boundary metadata signals",
    href: (id: string) => `/report/${id}/access-control`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Authenticated Scan Request",
    description:
      "Request safe review for login-protected pages with a test account",
    href: (id: string) => `/report/${id}/authenticated-scan`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "Real Security Evidence",
    description: "Real HTTP, TLS, DNS, and controlled service evidence",
    href: (id: string) => `/report/${id}/real-modules`,
    primary: true,
    customerVisible: true,
  },
  {
    label: "CMS/WordPress Review",
    description:
      "WordPress, WooCommerce, plugin, theme, login and XML-RPC signals",
    href: (id: string) => `/report/${id}/cms-wordpress`,
    primary: true,
    customerVisible: true,
  },
];

export function AdvancedReportNavigation({
  scanId,
  variant = "full",
}: AdvancedReportNavigationProps) {
  const visibleLinks = [
    ...customerReportLinks.filter((item) => item.customerVisible),
    ...extraLinks,
  ];

  if (variant === "compact") {
    return (
      <div className="mt-5 flex flex-wrap gap-3">
        {visibleLinks.slice(0, 24).map((item) => (
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
            Website security report
          </p>
          <h2 className="mt-2 text-3xl font-black">What should you do next?</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Set up Email Delivery and Continuous Monitoring for ongoing alerts.
            Then review Truth Cleanup, score explanation and advanced security
            evidence.
          </p>
        </div>

        <Link
          href={`/report/${scanId}/security-hub`}
          className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          Open customer report hub
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
