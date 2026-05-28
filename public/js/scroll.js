// Scroll-triggered reveal + nav scroll-spy + smooth scroll.

export function initRevealOnScroll() {
  const els = document.querySelectorAll('[data-reveal], [data-reveal-stagger], .tl-item');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach(e => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
}

export function initScrollSpy() {
  const links = Array.from(document.querySelectorAll('.nav__links a'));
  const sections = links
    .map(l => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length) return;
  const map = new Map(sections.map((s, i) => [s, links[i]]));
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('is-active'));
        const link = map.get(entry.target);
        if (link) link.classList.add('is-active');
      }
    }
  }, { threshold: 0.4 });
  sections.forEach(s => io.observe(s));
}

export function initSmoothScroll() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const tgt = document.querySelector(id);
    if (!tgt) return;
    e.preventDefault();
    tgt.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // close mobile menu if open
    document.getElementById('nav')?.classList.remove('is-open');
  });
}

export function initMobileMenu() {
  const burger = document.getElementById('nav-burger');
  const nav = document.getElementById('nav');
  if (!burger || !nav) return;
  burger.addEventListener('click', () => nav.classList.toggle('is-open'));
}
