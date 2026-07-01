import { describe, expect, it } from "vitest";
import {
  getWordPressHardeningChecklist,
  runCmsWordPressScanner,
} from "@/lib/cms-wordpress-scanner";

describe("CMS WordPress scanner safety", () => {
  it("has a developer hardening checklist", () => {
    const checklist = getWordPressHardeningChecklist();

    expect(checklist.length).toBeGreaterThan(8);
    expect(checklist.join(" ")).toContain("MFA");
  });

  it("blocks localhost targets", async () => {
    const report = await runCmsWordPressScanner({
      targetUrl: "http://localhost:3000",
      intensity: "light",
    });

    expect(report.privateTargetBlocked).toBe(true);
    expect(report.findings[0].id).toBe("cms-target-safety-guard");
  });

  it("blocks private IP targets", async () => {
    const report = await runCmsWordPressScanner({
      targetUrl: "http://192.168.1.1",
      intensity: "light",
    });

    expect(report.privateTargetBlocked).toBe(true);
    expect(report.highPriorityFindings).toBeGreaterThan(0);
  });
});
