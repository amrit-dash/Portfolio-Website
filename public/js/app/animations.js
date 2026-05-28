const animationClassMap = {
  rise: "anim-rise",
  "slide-left": "anim-slide-left",
  "slide-right": "anim-slide-right",
  "scale-in": "anim-scale-in",
  flip: "anim-flip",
  timeline: "anim-timeline",
};

export function setupScrollAnimations() {
  document.querySelectorAll("[data-animated-section]").forEach((section) => {
    const mode = section.dataset.animation || "rise";
    section.classList.add(animationClassMap[mode] || "anim-rise");
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        if (entry.target.classList.contains("reveal")) {
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

  document.querySelectorAll("[data-animated-section]").forEach((section) => {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("section-visible");
          sectionObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );
    sectionObserver.observe(section);
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

export function setupJourneyRail() {
  const links = [...document.querySelectorAll("[data-journey-link]")];
  if (!links.length) return;

  const sections = links
    .map((link) => {
      const id = link.getAttribute("href")?.replace("#", "");
      const section = id ? document.getElementById(id) : null;
      return { link, section };
    })
    .filter((item) => item.section);

  const setActive = () => {
    const scrollPos = window.scrollY + window.innerHeight * 0.35;
    let activeId = sections[0]?.section.id;

    sections.forEach(({ section }) => {
      if (section.offsetTop <= scrollPos) activeId = section.id;
    });

    links.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${activeId}`;
      link.classList.toggle("is-active", isActive);
      link.setAttribute("aria-current", isActive ? "step" : "false");
    });
  };

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  window.addEventListener("scroll", setActive, { passive: true });
  setActive();
}

export function setupCustomCursor() {
  const glow = document.querySelector("[data-cursor-glow]");
  if (!glow || document.documentElement.dataset.customCursor !== "on") return;

  const move = (event) => {
    glow.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
  };

  window.addEventListener("pointermove", move, { passive: true });
}

export function setupMobileNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-site-nav]");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

export function setupPreloader() {
  const preloader = document.getElementById("preloader");
  const bar = document.querySelector("[data-preloader-progress]");
  if (!preloader) return;

  let progress = 0;
  const tick = window.setInterval(() => {
    progress = Math.min(progress + 12 + Math.random() * 18, 100);
    if (bar) bar.style.width = `${progress}%`;
    if (progress >= 100) window.clearInterval(tick);
  }, 90);

  const finish = () => {
    preloader.classList.add("is-done");
    window.setTimeout(() => preloader.remove(), 500);
  };

  if (document.readyState === "complete") {
    finish();
  } else {
    window.addEventListener("load", finish, { once: true });
  }
}

export function setupProjectModals(projects = [], getProjectModalPayload) {
  const modal = document.querySelector("[data-project-modal]");
  const body = document.querySelector("[data-project-modal-body]");
  const closeBtn = document.querySelector("[data-modal-close]");
  if (!modal || !body || typeof getProjectModalPayload !== "function") return;

  document.querySelector("[data-projects]")?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-project-index]");
    if (!card) return;
    const index = Number(card.dataset.projectIndex);
    const project = projects[index];
    if (!project) return;

    body.innerHTML = getProjectModalPayload(project);
    modal.showModal();
  });

  closeBtn?.addEventListener("click", () => modal.close());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
}
