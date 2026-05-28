const STORAGE_KEY = "portfolio-theme";

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredTheme(mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function applyTheme(mode, { persist = true } = {}) {
  const resolved = mode === "light" || mode === "dark" ? mode : "dark";
  document.documentElement.setAttribute("data-theme", resolved);
  if (persist) setStoredTheme(resolved);
  updateThemeToggleIcon(resolved);
  updateCvLinks(resolved);
  return resolved;
}

export function initTheme(defaultMode = "dark") {
  const stored = getStoredTheme();
  const initial = stored || defaultMode;
  return applyTheme(initial, { persist: Boolean(stored) });
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  return applyTheme(next);
}

function updateThemeToggleIcon(mode) {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.setAttribute("aria-label", mode === "dark" ? "Switch to light mode" : "Switch to dark mode");
  btn.innerHTML =
    mode === "dark"
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

function updateCvLinks(mode) {
  const cvBtn = document.getElementById("cv-download");
  if (!cvBtn) return;
  const light = cvBtn.dataset.cvLight;
  const dark = cvBtn.dataset.cvDark;
  if (!light || !dark) return;
  cvBtn.href = mode === "light" ? light : dark;
}

export function syncCvDownload() {
  const mode = document.documentElement.getAttribute("data-theme") || "dark";
  updateCvLinks(mode);
}

export function applyThemeSettings(theme = {}) {
  const root = document.documentElement;
  if (theme.accent) root.style.setProperty("--accent", theme.accent);
  if (theme.accentSecondary) root.style.setProperty("--accent-2", theme.accentSecondary);
  if (theme.fontDisplay) root.style.setProperty("--font-display", `"${theme.fontDisplay}", system-ui, sans-serif`);
  if (theme.fontBody) root.style.setProperty("--font-body", `"${theme.fontBody}", system-ui, sans-serif`);
  if (theme.accent) {
    const hex = theme.accent.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (!Number.isNaN(r)) root.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
  }
  document.body.classList.toggle("cursor-glow", Boolean(theme.cursorGlow));
  document.documentElement.classList.toggle("reduced-motion", Boolean(theme.reducedMotion));
}
