import Link from "next/link";

type AdvancedReportNavigationProps = {
  scanId: string;
  variant?: "full" | "compact";
};

const links = [
  {
    label: "Customer Value Report",
    description: "Before/after score, fix workflow, proof-of-fix tracking",
    href: (id: string) => `/report/${id}/customer-value`,
    primary: true,
  },
  {
    label: "Vulnerability Intelligence",
    description:
      "Tech stack, attack surface, version exposure, confidence labels",
    href: (id: string) => `/report/${id}/vulnerability-intelligence`,
    primary: true,
  },
  {
    label: "Evidence Calibration",
    description: "False-positive guard, confirmed evidence, safe claims",
    href: (id: string) => `/report/${id}/evidence-calibration`,
    primary: true,
  },
  {
    label: "Inbuilt Advanced Audit",
    description: "Customer-ready evidence, modules, priority fixes",
    href: (id: string) => `/report/${id}/inbuilt`,
    primary: false,
  },
  {
    label: "OWASP/ASVS Mapping",
    description: "Control mapping, maturity score, executive actions",
    href: (id: string) => `/report/${id}/advanced`,
    primary: false,
  },
  {
    label: "Printable Report",
    description: "Clean printable customer report",
    href: (id: string) => `/report/${id}/print`,
    primary: false,
  },
  {
    label: "PDF Download",
    description: "Download/share professional report",
    href: (id: string) => `/api/report/${id}/pdf`,
    primary: false,
  },
  {
    label: "Developer Fix Roadmap",
    description: "Technical action list for developer handoff",
    href: (id: string) => `/report/${id}/fix-roadmap`,
    primary: false,
  },
];

export function AdvancedReportNavigation({
  scanId,
  variant = "full",
}: AdvancedReportNavigationProps) {
  if (variant === "compact") {
    return (
      <div className="mt-5 flex flex-wrap gap-3">
        {links.slice(0, 5).map((item) => (
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
            Advanced security intelligence
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Open deeper audit reports
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            This is where SecureMSME AI becomes useful after the scan: customer
            value report, before/after tracking, vulnerability intelligence,
            evidence calibration, inbuilt audit evidence, OWASP/ASVS mapping,
            PDF, and developer handoff.
          </p>
        </div>

        <Link
          href={`/report/${scanId}/customer-value`}
          className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          Open customer value report
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {links.map((item) => (
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
