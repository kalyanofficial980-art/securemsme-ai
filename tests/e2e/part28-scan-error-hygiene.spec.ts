import { test, expect } from "@playwright/test";
import fs from "fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

test.describe("part 28 scan error hygiene and manual URL override", () => {
  test("scan API routes do not return raw error.message", async () => {
    const files = [
      "src/app/api/scan/route.ts",
      "src/app/api/websites/[id]/rescan/route.ts",
      "src/app/api/websites/[id]/deep-scan/route.ts",
    ];

    for (const file of files) {
      const source = read(file);

      expect(source).toContain("toSafeScanErrorMessage");
      expect(source).not.toMatch(/\?\s*error\.message/i);
      expect(source).not.toMatch(/return\s+(NextResponse|Response)\.json\(\{\s*error:\s*error\.message/i);
    }
  });

  test("scan form manual URL overrides stale selected website id", async () => {
    const source = read("src/components/ScanForm.tsx");

    expect(source).toContain("const manualWebsiteUrl = websiteUrl.trim();");
    expect(source).toContain("websiteUrl: manualWebsiteUrl || undefined");
    expect(source).toContain("websiteId: manualWebsiteUrl ? undefined : websiteId || undefined");
  });

  test("client scan UI does not display raw network exception messages", async () => {
    const scanForm = read("src/components/ScanForm.tsx");
    const rescanButton = read("src/components/RescanButton.tsx");

    expect(scanForm).toContain("toClientSafeScanError");
    expect(rescanButton).toContain("toClientSafeScanError");

    expect(scanForm).not.toMatch(/scanError\.message/i);
    expect(rescanButton).not.toMatch(/setError\(data\.error\s*\|\|/i);
  });

  test("safe scan error helper hides DNS and secret-like backend text", async () => {
    const helper = read("src/lib/security/scan-error.ts");

    expect(helper).toContain("toSafeScanErrorMessage");
    expect(helper).toMatch(/getaddrinfo\|ENOTFOUND/);
    expect(helper).toMatch(/EBUSY\|EAI_AGAIN/);
    expect(helper).toMatch(/service_role/);
  });
});
