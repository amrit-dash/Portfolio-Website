import { fetchPortfolioContent } from './core/content-service.js';
import { initTheme, toggleTheme } from './core/theme.js';
import { renderPortfolio, bindCvDownload } from './ui/render-portfolio.js';
import { initScrollAnimations } from './ui/scroll-animations.js';
import { runBootScreen } from './ui/boot-screen.js';
import { initThreeBackground } from './ui/three-bg.js';

let portfolioContent = null;

async function init() {
  portfolioContent = await fetchPortfolioContent();
  const settings = portfolioContent.settings || {};

  initTheme(settings);

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    toggleTheme(settings);
  });

  renderPortfolio(portfolioContent);
  bindCvDownload(() => portfolioContent);

  runBootScreen(settings.bootLines || ['Booting portfolio...'], () => {
    document.body.classList.remove('is-booting');
    initScrollAnimations();
  });

  const canvas = document.getElementById('bg-canvas');
  initThreeBackground(canvas);

  initNav();
  initFolderDock();
  document.getElementById('current-year').textContent = new Date().getFullYear();
}

function initNav() {
  const header = document.querySelector('.taskbar');
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('.taskbar__nav');

  toggle?.addEventListener('click', () => {
    nav?.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', nav?.classList.contains('is-open'));
  });

  document.querySelectorAll('.smoothscroll, .folder-icon').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href?.startsWith('#')) return;
      e.preventDefault();
      const target = document.querySelector(href);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      nav?.classList.remove('is-open');
    });
  });

  const sections = document.querySelectorAll('[data-section]');
  const navLinks = document.querySelectorAll('[data-nav-section]');
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach((a) => {
          a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`);
        });
      });
    },
    { threshold: 0.35 }
  );
  sections.forEach((s) => spy.observe(s));

  window.addEventListener('scroll', () => {
    header?.classList.toggle('taskbar--scrolled', window.scrollY > 40);
  }, { passive: true });
}

function initFolderDock() {
  document.querySelectorAll('.folder-icon').forEach((icon) => {
    icon.addEventListener('mouseenter', () => icon.classList.add('folder-icon--hover'));
    icon.addEventListener('mouseleave', () => icon.classList.remove('folder-icon--hover'));
  });
}

init().catch((err) => {
  console.error('[portfolio] init failed', err);
  document.body.classList.remove('is-booting');
});
