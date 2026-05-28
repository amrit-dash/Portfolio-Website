// Bootstrap for the public portfolio page.

import { loadPortfolio } from './data.js';
import { renderAll } from './render.js';
import { initRevealOnScroll, initScrollSpy, initSmoothScroll, initMobileMenu } from './scroll.js';
import { initCursor } from './cursor.js';
import { initHero3D } from './hero3d.js';
import {
  applyTheme, applyAccent, applyFonts, bindThemeToggle, bindCvDownload, getInitialTheme,
} from './theme.js';

async function boot() {
  // Default-theme can be overridden by saved or by portfolio.json.theme.defaultMode.
  // We apply a guess before fetching to avoid flicker.
  const guessed = getInitialTheme('dark');
  applyTheme(guessed, { silent: true });

  let data;
  try {
    data = await loadPortfolio();
  } catch (err) {
    console.error('Failed to load portfolio.json', err);
    data = {};
  }

  // Theme defaults (only apply if user hasn't picked one before).
  const saved = localStorage.getItem('amritdash:theme');
  if (!saved && data?.theme?.defaultMode) {
    applyTheme(data.theme.defaultMode, { silent: true });
  }
  if (data?.theme) {
    applyAccent(data.theme.accent, data.theme.accentAlt);
    applyFonts({
      fontDisplay: data.theme.fontDisplay,
      fontBody: data.theme.fontBody,
      fontMono: data.theme.fontMono,
    });
  }

  renderAll(data);
  bindCvDownload(data.cv || {});
  bindThemeToggle();
  initSmoothScroll();
  initMobileMenu();
  initRevealOnScroll();
  initScrollSpy();
  initCursor();

  // Three.js hero — non-blocking, soft-fail.
  initHero3D().catch(err => console.warn('Hero 3D failed', err));

  // Hide preloader once first paint is settled.
  requestAnimationFrame(() => {
    setTimeout(() => document.getElementById('preload')?.classList.add('is-done'), 400);
  });

  // Re-render on storage change OR explicit postMessage from the admin parent.
  window.addEventListener('storage', (e) => {
    if (e.key === 'amritdash:portfolio:overrides') location.reload();
  });
  window.addEventListener('message', (e) => {
    if (e && e.data === 'amritdash:refresh') location.reload();
  });
}

boot();
