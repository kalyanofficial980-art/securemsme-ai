type StatusBadgeProps = {
  status: "pass" | "fail" | "warning" | string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "pass") {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black capitalize text-emerald-700">
        Pass
      </span>
    );
  }

  if (status === "fail") {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black capitalize text-red-700">
        Fail
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black capitalize text-amber-700">
      Warning
    </span>
  );
}
