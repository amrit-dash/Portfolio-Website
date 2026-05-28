// GitHub-enrichment specs · validate the live data baked into
// portfolio.json by scripts/sync-github.mjs is rendered correctly on
// the public site (card chips + modal repo block).

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gotoReady } from "./helpers.js";

const data = JSON.parse(
  readFileSync(resolve(process.cwd(), "public", "data", "portfolio.json"), "utf8")
);
const enriched = (data.projects || []).filter((p) => p && p.github && p.github.url);

test.describe("GitHub enrichment", () => {
  test("portfolio.json has at least one project enriched with GitHub data", () => {
    expect(enriched.length).toBeGreaterThanOrEqual(1);
    for (const p of enriched) {
      expect(p.github.nameWithOwner).toMatch(/^[^/]+\/[^/]+$/);
      expect(p.github.url).toMatch(/^https:\/\/github\.com\//);
      expect(p.github.languages).toBeInstanceOf(Array);
      expect(typeof p.github.stars).toBe("number");
      expect(typeof p.github.forks).toBe("number");
      expect(p.github.syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });

  test("every GitHub-linked project shows a repo badge + language/star chips in the bento grid", async ({ page }) => {
    await gotoReady(page);
    // Only enriched projects get the badge — the count must match.
    await expect(page.locator(".bento .card .repo-tag")).toHaveCount(enriched.length);
    for (const p of enriched) {
      const card = page.locator(`.bento .card[data-project="${p.id}"]`);
      await expect(card).toHaveCount(1);
      await expect(card.locator(".repo-tag")).toBeVisible();
      // Star count chip
      await expect(card.locator(".gh-chip")).not.toHaveCount(0);
    }
  });

  test("opening a GitHub-linked project shows the rich repo block in the modal", async ({ page }) => {
    await gotoReady(page);
    const sample = enriched[0];
    const card = page.locator(`.bento .card[data-project="${sample.id}"]`);
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const modal = page.locator("#project-modal");
    await expect(modal).toHaveClass(/is-open/);
    const block = modal.locator(".gh-block");
    await expect(block).toBeVisible();

    const link = block.locator("a.gh-repo-link");
    await expect(link).toHaveAttribute("href", sample.github.url);
    await expect(link).toContainText(sample.github.nameWithOwner);

    // Star + fork stat chips
    await expect(block.locator(".gh-stat")).not.toHaveCount(0);

    // Languages bar — one segment per language in the enrichment
    if (sample.github.languages && sample.github.languages.length) {
      await expect(block.locator(".gh-bar span").first()).toBeVisible();
      const segs = await block.locator(".gh-bar span").count();
      expect(segs).toBeGreaterThan(0);
      expect(segs).toBeLessThanOrEqual(sample.github.languages.length);
    }

    // The modal-actions always include an explicit GitHub button when
    // the project has a repo, even if curated links omitted it.
    const ghButton = modal.locator(`.modal-actions a[href="${sample.github.url}"]`);
    await expect(ghButton).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(modal).not.toHaveClass(/is-open/);
  });

  test("modal falls back to GitHub description and topics when curated copy is empty", async ({ page }) => {
    // Plant a temporary project that has *only* a github block — no
    // summary, no tags — to prove the renderer surfaces live data.
    const sample = enriched[0];
    await gotoReady(page);
    await page.evaluate(
      ({ key, gh }) => {
        const overlay = {
          projects: [
            {
              id: "ghonly",
              title: "Live-only Project",
              category: "GitHub-driven",
              year: "",
              summary: "",
              tags: [],
              size: "lg",
              thumb: "images/portfolio/coffeeMapper.jpg",
              hero: "",
              links: [],
              github: gh,
            },
          ],
        };
        localStorage.setItem(key, JSON.stringify(overlay));
      },
      { key: "amritos.portfolio.v2", gh: sample.github }
    );
    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.locator('.bento .card[data-project="ghonly"]').click();
    const modal = page.locator("#project-modal");
    await expect(modal).toHaveClass(/is-open/);
    // Description copied from the live GitHub description
    if (sample.github.description) {
      await expect(modal.locator(".modal-body p").first()).toContainText(
        sample.github.description.split(" ").slice(0, 4).join(" ")
      );
    }
    // Topic chips (when present)
    if (sample.github.topics?.length) {
      await expect(modal.locator(".gh-topics li")).not.toHaveCount(0);
    }
  });
});
