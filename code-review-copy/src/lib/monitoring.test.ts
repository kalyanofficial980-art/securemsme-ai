import { describe, expect, it } from "vitest";
import {
  getMonitoringStatus,
  getNextScanDate,
  getScoreTrend,
} from "@/lib/monitoring";

describe("monitoring helpers", () => {
  it("calculates weekly next scan date", () => {
    const next = getNextScanDate("2026-07-01T00:00:00.000Z", "weekly");
    expect(next).toBe("2026-07-08T00:00:00.000Z");
  });

  it("returns null for manual scan frequency", () => {
    const next = getNextScanDate("2026-07-01T00:00:00.000Z", "manual");
    expect(next).toBeNull();
  });

  it("shows not scanned status before first scan", () => {
    const status = getMonitoringStatus({
      monitoringEnabled: true,
      lastScanAt: null,
      nextScanAt: null,
    });

    expect(status.label).toBe("Not scanned");
  });

  it("detects score improvement", () => {
    const trend = getScoreTrend([{ score: 85 }, { score: 70 }]);
    expect(trend.direction).toBe("up");
    expect(trend.label).toContain("Improved");
  });
});
