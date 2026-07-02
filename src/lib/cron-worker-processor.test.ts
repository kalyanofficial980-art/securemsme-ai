import { describe, expect, it } from "vitest";
import { nextRunDate } from "@/lib/continuous-monitoring-engine";

describe("cron worker scheduler foundation", () => {
  it("calculates a future daily run", () => {
    const start = new Date("2026-07-02T00:00:00.000Z");
    const next = new Date(nextRunDate("daily", start));
    expect(next.getUTCDate()).toBe(3);
  });

  it("calculates a future weekly run", () => {
    const start = new Date("2026-07-02T00:00:00.000Z");
    const next = new Date(nextRunDate("weekly", start));
    expect(next.getUTCDate()).toBe(9);
  });
});
