import { loadSiteData } from "./core/data-loader.js";
import { renderSite, closeProjectModal } from "./core/renderer.js";
import { initTheme, toggleTheme, applyThemeSettings, syncCvDownload } from "./core/theme.js";
import {
  initScrollReveal,
  initSectionAnimations,
  initHeaderScroll,
  initJourneyRail,
  initSmoothScroll,
  initMobileNav,
  initCustomCursor,
} from "./core/animations.js";
import { initHeroScene } from "./core/scene3d.js";

async function boot() {
  try {
    const data = await loadSiteData();
    applyThemeSettings(data.theme);
    initTheme(data.theme?.defaultMode || "dark");
    renderSite(data);
    syncCvDownload();
  } catch (err) {
    console.error(err);
    document.getElementById("hero-root")?.append(
      Object.assign(document.createElement("p"), { textContent: "Failed to load portfolio data." })
    );
  }

  initHeroScene();
  initHeaderScroll();
  initSmoothScroll();
  initMobileNav();
  initJourneyRail();
  initScrollReveal();
  initSectionAnimations();
  initCustomCursor();

  document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);

  const modal = document.getElementById("project-modal");
  modal?.querySelector(".modal-close")?.addEventListener("click", closeProjectModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeProjectModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProjectModal();
  });

  const preloader = document.getElementById("preloader");
  window.addEventListener("load", () => {
    setTimeout(() => preloader?.classList.add("is-done"), 400);
  });

  const year = document.getElementById("current-year");
  if (year) year.textContent = new Date().getFullYear();
}

boot();
