export type ScanFrequency = "daily" | "weekly" | "monthly" | "manual" | string;

export function getNextScanDate(
  fromDate: Date | string | null | undefined,
  frequency: ScanFrequency,
) {
  if (frequency === "manual") return null;

  const base = fromDate ? new Date(fromDate) : new Date();
  if (Number.isNaN(base.getTime())) return null;

  const next = new Date(base);

  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
    return next.toISOString();
  }

  next.setDate(next.getDate() + 7);
  return next.toISOString();
}

export function getMonitoringStatus(input: {
  monitoringEnabled?: boolean | null;
  lastScanAt?: string | null;
  nextScanAt?: string | null;
}) {
  if (!input.monitoringEnabled) {
    return { label: "Paused", tone: "slate" };
  }

  if (!input.lastScanAt) {
    return { label: "Not scanned", tone: "amber" };
  }

  if (!input.nextScanAt) {
    return { label: "Manual", tone: "blue" };
  }

  const next = new Date(input.nextScanAt);

  if (!Number.isNaN(next.getTime()) && next.getTime() <= Date.now()) {
    return { label: "Due now", tone: "red" };
  }

  return { label: "Active", tone: "emerald" };
}

export function getStatusBadgeClass(tone: string) {
  if (tone === "red") return "bg-red-100 text-red-700";
  if (tone === "amber") return "bg-amber-100 text-amber-700";
  if (tone === "blue") return "bg-blue-100 text-blue-700";
  if (tone === "emerald") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export function getScoreTrend(scans: { score: number | null }[]) {
  if (scans.length < 2) {
    return { label: "No trend yet", direction: "neutral" as const };
  }

  const latest = Number(scans[0]?.score || 0);
  const previous = Number(scans[1]?.score || 0);
  const change = latest - previous;

  if (change > 0)
    return { label: `Improved by ${change}`, direction: "up" as const };
  if (change < 0)
    return {
      label: `Dropped by ${Math.abs(change)}`,
      direction: "down" as const,
    };

  return { label: "No change", direction: "neutral" as const };
}

export function getTrendClass(direction: "up" | "down" | "neutral") {
  if (direction === "up") return "bg-emerald-100 text-emerald-700";
  if (direction === "down") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

export function formatDate(input?: string | null) {
  if (!input) return "Not available";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString();
}

export function formatDateTime(input?: string | null) {
  if (!input) return "Not available";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}
