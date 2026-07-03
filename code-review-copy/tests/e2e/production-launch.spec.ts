import { expect, test } from "@playwright/test";

test("production launch requires auth or renders launch shell", async ({
  page,
}) => {
  await page.goto("/production-launch", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /login|Production Launch|Accuracy Benchmark/i,
  );
});
