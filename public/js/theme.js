// Light / dark theme + CV swap + accent color tokens.

const THEME_KEY = 'amritdash:theme';

export function getInitialTheme(defaultMode = 'dark') {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return defaultMode;
}

export function applyTheme(mode, { silent = false, originEvent } = {}) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  localStorage.setItem(THEME_KEY, mode);
  updateThemeIcon(mode);
  if (!silent) {
    triggerThemeFlash(originEvent);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { mode } }));
  }
}

export function applyAccent(accent, accentAlt) {
  const root = document.documentElement;
  if (accent) {
    root.style.setProperty('--accent', accent);
    const rgb = hexToRgb(accent);
    if (rgb) root.style.setProperty('--accent-rgb', `${rgb.r},${rgb.g},${rgb.b}`);
  }
  if (accentAlt) root.style.setProperty('--accent-2', accentAlt);
}

export function applyFonts({ fontDisplay, fontBody, fontMono } = {}) {
  const root = document.documentElement;
  if (fontDisplay) root.style.setProperty('--font-display', fontDisplay);
  if (fontBody) root.style.setProperty('--font-body', fontBody);
  if (fontMono) root.style.setProperty('--font-mono', fontMono);
}

export function bindThemeToggle(selector = '#theme-toggle') {
  const btn = document.querySelector(selector);
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark', { originEvent: e });
  });
  updateThemeIcon(document.documentElement.getAttribute('data-theme'));
}

export function bindCvDownload(cv) {
  // CV depends on current theme: light theme → light cv; dark → dark cv.
  const update = () => {
    const mode = document.documentElement.getAttribute('data-theme') || 'dark';
    const file = mode === 'light' ? cv.light : cv.dark;
    document.querySelectorAll('[id^="cv-btn"]').forEach(el => {
      el.setAttribute('href', file);
      el.setAttribute('download', '');
    });
  };
  update();
  document.addEventListener('themechange', update);
}

function updateThemeIcon(mode) {
  const icon = document.getElementById('theme-icon');
  if (!icon) return;
  if (mode === 'light') {
    icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

function triggerThemeFlash(e) {
  const root = document.documentElement;
  if (e && typeof e.clientX === 'number') {
    root.style.setProperty('--fx', `${e.clientX}px`);
    root.style.setProperty('--fy', `${e.clientY}px`);
  } else {
    root.style.setProperty('--fx', '50%');
    root.style.setProperty('--fy', '20%');
  }
  document.body.classList.remove('theme-flash');
  // restart animation
  void document.body.offsetWidth;
  document.body.classList.add('theme-flash');
  setTimeout(() => document.body.classList.remove('theme-flash'), 950);
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
