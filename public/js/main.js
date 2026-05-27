import { fetchPortfolioContent, fetchPortfolioSettings, resolveStorageUrl } from "./modules/firebase-app.js";
import { initTheme, applyTheme, setCvUrls } from "./modules/theme.js";
import { runBootSequence } from "./modules/boot-sequence.js";
import { renderSite } from "./modules/render.js";
import { initScrollAnimations } from "./modules/scroll-animations.js";
import { initHeroScene } from "./modules/scene-3d.js";

async function bootstrap() {
  const [content, settings] = await Promise.all([
    fetchPortfolioContent(),
    fetchPortfolioSettings()
  ]);

  renderSite(content);
  initTheme(settings);
  applyTheme(document.documentElement.getAttribute("data-theme") || settings.defaultTheme, settings);

  await hydrateCvUrls(content);

  bindNavigation();
  bindProjectModals();

  const dispose3d = initHeroScene(document.getElementById("hero-canvas"));

  runBootSequence({
    enabled: settings.bootEnabled !== false,
    onComplete: () => initScrollAnimations({ reducedMotion: settings.reducedMotion })
  });

  window.addEventListener("beforeunload", dispose3d);
}

async function hydrateCvUrls(content) {
  const lightFallback = content.about?.cvLightUrl || "/assets/cv/cv-light.pdf";
  const darkFallback = content.about?.cvDarkUrl || "/assets/cv/cv-dark.pdf";
  const light = await resolveStorageUrl(content.about?.cvLightStorage, lightFallback);
  const dark = await resolveStorageUrl(content.about?.cvDarkStorage, darkFallback);
  setCvUrls(light, dark);
}

function bindNavigation() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector("[data-nav-toggle]");
  toggle?.addEventListener("click", () => {
    header?.classList.toggle("nav-open");
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      header?.classList.remove("nav-open");
    });
  });

  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll("[data-nav-section]");
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((a) => {
            a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`);
          });
        }
      });
    },
    { threshold: 0.35 }
  );
  sections.forEach((s) => spy.observe(s));
}

function bindProjectModals() {
  document.body.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-project-open]");
    if (openBtn) {
      const id = openBtn.getAttribute("data-project-open");
      const modal = document.getElementById(`modal-${id}`);
      modal?.showModal?.();
      return;
    }
    if (e.target.closest("[data-modal-close]") || e.target.matches(".project-modal")) {
      const dialog = e.target.closest("dialog") || e.target;
      if (dialog?.tagName === "DIALOG") dialog.close();
    }
  });
}

bootstrap();
