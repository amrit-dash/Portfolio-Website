// Public portfolio site (index.html) — end-to-end behavioural coverage.

import { test, expect } from "@playwright/test";
import { gotoReady, bentoCard, STORAGE_KEYS } from "./helpers.js";

test.describe("Public site · AmritOS v2", () => {
  // Playwright already starts each test in a fresh browser context, so
  // local/session storage are empty by default — no per-test cleanup
  // needed, and we must not register an init script that would wipe
  // storage on every reload mid-test.

  test("loads, hides the preloader and renders the hero from JSON", async ({ page }) => {
    await gotoReady(page);

    await expect(page).toHaveTitle(/Amrit Dash · AI & Automation Engineer/);
    await expect(page.locator("#brand-name")).toHaveText(/Amrit Dash/);

    const hero = page.locator("#hero");
    await expect(hero).toHaveClass(/is-ready/);
    const heroTitle = page.locator("#hero-title");
    await expect(heroTitle).toContainText("AI &");
    await expect(heroTitle).toContainText("Automation");
    await expect(heroTitle).toContainText("Engineer.");

    await expect(page.locator("#hero-kicker")).toContainText("system online");
    await expect(page.locator("#hero-metrics .metric-card")).toHaveCount(3);
  });

  test("all primary sections + their content render from the data layer", async ({ page }) => {
    await gotoReady(page);

    // About
    await expect(page.locator("#about-headline")).not.toBeEmpty();
    await expect(page.locator("#about-body")).toContainText(/automation/i);
    await expect(page.locator("#about-facts .fact")).toHaveCount(4);

    // Skills — 4 groups
    await expect(page.locator("#skill-groups .skill-card")).toHaveCount(4);

    // Experience — must include the current Contour Education role
    const tlItems = page.locator("#timeline .tl-item");
    await expect(tlItems).toHaveCount(4);
    const current = page.locator("#timeline .tl-item.is-current");
    await expect(current).toHaveCount(1);
    await expect(current).toContainText("Contour Education");
    await expect(current.locator(".tl-current-tag")).toContainText(/current/i);

    // Education + tests + certs + achievements
    await expect(page.locator("#edu-grid .edu-card")).toHaveCount(1);
    const scorePairs = page.locator("#score-strip .pair");
    await expect(scorePairs).toHaveCount(3);
    await expect(scorePairs.filter({ hasText: "IELTS" })).toContainText("8.0");
    await expect(page.locator("#cert-list li")).not.toHaveCount(0);
    await expect(page.locator("#ach-list li")).not.toHaveCount(0);

    // Projects bento
    await expect(page.locator("#bento .card")).toHaveCount(8);

    // Contact + footer
    await expect(page.locator("#contact-cards .contact-card")).not.toHaveCount(0);
    await expect(page.locator("#footer-name")).toContainText("Amrit Dash");
    await expect(page.locator("#current-year")).toHaveText(new Date().getFullYear().toString());
  });

  test("toggling the theme persists across reloads and swaps the CV link", async ({ page }) => {
    await gotoReady(page);
    const html = page.locator("html");

    await expect(html).toHaveAttribute("data-theme", "dark");
    const cvHref = () => page.locator("#hero-cta-secondary").getAttribute("href");
    expect(await cvHref()).toContain("CV - Amrit Dash - 2025 - Dark.pdf");

    await page.click("#theme-toggle");
    await expect(html).toHaveAttribute("data-theme", "light");
    expect(await cvHref()).toContain("CV - Amrit Dash - 2025 - Light.pdf");

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    const prefs = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k) || "{}"),
      STORAGE_KEYS.prefs
    );
    expect(prefs.mode).toBe("light");
  });

  test("accent picker mutates the --accent CSS variable and persists", async ({ page }) => {
    await gotoReady(page);
    const initial = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
    );

    await page.click("#accent-toggle");
    const swatches = page.locator("#accent-pop button");
    const second = swatches.nth(1);
    const newHex = await second.getAttribute("data-accent");

    await second.click();
    const after = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
    );

    expect(after.toLowerCase()).toBe(newHex.toLowerCase());
    expect(after.toLowerCase()).not.toBe(initial.toLowerCase());

    const prefs = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k) || "{}"),
      STORAGE_KEYS.prefs
    );
    expect(String(prefs.accent).toLowerCase()).toBe(newHex.toLowerCase());
  });

  test("project tile opens the modal and Escape closes it", async ({ page }) => {
    await gotoReady(page);
    const modal = page.locator("#project-modal");
    await expect(modal).not.toHaveClass(/is-open/);

    await bentoCard(page, 0).scrollIntoViewIfNeeded();
    await bentoCard(page, 0).click();
    await expect(modal).toHaveClass(/is-open/);
    await expect(modal.locator(".modal-body h3")).not.toBeEmpty();
    await expect(modal.locator(".modal-body .tags li")).not.toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(modal).not.toHaveClass(/is-open/);
  });

  test("nav anchor link smooth-scrolls and updates the active state", async ({ page }) => {
    await gotoReady(page);
    await page.click('.nav-links a[href="#projects"]');
    await expect(page.locator("#projects")).toBeInViewport({ timeout: 4_000 });
    await expect(page.locator('.nav-links a.is-active[href="#projects"]')).toHaveCount(1);
  });

  test("scroll-reveal sets the .is-in class on every section as it appears", async ({ page }) => {
    await gotoReady(page);
    const targets = [
      "#about [data-reveal]",
      "#skills [data-reveal]",
      "#experience [data-reveal]",
      "#projects [data-reveal]",
      "#contact [data-reveal]",
    ];
    for (const sel of targets) {
      const el = page.locator(sel).first();
      await el.scrollIntoViewIfNeeded();
      await expect(el).toHaveClass(/is-in/, { timeout: 4_000 });
    }
  });

  test("admin route is rewritten to admin.html (login screen, not portfolio)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("#login-form")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.locator("#login-form")).toBeVisible();
  });

  test("no JavaScript errors surface during a full scroll-through", async ({ page }) => {
    const jsErrors = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));
    await gotoReady(page);
    // Walk every section
    for (const id of ["#about", "#skills", "#experience", "#education", "#projects", "#contact"]) {
      await page.locator(id).scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
    }
    expect(jsErrors, jsErrors.join("\n")).toEqual([]);
  });
});
