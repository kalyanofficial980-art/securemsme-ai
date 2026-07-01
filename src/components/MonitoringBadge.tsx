import { getMonitoringStatus, getStatusBadgeClass } from "@/lib/monitoring";

type MonitoringBadgeProps = {
  monitoringEnabled?: boolean | null;
  lastScanAt?: string | null;
  nextScanAt?: string | null;
};

export function MonitoringBadge({
  monitoringEnabled,
  lastScanAt,
  nextScanAt,
}: MonitoringBadgeProps) {
  const status = getMonitoringStatus({
    monitoringEnabled,
    lastScanAt,
    nextScanAt,
  });

  return (
    <span
      className={`w-fit rounded-full px-4 py-2 text-sm font-black ${getStatusBadgeClass(
        status.tone,
      )}`}
    >
      {status.label}
    </span>
  );
}
