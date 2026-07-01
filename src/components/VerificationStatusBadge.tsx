type VerificationStatusBadgeProps = {
  status?: string | null;
  deepScanEnabled?: boolean | null;
};

export function VerificationStatusBadge({
  status,
  deepScanEnabled,
}: VerificationStatusBadgeProps) {
  const normalized = String(status || "unverified").toLowerCase();

  if (normalized === "verified" && deepScanEnabled) {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-900">
        Verified · Deep scan unlocked
      </span>
    );
  }

  if (normalized === "verified") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-900">
        Verified
      </span>
    );
  }

  if (normalized === "failed") {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-900">
        Verification failed
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-900">
      Not verified
    </span>
  );
}
