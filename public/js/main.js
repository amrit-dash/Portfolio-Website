import { defaultPortfolioData, PORTFOLIO_DB_PATH } from "./app/portfolio-data.js";
import { readData, canUseFirebase } from "./app/firebase-client.js";
import { renderPortfolio } from "./app/renderer.js";
import { applyTheme, installThemeToggle, resolveInitialTheme } from "./app/theme.js";
import { setupFolderScrollAnimation, setupScrollAnimations } from "./app/animations.js";
import { createRetroScene } from "./app/retro-scene.js";

function mergeData(base, incoming) {
  if (!incoming || typeof incoming !== "object") return structuredClone(base);

  const target = structuredClone(base);
  Object.entries(incoming).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      target[key] = value;
    } else if (value && typeof value === "object") {
      target[key] = { ...(target[key] || {}), ...value };
    } else {
      target[key] = value;
    }
  });
  return target;
}

async function getPortfolioData() {
  if (!canUseFirebase()) return structuredClone(defaultPortfolioData);
  try {
    const remote = await readData(PORTFOLIO_DB_PATH);
    return mergeData(defaultPortfolioData, remote);
  } catch (error) {
    console.warn("Using local portfolio defaults due to fetch error.", error);
    return structuredClone(defaultPortfolioData);
  }
}

function installCvBehavior(data) {
  const cvButton = document.querySelector("[data-cv-download]");
  if (!cvButton) return;

  const updateCvLink = () => {
    const mode = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    const href = mode === "light" ? data.cv.lightUrl : data.cv.darkUrl;
    cvButton.href = href;
  };

  updateCvLink();
  document.addEventListener("theme:changed", updateCvLink);
}

function installScrollNav() {
  document.querySelectorAll("[data-scroll]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const selector = link.getAttribute("href");
      const target = selector ? document.querySelector(selector) : null;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

async function boot() {
  const data = await getPortfolioData();
  renderPortfolio(data);

  const initialTheme = resolveInitialTheme(data.theme.defaultMode);
  applyTheme(initialTheme, data.theme);
  installThemeToggle(initialTheme, (nextMode) => {
    applyTheme(nextMode, data.theme);
    document.dispatchEvent(new Event("theme:changed"));
  });

  installCvBehavior(data);
  installScrollNav();
  setupScrollAnimations();
  setupFolderScrollAnimation();
  createRetroScene().catch((error) => console.warn("Retro scene initialization failed.", error));

  document.body.classList.add("is-ready");
}

boot();