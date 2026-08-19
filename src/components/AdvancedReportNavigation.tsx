import Link from "next/link";

type AdvancedReportNavigationProps = {
  scanId: string;
  variant?: "full" | "compact";
};

type NavItem = {
  label: string;
  description: string;
  href: (id: string) => string;
};

const reportLinks: NavItem[] = [
  {
    label: "Security report",
    description: "Score, risk, findings and evidence",
    href: (id) => `/report/${id}`,
  },
  {
    label: "Fix roadmap",
    description: "Developer remediation priorities",
    href: (id) => `/report/${id}/fix-roadmap`,
  },
];

export function AdvancedReportNavigation({
  scanId,
  variant = "full",
}: AdvancedReportNavigationProps) {
  if (variant === "compact") {
    return (
      <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-4 text-sm">
        {reportLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href(scanId)}
            className="font-semibold text-blue-700 hover:text-blue-900"
          >
            {item.label} →
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="grid gap-0 md:grid-cols-[220px_1fr_auto] md:items-stretch">
        <div className="border-b border-slate-200 p-5 md:border-b-0 md:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Report workflow
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review findings, hand fixes to a developer, then retest from the website workspace.
          </p>
        </div>

        <div className="grid md:grid-cols-2">
          {reportLinks.map((item, index) => (
            <Link
              key={item.label}
              href={item.href(scanId)}
              className={`p-5 hover:bg-slate-50 ${index === 0 ? "border-b border-slate-200 md:border-b-0 md:border-r" : ""}`}
            >
              <p className="font-semibold text-slate-950">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-slate-200 p-5 md:border-l md:border-t-0">
          <Link href="/websites" className="text-sm font-semibold text-slate-700 hover:text-blue-700">
            Websites
          </Link>
          <Link href="/scan" className="text-sm font-semibold text-blue-700 hover:text-blue-900">
            New scan →
          </Link>
        </div>
      </div>
    </section>
  );
}
