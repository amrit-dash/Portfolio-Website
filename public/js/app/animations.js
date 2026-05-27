export function setupScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

  const sections = document.querySelectorAll("[data-animated-section]");
  sections.forEach((section, index) => {
    section.style.setProperty("--section-tilt", `${(index % 2 === 0 ? 1 : -1) * 0.5}deg`);
  });
}

export function setupFolderScrollAnimation() {
  const folder = document.querySelector("[data-folder]");
  if (!folder) return;

  const handleScroll = () => {
    const max = document.body.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    const openAmount = Math.min(progress * 1.6, 1);
    folder.style.setProperty("--folder-open", String(openAmount));
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
}
