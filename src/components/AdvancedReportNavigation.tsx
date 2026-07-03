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

const customerLinks: NavItem[] = [
  {
    label: "Launch",
    description: "Public product page",
    href: () => `/public-launch`,
    primary: true,
  },
  {
    label: "Pricing",
    description: "Plans and manual billing",
    href: () => `/pricing`,
    primary: true,
  },
  {
    label: "Demo",
    description: "Request product demo",
    href: () => `/demo`,
    primary: true,
  },
  {
    label: "Support",
    description: "Contact support",
    href: () => `/contact`,
    primary: true,
  },
  {
    label: "Beta",
    description: "Beta customer mode",
    href: () => `/beta`,
    primary: true,
  },
  {
    label: "Onboarding",
    description: "Guided first scan setup",
    href: () => `/onboarding`,
    primary: true,
  },
];

const productLinks: NavItem[] = [
  {
    label: "Scan",
    description: "Security scan report",
    href: (id) => `/report/${id}`,
  },
  {
    label: "AI Copilot",
    description: "Ask questions over reports",
    href: (id) => `/report/${id}/ai-copilot`,
  },
  {
    label: "Repo Security",
    description: "Dependency and secret review",
    href: (id) => `/report/${id}/repo-security`,
  },
  {
    label: "Cloud Config",
    description: "Supabase, Vercel and DNS checklist",
    href: (id) => `/report/${id}/cloud-config-audit`,
  },
  {
    label: "Client Report",
    description: "Client-ready report",
    href: (id) => `/report/${id}/client-report-v4`,
  },
  {
    label: "Developer Fixes",
    description: "Fix workflow",
    href: (id) => `/report/${id}/developer-portal`,
  },
  {
    label: "Retest",
    description: "Fix verification proof",
    href: (id) => `/report/${id}/retest-client-portal-pro`,
  },
  {
    label: "Monitoring",
    description: "Scheduled monitoring",
    href: (id) => `/report/${id}/monitoring-pro`,
  },
];

const adminLinks: NavItem[] = [
  {
    label: "Final Launch Ops",
    description: "Checklist, beta and manual queue",
    href: () => `/admin/launch-ops`,
  },
  {
    label: "Lead CRM",
    description: "Demo/support leads and export",
    href: () => `/admin/lead-crm`,
  },
  {
    label: "Support Inbox",
    description: "Tickets and reply drafts",
    href: () => `/admin/support-inbox`,
  },
  {
    label: "Abuse Protection",
    description: "Public form monitoring",
    href: () => `/admin/abuse-protection`,
  },
  {
    label: "Launch Analytics",
    description: "SEO and event analytics",
    href: () => `/admin/launch-analytics`,
  },
  {
    label: "Demo Funnel",
    description: "Demo request management",
    href: () => `/admin/demo-funnel`,
  },
];

function NavCard({
  item,
  scanId,
  dark = false,
}: {
  item: NavItem;
  scanId: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={item.href(scanId)}
      className={
        dark
          ? "rounded-3xl border border-slate-950 bg-slate-950 p-5 text-white hover:bg-slate-800"
          : "rounded-3xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
      }
    >
      <h3 className="font-black">{item.label}</h3>
      <p
        className={
          dark
            ? "mt-2 text-sm leading-6 text-slate-300"
            : "mt-2 text-sm leading-6 text-slate-600"
        }
      >
        {item.description}
      </p>
    </Link>
  );
}

export function AdvancedReportNavigation({
  scanId,
  variant = "full",
}: AdvancedReportNavigationProps) {
  if (variant === "compact") {
    return (
      <div className="mt-5 flex flex-wrap gap-3">
        {[...customerLinks, ...productLinks].map((item) => (
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
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">
            Workspace
          </p>
          <h2 className="mt-2 text-3xl font-black">SecureMSME AI navigation</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Customer journey, security workflow and admin operations in one
            clean structure.
          </p>
        </div>
        <Link
          href="/admin/launch-ops"
          className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          Launch ops
        </Link>
      </div>
      <div className="mt-8 space-y-8">
        <div>
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-500">
            Customer
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customerLinks.map((item) => (
              <NavCard key={item.label} item={item} scanId={scanId} dark />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-500">
            Product
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {productLinks.map((item) => (
              <NavCard key={item.label} item={item} scanId={scanId} />
            ))}
          </div>
        </div>
        <details className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <summary className="cursor-pointer font-black">
            Admin operations
          </summary>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {adminLinks.map((item) => (
              <NavCard key={item.label} item={item} scanId={scanId} />
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
