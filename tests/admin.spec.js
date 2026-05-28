// Admin dashboard (admin.html) — auth, navigation, editing, save flow.

import { test, expect } from "@playwright/test";
import { gotoReady, signInAdmin, readOverlay, STORAGE_KEYS } from "./helpers.js";

test.describe("Admin dashboard · AmritOS v2", () => {
  // Each test gets a fresh Playwright context (clean storage), so we do
  // NOT register a global storage-wiping init script — it would also
  // wipe the session that the login flow plants and break every test.

  test("rejects bad credentials and accepts admin/admin", async ({ page }) => {
    await gotoReady(page, "/admin");
    await expect(page.locator("#login-form")).toBeVisible();

    await page.fill("#u", "wrong");
    await page.fill("#p", "wrong");
    await page.click('button[type="submit"]');
    await expect(page.locator("#login-error")).toBeVisible();
    await expect(page.locator("#login-error")).toContainText(/invalid/i);

    await page.fill("#u", "admin");
    await page.fill("#p", "admin");
    await page.click('button[type="submit"]');

    await expect(page.locator("#section-title")).toHaveText(/profile/i);

    const session = await page.evaluate(
      (k) => sessionStorage.getItem(k),
      STORAGE_KEYS.session
    );
    expect(session).toBe("ok");
  });

  test("the sidebar exposes all 10 sections and they each render an editor", async ({ page }) => {
    await signInAdmin(page);
    const expected = [
      "Profile",
      "Hero",
      "About",
      "Skills",
      "Experience",
      "Education & Awards",
      "Projects",
      "CV Files",
      "Theme & Cosmetics",
      "Reset",
    ];
    const buttons = page.locator("#side-nav button");
    await expect(buttons).toHaveCount(expected.length);

    for (let i = 0; i < expected.length; i++) {
      await buttons.nth(i).click();
      await expect(page.locator("#section-title")).toHaveText(expected[i]);
      // Some panel content must exist for every section
      await expect(page.locator("#section-body .panel").first()).toBeVisible();
    }
  });

  test("editing the tagline turns the state dirty and Save writes the overlay", async ({ page }) => {
    await signInAdmin(page);
    const tagline = page.locator("#f-profile_tagline");
    await expect(tagline).toBeVisible();

    const NEW_TAGLINE = "Automated by tests · " + Date.now();
    await tagline.fill(NEW_TAGLINE);

    await expect(page.locator("#save-state")).toHaveClass(/is-dirty/);
    await expect(page.locator("#save-state")).toHaveText(/unsaved/i);

    await page.click("#save-btn");
    await expect(page.locator("#save-state")).not.toHaveClass(/is-dirty/);
    await expect(page.locator("#toast.is-on")).toContainText(/saved/i);

    const overlay = await readOverlay(page);
    expect(overlay).toBeTruthy();
    expect(overlay.profile.tagline).toBe(NEW_TAGLINE);
  });

  test("Revert restores the in-memory working copy and Save isn't required", async ({ page }) => {
    await signInAdmin(page);
    const name = page.locator("#f-profile_name");
    const original = await name.inputValue();
    await name.fill("Temporarily Changed");
    await expect(page.locator("#save-state")).toHaveClass(/is-dirty/);

    // Confirm the revert dialog
    page.once("dialog", (d) => d.accept());
    await page.click("#revert-btn");

    await expect(page.locator("#f-profile_name")).toHaveValue(original);
    await expect(page.locator("#save-state")).not.toHaveClass(/is-dirty/);
  });

  test("Theme & Cosmetics toggles flip the corresponding flag on <html>", async ({ page }) => {
    await signInAdmin(page);
    await page.locator('#side-nav button[data-section="theme"]').click();

    // Find the Behaviour panel and its three switches
    const switches = page.locator(".panel .toggle-row .switch");
    await expect(switches).toHaveCount(3);

    // Snapshot starting state then click each and verify <html> attribute flipped
    const attrs = ["data-cursor", "data-animated-bg", "data-scroll-anims"];
    for (let i = 0; i < 3; i++) {
      const before = await page.locator("html").getAttribute(attrs[i]);
      await switches.nth(i).click();
      const after = await page.locator("html").getAttribute(attrs[i]);
      expect(after).not.toBe(before);
    }
  });

  test("Accent palette swatch click updates --accent immediately", async ({ page }) => {
    await signInAdmin(page);
    await page.locator('#side-nav button[data-section="theme"]').click();

    const swatchRow = page.locator(".swatch-row").first();
    const target = swatchRow.locator("button").nth(2);
    const targetHex = (await target.getAttribute("data-c")) || "";

    await target.click();
    const after = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
    );
    expect(after.toLowerCase()).toBe(targetHex.toLowerCase());
    await expect(target).toHaveClass(/is-active/);
  });

  test("Reset → 'Reset content overrides' wipes the overlay key", async ({ page }) => {
    await signInAdmin(page);
    // Plant an overlay by saving a profile edit first
    await page.locator("#f-profile_name").fill("To Be Reset");
    await page.click("#save-btn");
    await expect(page.locator("#save-state")).not.toHaveClass(/is-dirty/);
    expect(await readOverlay(page)).toBeTruthy();

    await page.locator('#side-nav button[data-section="danger"]').click();
    page.once("dialog", (d) => d.accept()); // first confirm

    await Promise.all([
      page.waitForLoadState("load"),
      page.click("#reset-data"),
    ]);

    // After reload we land back on the login screen because session is also gone? No -
    // sessionStorage survives reloads. So we still see the dashboard. The overlay is gone.
    await expect(page.locator("#section-title")).toBeVisible();
    const overlay = await readOverlay(page);
    expect(overlay).toBeNull();
  });

  test("Sign out clears the session and shows the login screen again", async ({ page }) => {
    await signInAdmin(page);
    await Promise.all([page.waitForLoadState("load"), page.click("#sign-out")]);
    await expect(page.locator("#login-form")).toBeVisible();
    const session = await page.evaluate(
      (k) => sessionStorage.getItem(k),
      STORAGE_KEYS.session
    );
    expect(session).toBeNull();
  });
});
