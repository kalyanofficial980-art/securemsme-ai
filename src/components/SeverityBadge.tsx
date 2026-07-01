type SeverityBadgeProps = {
  severity?: string;
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  if (severity === "Critical") {
    return (
      <span className="rounded-full bg-red-950 px-3 py-1 text-xs font-black text-white">
        Critical
      </span>
    );
  }

  if (severity === "High") {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
        High
      </span>
    );
  }

  if (severity === "Medium") {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
        Medium
      </span>
    );
  }

  if (severity === "Low") {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
        Low
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
      Info
    </span>
  );
}
