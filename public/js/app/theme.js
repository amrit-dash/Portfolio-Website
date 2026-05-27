const STORAGE_KEY = "amrit-portfolio-theme";

export function resolveInitialTheme(defaultMode) {
  const savedMode = localStorage.getItem(STORAGE_KEY);
  if (savedMode === "light" || savedMode === "dark") return savedMode;

  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return defaultMode || "dark";
}

export function applyTheme(mode, themeConfig) {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.setProperty("--accent-primary", themeConfig?.accent || "#6ee7ff");
  root.style.setProperty("--accent-secondary", themeConfig?.altAccent || "#ff8a5b");
  root.style.setProperty("--font-family", themeConfig?.fontFamily || "system-ui, sans-serif");
  localStorage.setItem(STORAGE_KEY, mode);
}

export function installThemeToggle(initialTheme, callback) {
  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) return;
  toggle.setAttribute("aria-pressed", String(initialTheme === "dark"));
  toggle.textContent = initialTheme === "dark" ? "Switch to Light" : "Switch to Dark";

  toggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-pressed", String(next === "dark"));
    toggle.textContent = next === "dark" ? "Switch to Light" : "Switch to Dark";
    callback(next);
  });
}
