const SECTION_ANIMATIONS = {
  intro: 'anim-fade-up',
  about: 'anim-slide-right',
  experience: 'anim-timeline',
  projects: 'anim-grid-stagger',
  contact: 'anim-glitch-in'
};

export function initScrollAnimations() {
  const sections = document.querySelectorAll('[data-section]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const type = el.dataset.animation || SECTION_ANIMATIONS[el.dataset.section] || 'anim-fade-up';
        el.classList.add('is-visible', type);
        el.querySelectorAll('[data-reveal]').forEach((child, i) => {
          child.style.setProperty('--reveal-delay', `${i * 0.08}s`);
          child.classList.add('is-revealed');
        });
        observer.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  sections.forEach((section) => observer.observe(section));
}
