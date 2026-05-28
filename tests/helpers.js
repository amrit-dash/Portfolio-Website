// Shared helpers for the AmritOS test suite.

import { expect } from "@playwright/test";

export const STORAGE_KEYS = {
  data: "amritos.portfolio.v2",
  prefs: "amritos.prefs.v2",
  session: "amritos.admin.session",
};

/**
 * Navigate to a URL and wait for the page to be visually ready:
 *  - networkidle
 *  - the preloader removed
 *  - the boot promise resolved (the body contains rendered content)
 */
export async function gotoReady(page, path = "/") {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#preloader")).toHaveCount(0, { timeout: 8_000 });
}

/** Read the data-overlay localStorage entry as an object. */
export async function readOverlay(page) {
  return await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEYS.data);
}

/** Write a data-overlay localStorage entry. */
export async function writeOverlay(page, overlay) {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEYS.data, value: overlay }
  );
}

/** Clear every AmritOS-owned key from local + session storage. */
export async function clearAppStorage(page) {
  await page.evaluate((keys) => {
    Object.values(keys).forEach((k) => {
      try {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      } catch (_) {}
    });
  }, STORAGE_KEYS);
}

/**
 * Sign into the admin dashboard using the configured stub credentials.
 * The dashboard reloads after sign-in, so we await the section heading.
 */
export async function signInAdmin(page, { username = "admin", password = "admin" } = {}) {
  await gotoReady(page, "/admin");
  await page.fill("#u", username);
  await page.fill("#p", password);
  await Promise.all([page.waitForLoadState("load"), page.click('button[type="submit"]')]);
  await expect(page.locator("#section-title")).toBeVisible();
}

/** Resolve the project tile index `i` (top-left = 0). */
export function bentoCard(page, i = 0) {
  return page.locator(".bento .card").nth(i);
}
