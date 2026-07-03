import { describe, expect, it } from "vitest";
import {
  getRealSafeTemplateCatalog,
  runRealSafeTemplateWorker,
} from "@/lib/real-safe-template-worker";

describe("real safe template worker", () => {
  it("has a safe template catalog", () => {
    const catalog = getRealSafeTemplateCatalog();

    expect(catalog.length).toBeGreaterThan(4);
    expect(catalog.some((template) => template.sensitive)).toBe(true);
    expect(
      catalog.every((template) => ["GET", "HEAD"].includes(template.method)),
    ).toBe(true);
  });

  it("blocks localhost targets", async () => {
    const report = await runRealSafeTemplateWorker({
      targetUrl: "http://localhost:3000",
      intensity: "light",
    });

    expect(report.privateTargetBlocked).toBe(true);
    expect(report.blockedTemplates).toBeGreaterThan(0);
  });

  it("blocks private IP targets", async () => {
    const report = await runRealSafeTemplateWorker({
      targetUrl: "http://192.168.1.1",
      intensity: "light",
    });

    expect(report.privateTargetBlocked).toBe(true);
    expect(report.findings[0].templateId).toBe("target-safety-guard");
  });
});
