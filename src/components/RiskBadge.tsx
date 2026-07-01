type RiskBadgeProps = {
  riskLevel: string;
};

export function RiskBadge({ riskLevel }: RiskBadgeProps) {
  if (riskLevel === "Low") {
    return (
      <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-700">
        Low risk
      </span>
    );
  }

  if (riskLevel === "Medium") {
    return (
      <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-700">
        Medium risk
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-black text-red-700">
      High risk
    </span>
  );
}
