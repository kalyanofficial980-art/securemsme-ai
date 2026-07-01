import Link from "next/link";
import { customerReportLinks } from "@/lib/customer-language";

type AdvancedReportNavigationProps = {
  scanId: string;
  variant?: "full" | "compact";
};

export function AdvancedReportNavigation({
  scanId,
  variant = "full",
}: AdvancedReportNavigationProps) {
  const visibleLinks = customerReportLinks.filter(
    (item) => item.customerVisible,
  );

  if (variant === "compact") {
    return (
      <div className="mt-5 flex flex-wrap gap-3">
        {visibleLinks.slice(0, 6).map((item) => (
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
            Review your security score, create a fix plan, send clear tasks to
            your developer, and run a retest after fixes to show before/after
            proof.
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
