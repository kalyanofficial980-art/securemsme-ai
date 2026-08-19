import Link from "next/link";
import type { ReactNode } from "react";

export function SaaSCard({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-slate-200 bg-white p-6 ${className}`}
    >
      {title ? (
        <h2 className="text-lg font-bold tracking-[-0.02em] text-slate-950">
          {title}
        </h2>
      ) : null}
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
      {children ? (
        <div className={title || description ? "mt-5" : ""}>{children}</div>
      ) : null}
    </div>
  );
}

export function SaaSBadge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "amber" | "red" | "blue";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
  };
  return (
    <span
      className={`inline-flex border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SaaSMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <SaaSCard>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
      {hint ? (
        <p className="mt-2 text-xs text-slate-500">{hint}</p>
      ) : null}
    </SaaSCard>
  );
}

export function SaaSEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="border border-dashed border-slate-300 bg-white p-8 text-center">
      <h3 className="font-semibold">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function statusTone(
  value?: string,
): "slate" | "green" | "amber" | "red" | "blue" {
  const v = (value || "").toLowerCase();
  if (
    [
      "done",
      "active",
      "pass",
      "completed",
      "resolved",
      "sent-manual",
      "safe-draft",
      "allow",
    ].includes(v)
  )
    return "green";
  if (
    [
      "pending",
      "in-progress",
      "draft",
      "queued",
      "ready-for-manual-send",
      "later",
      "new",
      "triaged",
    ].includes(v)
  )
    return "amber";
  if (
    [
      "blocked",
      "failed",
      "spam-review",
      "needs-review",
      "urgent-review",
      "critical",
      "high",
    ].includes(v)
  )
    return "red";
  if (["info", "starter", "growth", "agency"].includes(v)) return "blue";
  return "slate";
}
