const STORAGE_KEY = 'amrit-portfolio-theme';

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY);
}

export function applyTheme(theme, settings = {}) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);

  if (settings.accentLight) {
    root.style.setProperty('--accent', theme === 'light' ? settings.accentLight : (settings.accentDark || settings.accentLight));
  }
  if (settings.fontDisplay) root.style.setProperty('--font-display', settings.fontDisplay);
  if (settings.fontBody) root.style.setProperty('--font-body', settings.fontBody);

  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.textContent = theme === 'dark' ? '☀' : '☾';
  }

  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  return theme;
}

export function initTheme(settings) {
  const preferred = getStoredTheme() || settings?.defaultTheme || 'dark';
  return applyTheme(preferred, settings);
}

export function toggleTheme(settings) {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  return applyTheme(current === 'dark' ? 'light' : 'dark', settings);
}
