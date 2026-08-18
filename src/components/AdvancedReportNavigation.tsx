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
    description: "Review score, risk, findings, and evidence.",
    href: (id) => `/report/${id}`,
  },
  {
    label: "Fix roadmap",
    description: "Developer-ready remediation steps and priorities.",
    href: (id) => `/report/${id}/fix-roadmap`,
  },
];

export function AdvancedReportNavigation({
  scanId,
  variant = "full",
}: AdvancedReportNavigationProps) {
  if (variant === "compact") {
    return (
      <div className="mt-5 flex flex-wrap gap-3">
        {reportLinks.map((item) => (
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
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">
            VeyraSec workspace
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Security workflow
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Review the security report, prioritize fixes, then return to the
            website workspace to rescan or verify ownership.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Dashboard
          </Link>

          <Link
            href="/websites"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
          >
            Websites
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {reportLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href(scanId)}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-6 hover:bg-slate-100"
          >
            <h3 className="text-lg font-black">{item.label}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        <Link
          href="/scan"
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black hover:bg-slate-100"
        >
          Run another scan
        </Link>

        <Link
          href="/websites"
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black hover:bg-slate-100"
        >
          Verify or manage website
        </Link>
      </div>
    </section>
  );
}
