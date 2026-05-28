// Scroll-triggered reveal + timeline progress + nav active link + top
// progress bar + simple section parallax. Re-entrant: can be called
// multiple times (used after re-renders from the admin panel).

const ioMap = new WeakMap();

function attachReveal() {
  if (document.documentElement.getAttribute("data-scroll-anims") === "off") return;
  const targets = document.querySelectorAll("[data-reveal], [data-reveal-stagger]");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  targets.forEach((el) => {
    if (!ioMap.get(el)) {
      io.observe(el);
      ioMap.set(el, io);
    }
  });
}

function attachNavSpy() {
  const sections = Array.from(document.querySelectorAll("section[id]"));
  const links = Array.from(document.querySelectorAll(".nav-links a[href^='#']"));
  if (!sections.length || !links.length) return;
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((l) => l.classList.remove("is-active"));
          const link = map.get(e.target.id);
          if (link) link.classList.add("is-active");
        }
      });
    },
    { threshold: 0.4 }
  );
  sections.forEach((s) => io.observe(s));
}

function attachProgressBar() {
  const bar = document.getElementById("progress-bar");
  if (!bar) return;
  const onScroll = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    bar.style.width = pct + "%";
  };
  document.removeEventListener("scroll", attachProgressBar._fn);
  attachProgressBar._fn = onScroll;
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function attachTimelineProgress() {
  const wrap = document.getElementById("timeline");
  const bar = document.getElementById("timeline-progress");
  if (!wrap || !bar) return;
  const onScroll = () => {
    const rect = wrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = rect.height;
    const passed = Math.min(Math.max(vh * 0.5 - rect.top, 0), total);
    bar.style.height = passed + "px";
  };
  document.removeEventListener("scroll", attachTimelineProgress._fn);
  attachTimelineProgress._fn = onScroll;
  document.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}

function bootHero() {
  const hero = document.getElementById("hero");
  if (!hero) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => hero.classList.add("is-ready"));
  });
}

export function initAnimations() {
  bootHero();
  attachReveal();
  attachNavSpy();
  attachProgressBar();
  attachTimelineProgress();
}
