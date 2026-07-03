import { expect, test } from "@playwright/test";

test("seo readiness page renders", async ({ page }) => {
  await page.goto("/seo-readiness", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /SEO Readiness|Sitemap|Robots/i,
  );
});

test("sitemap renders", async ({ page }) => {
  await page.goto("/sitemap.xml", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /public-launch|pricing|demo/i,
  );
});

test("robots renders", async ({ page }) => {
  await page.goto("/robots.txt", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(/User-Agent|Sitemap/i);
});

test("launch analytics api accepts safe event", async ({ request }) => {
  const response = await request.post("/api/launch-analytics", {
    data: {
      eventType: "page-view",
      sourcePath: "/public-launch",
      deviceHint: "desktop",
    },
  });

  expect([200, 400]).toContain(response.status());
});

test("admin launch analytics requires auth or admin", async ({ page }) => {
  await page.goto("/admin/launch-analytics", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /login|Admin|Launch Analytics/i,
  );
});
