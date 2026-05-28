export function initScrollReveal() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = document.querySelectorAll("[data-reveal]");
  if (prefersReduced || document.documentElement.classList.contains("reduced-motion")) {
    els.forEach((el) => el.classList.add("is-visible"));
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
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  els.forEach((el) => {
    el.style.transition = "opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)";
    observer.observe(el);
  });
}

export function initSectionAnimations() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  gsap.from("#hero-root > *", {
    opacity: 0,
    y: 40,
    duration: 1,
    stagger: 0.12,
    ease: "power3.out",
    delay: 0.3,
  });

  gsap.utils.toArray(".timeline-item").forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: "top 85%", toggleActions: "play none none reverse" },
      x: i % 2 === 0 ? -24 : 24,
      opacity: 0,
      duration: 0.7,
      ease: "power2.out",
    });
  });

  gsap.utils.toArray(".project-card").forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: "top 90%" },
      y: 48,
      opacity: 0,
      rotation: i % 2 === 0 ? -2 : 2,
      duration: 0.8,
      ease: "back.out(1.2)",
    });
  });
}

export function initHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

export function initJourneyRail() {
  const rail = document.getElementById("journey-rail");
  if (!rail) return;
  const links = rail.querySelectorAll("a");
  const sections = [...links].map((a) => document.getElementById(a.dataset.section || a.getAttribute("href").slice(1))).filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${id}`));
        }
      });
    },
    { threshold: 0.35 }
  );

  sections.forEach((s) => observer.observe(s));
}

export function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      closeMobileNav();
    });
  });
}

function closeMobileNav() {
  document.querySelector(".nav-mobile")?.classList.remove("is-open");
}

export function initMobileNav() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-mobile");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => nav.classList.toggle("is-open"));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("is-open")));
}

export function initCustomCursor() {
  if (!document.body.classList.contains("cursor-glow")) return;
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  if (!dot || !ring) return;

  let mx = 0;
  let my = 0;
  let rx = 0;
  let ry = 0;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = `${mx}px`;
    dot.style.top = `${my}px`;
  });

  function animate() {
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    ring.style.left = `${rx}px`;
    ring.style.top = `${ry}px`;
    requestAnimationFrame(animate);
  }
  animate();
}
