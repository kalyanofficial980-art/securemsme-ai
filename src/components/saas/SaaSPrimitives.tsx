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
      className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      {title ? (
        <h2 className="text-xl font-black tracking-tight text-slate-950">
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
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-950",
    amber: "bg-amber-100 text-amber-950",
    red: "bg-red-100 text-red-950",
    blue: "bg-blue-100 text-blue-950",
  };
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${tones[tone]}`}
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
      <p className="text-sm font-black text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
      {hint ? (
        <p className="mt-2 text-xs font-bold text-slate-500">{hint}</p>
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
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h3 className="font-black">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
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
