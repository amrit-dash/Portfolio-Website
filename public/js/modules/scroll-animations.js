export function initScrollAnimations({ reducedMotion = false } = {}) {
  if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("[data-animate]").forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );

  document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));

  initSectionFolderReveal();
  initParallaxFolders();
}

function initSectionFolderReveal() {
  const sections = document.querySelectorAll(".section-folder");
  sections.forEach((section, index) => {
    section.style.setProperty("--folder-index", index);
    const observer = new IntersectionObserver(
      ([entry]) => {
        section.classList.toggle("is-open", entry.isIntersecting);
      },
      { threshold: 0.2 }
    );
    observer.observe(section);
  });
}

function initParallaxFolders() {
  const hero = document.querySelector(".hero-3d");
  if (!hero) return;

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY * 0.15;
      hero.style.transform = `translateY(${y}px) rotateX(${Math.min(y * 0.02, 8)}deg)`;
    },
    { passive: true }
  );
}
