// Integration · admin overlay round-trips into the public site.

import { test, expect } from "@playwright/test";
import { gotoReady, writeOverlay, STORAGE_KEYS } from "./helpers.js";

test.describe("Admin → public site integration", () => {
  // Fresh context per test gives us clean storage; no need for an init
  // script — that would wipe the values we plant during the test.

  test("an overlay saved by the admin is rendered by the public site", async ({ page }) => {
    await gotoReady(page); // visit once to instantiate localStorage on the origin

    const stamp = "Overlay-test-" + Date.now();
    await writeOverlay(page, {
      profile: { name: stamp },
      hero: { subtitle: "Subtitle written by an automated test." },
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#brand-name")).toHaveText(stamp);
    await expect(page.locator("#footer-name")).toHaveText(stamp);
    await expect(page.locator("#hero-sub")).toHaveText(
      "Subtitle written by an automated test."
    );
    await expect(page).toHaveTitle(new RegExp(stamp));
  });

  test("admin saves through the UI propagate after a public-site reload", async ({ page, context }) => {
    // 1 · Sign in to the admin in the first tab, save a tagline.
    await page.goto("/admin");
    await page.fill("#u", "admin");
    await page.fill("#p", "admin");
    await page.click('button[type="submit"]');
    await expect(page.locator("#section-title")).toBeVisible();

    const NEW_TAG = "Round-trip · " + Date.now();
    await page.fill("#f-profile_tagline", NEW_TAG);
    await page.click("#save-btn");
    await expect(page.locator("#save-state")).not.toHaveClass(/is-dirty/);

    // 2 · Open the public site in a second tab from the SAME context
    //    so it shares the same localStorage origin.
    const publicTab = await context.newPage();
    await publicTab.goto("/");
    await publicTab.waitForLoadState("networkidle");

    const overlay = await publicTab.evaluate(
      (k) => JSON.parse(localStorage.getItem(k) || "null"),
      STORAGE_KEYS.data
    );
    expect(overlay).not.toBeNull();
    expect(overlay.profile.tagline).toBe(NEW_TAG);

    // The hero subtitle is rendered from `hero.subtitle`, but the
    // tagline lives under `profile.tagline` — verify it survived the
    // round-trip by reading the data store directly.
    const taglineInData = await publicTab.evaluate(async (k) => {
      const raw = localStorage.getItem(k);
      const ov = raw ? JSON.parse(raw) : {};
      return ov.profile && ov.profile.tagline;
    }, STORAGE_KEYS.data);
    expect(taglineInData).toBe(NEW_TAG);
  });

  test("project overlay drives the bento count + modal", async ({ page }) => {
    await gotoReady(page);

    await writeOverlay(page, {
      projects: [
        {
          id: "test-only",
          title: "Test-only Project",
          category: "Automation",
          year: "2026",
          summary: "Inserted by the test suite to verify project rendering.",
          tags: ["Playwright", "Automation"],
          size: "lg",
          thumb: "images/portfolio/coffeeMapper.jpg",
          hero: "images/portfolio/gallery/coffeeMapper.jpg",
          links: [{ label: "Probe", href: "#", primary: true }],
        },
      ],
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const cards = page.locator("#bento .card");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("Test-only Project");

    await cards.first().click();
    const modal = page.locator("#project-modal");
    await expect(modal).toHaveClass(/is-open/);
    await expect(modal.locator(".modal-body h3")).toHaveText("Test-only Project");
    await expect(modal.locator(".modal-body .tags li").first()).toHaveText("Playwright");
  });

  test("theme prefs in localStorage initialise the public site theme", async ({ page }) => {
    await gotoReady(page);
    await page.evaluate(
      ({ k, v }) => localStorage.setItem(k, JSON.stringify(v)),
      { k: STORAGE_KEYS.prefs, v: { mode: "light", accent: "#10b981" } }
    );
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
    );
    expect(accent.toLowerCase()).toBe("#10b981");
  });
});
