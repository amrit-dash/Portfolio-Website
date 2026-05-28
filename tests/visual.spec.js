// Visual / responsive sanity tests — captures full-page screenshots
// across breakpoints + themes and asserts the layout stays usable.

import { test, expect } from "@playwright/test";
import { gotoReady } from "./helpers.js";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 780 },
  { name: "tablet", width: 820, height: 1100 },
  { name: "desktop", width: 1440, height: 900 },
];

test.describe("Visual · breakpoints × themes", () => {
  // Fresh context per test handles storage isolation.

  for (const vp of VIEWPORTS) {
    test(`renders at ${vp.name} (${vp.width}×${vp.height}) in both themes`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoReady(page);

      await expect(page.locator("#hero-title")).toBeVisible();
      const dark = await page.screenshot({ fullPage: false });
      await testInfo.attach(`${vp.name}-dark`, { body: dark, contentType: "image/png" });

      await page.click("#theme-toggle");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      const light = await page.screenshot({ fullPage: false });
      await testInfo.attach(`${vp.name}-light`, { body: light, contentType: "image/png" });

      await expect(page.locator(".site-header")).toBeVisible();
      await expect(page.locator("#hero-title")).toBeVisible();
    });
  }

  test("mobile menu opens and lists primary links", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await gotoReady(page);
    await expect(page.locator("#menu-toggle")).toBeVisible();
    await page.click("#menu-toggle");
    await expect(page.locator(".nav-links")).toHaveClass(/is-open/);
    const items = page.locator(".nav-links a");
    await expect(items).toHaveCount(7);
  });
});
