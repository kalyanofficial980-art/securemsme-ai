import { describe, expect, it } from "vitest";
import { runRealSecurityModules } from "@/lib/real-security-modules";

describe("real security modules safety", () => {
  it("blocks localhost targets", async () => {
    const report = await runRealSecurityModules({
      targetUrl: "http://localhost:3000",
      intensity: "light",
    });

    expect(report.privateTargetBlocked).toBe(true);
    expect(report.blockedModules).toBeGreaterThan(0);
  });

  it("blocks private IP targets", async () => {
    const report = await runRealSecurityModules({
      targetUrl: "http://192.168.1.1",
      intensity: "light",
    });

    expect(report.privateTargetBlocked).toBe(true);
    expect(report.results[0].moduleId).toBe("target-safety-guard");
  });
});
