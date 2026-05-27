const STORAGE_KEY = "portfolio-theme";

export function initTheme(settings = {}) {
  const stored = localStorage.getItem(STORAGE_KEY);
  const initial =
    stored || settings.defaultTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(initial, settings);
  bindThemeToggle();
  return initial;
}

export function applyTheme(theme, settings = {}) {
  const resolved = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", resolved);
  localStorage.setItem(STORAGE_KEY, resolved);
  updateCvLinks(resolved);
  if (settings.accentHue != null) {
    document.documentElement.style.setProperty("--accent-h", String(settings.accentHue));
  }
  if (settings.fontDisplay) {
    document.documentElement.style.setProperty("--font-display", settings.fontDisplay);
  }
  if (settings.fontBody) {
    document.documentElement.style.setProperty("--font-body", settings.fontBody);
  }
  const toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    toggle.setAttribute("aria-pressed", resolved === "dark" ? "true" : "false");
    toggle.setAttribute("aria-label", resolved === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
}

export function getCurrentTheme() {
  return document.documentElement.getAttribute("data-theme") || "dark";
}

function bindThemeToggle() {
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = getCurrentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  });
}

function updateCvLinks(theme) {
  const btn = document.querySelector("[data-cv-download]");
  if (!btn) return;
  const light = btn.dataset.cvLight || "/assets/cv/cv-light.pdf";
  const dark = btn.dataset.cvDark || "/assets/cv/cv-dark.pdf";
  btn.href = theme === "light" ? light : dark;
  btn.setAttribute("download", theme === "light" ? "Amrit_Dash_CV_Light.pdf" : "Amrit_Dash_CV_Dark.pdf");
}

export function setCvUrls(lightUrl, darkUrl) {
  const btn = document.querySelector("[data-cv-download]");
  if (!btn) return;
  if (lightUrl) btn.dataset.cvLight = lightUrl;
  if (darkUrl) btn.dataset.cvDark = darkUrl;
  updateCvLinks(getCurrentTheme());
}
