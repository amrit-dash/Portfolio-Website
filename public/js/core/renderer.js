function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "className") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("data")) node.setAttribute(k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), v);
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  });
  children.flat().forEach((c) => {
    if (c == null) return;
    node.append(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

export function renderSite(data) {
  document.title = `${data.profile.name} — ${data.profile.title}`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = data.meta?.description || "";

  renderHero(data);
  renderAbout(data);
  renderSkills(data);
  renderExperience(data);
  renderEducation(data);
  renderProjects(data);
  renderContact(data);
  renderJourneyRail(data);
  setupCvDownload(data);
}

function renderHero(data) {
  const p = data.profile;
  const root = document.getElementById("hero-root");
  if (!root) return;

  const currentRole = data.experience?.find((e) => e.current);
  const statusText = currentRole
    ? `Currently · ${currentRole.role} @ ${currentRole.company}`
    : p.title;

  root.innerHTML = "";
  root.append(
    el("div", { className: "hero-badge", "data-reveal": "" }, [
      el("span", { className: "pulse" }),
      statusText,
    ]),
    el("h1", { "data-reveal": "" }, [
      "Building ",
      el("span", { className: "gradient-text", text: "automation" }),
      " & ",
      el("span", { className: "gradient-text", text: "AI" }),
      " experiences.",
    ]),
    el("p", { className: "hero-lead", "data-reveal": "", text: p.tagline }),
    el("div", { className: "hero-actions", "data-reveal": "" }, [
      el("a", { className: "btn btn-primary", href: "#contact", text: "Start a conversation" }),
      el("a", {
        className: "btn btn-ghost",
        id: "cv-download",
        href: p.cvLight,
        download: "",
        "data-cv-light": p.cvLight,
        "data-cv-dark": p.cvDark,
        text: "Download CV",
      }),
    ]),
    el(
      "ul",
      { className: "hero-social", "data-reveal": "" },
      p.social.map((s) => el("li", {}, [el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.label })]))
    ),
    el("a", { className: "scroll-hint", href: "#about", "data-reveal": "" }, [
      "Explore the journey",
      el("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", html: '<path stroke="currentColor" stroke-width="2" d="M12 5v14M5 12l7 7 7-7"/>' }),
    ])
  );
}

function renderAbout(data) {
  const aboutText = document.getElementById("about-text");
  if (aboutText) aboutText.textContent = data.about?.summary || "";

  const photo = document.getElementById("about-photo");
  if (photo && data.profile.photo) {
    photo.src = data.profile.photo;
    if (data.profile.photo2x) photo.srcset = `${data.profile.photo} 1x, ${data.profile.photo2x} 2x`;
    photo.alt = data.profile.name;
  }
}

function renderSkills(data) {
  const grid = document.getElementById("skills-grid");
  if (!grid) return;
  grid.innerHTML = "";
  (data.skills || []).forEach((skill, i) => {
    grid.append(el("div", { className: "skill-chip", "data-reveal": "", style: `transition-delay: ${i * 40}ms` }, skill));
  });
}

function renderExperience(data) {
  const timeline = document.getElementById("experience-timeline");
  if (!timeline) return;
  timeline.innerHTML = "";
  (data.experience || []).forEach((item, i) => {
    timeline.append(
      el("article", {
        className: `timeline-item${item.current ? " is-current" : ""}`,
        "data-reveal": "",
        style: `transition-delay: ${i * 80}ms`,
      }, [
        el("div", { className: "timeline-meta", text: item.timeframe }),
        el("h3", { className: "timeline-role", text: item.role }),
        el("div", { className: "timeline-company", text: item.company }),
        el("p", { text: item.description }),
      ])
    );
  });
}

function renderEducation(data) {
  const edu = document.getElementById("education-cards");
  if (edu) {
    edu.innerHTML = "";
    (data.education || []).forEach((e) => {
      edu.append(
        el("div", { className: "edu-card", "data-reveal": "" }, [
          el("h4", { text: e.school }),
          el("p", { text: e.degree }),
          el("p", { className: "timeline-meta", text: e.timeframe }),
          el("p", { text: e.description }),
        ])
      );
    });
  }

  const scores = document.getElementById("scores-grid");
  if (scores) {
    scores.innerHTML = "";
    (data.scores || []).forEach((s) => {
      scores.append(
        el("div", { className: "score-card", "data-reveal": "" }, [
          el("div", { className: "value", text: s.value }),
          el("div", { text: s.label }),
        ])
      );
    });
  }

  const certs = document.getElementById("cert-list");
  if (certs) {
    certs.innerHTML = "";
    (data.certifications || []).forEach((c) => certs.append(el("li", { "data-reveal": "", text: c })));
  }

  const ach = document.getElementById("achievements-grid");
  if (ach) {
    ach.innerHTML = "";
    (data.achievements || []).forEach((a) => {
      ach.append(
        el("div", { className: "achievement-card", "data-reveal": "" }, [
          el("h4", { text: a.title }),
          el("p", { text: a.description }),
        ])
      );
    });
  }

  const interests = document.getElementById("interests-row");
  if (interests) {
    interests.innerHTML = "";
    (data.interests || []).forEach((i) => interests.append(el("span", { className: "interest-pill", text: i })));
  }
}

function renderProjects(data) {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;
  grid.innerHTML = "";
  (data.projects || []).forEach((proj, i) => {
    const card = el("article", {
      className: "project-card",
      "data-reveal": "",
      "data-project-id": proj.id,
      style: `transition-delay: ${(i % 6) * 60}ms`,
      tabindex: "0",
      role: "button",
    }, [
      el("img", { src: proj.thumbnail, alt: proj.title, loading: "lazy" }),
      el("div", { className: "project-card-body" }, [
        el("div", { className: "project-cat", text: proj.category }),
        el("h3", { text: proj.title }),
      ]),
    ]);
    card.addEventListener("click", () => openProjectModal(proj));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openProjectModal(proj);
      }
    });
    grid.append(card);
  });
}

function openProjectModal(proj) {
  const overlay = document.getElementById("project-modal");
  if (!overlay) return;
  const body = overlay.querySelector(".modal-body");
  const img = overlay.querySelector(".modal-image");
  if (img) {
    img.src = proj.gallery || proj.thumbnail;
    img.alt = proj.title;
  }
  if (body) {
    body.innerHTML = "";
    body.append(
      el("h2", { text: proj.title }),
      el("p", { className: "project-cat", text: proj.category }),
      el("p", { text: proj.description }),
      el(
        "ul",
        { className: "modal-tags" },
        (proj.tags || []).map((t) => el("li", { text: t }))
      ),
      el(
        "div",
        { className: "modal-actions" },
        (proj.links || []).map((l) =>
          el("a", { className: "btn btn-primary", href: l.url, target: "_blank", rel: "noopener", text: l.label })
        )
      )
    );
  }
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
}

export function closeProjectModal() {
  const overlay = document.getElementById("project-modal");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
}

function renderContact(data) {
  const c = data.contact || {};
  const headline = document.getElementById("contact-headline");
  const sub = document.getElementById("contact-sub");
  const cta = document.getElementById("contact-cta");
  if (headline) headline.textContent = c.headline || "";
  if (sub) sub.textContent = c.subtext || "";
  if (cta) {
    cta.href = `mailto:${data.profile.email}`;
    cta.textContent = c.cta || "Say Hello";
  }

  const email = document.getElementById("contact-email");
  const phone = document.getElementById("contact-phone");
  if (email) {
    email.href = `mailto:${data.profile.email}`;
    email.textContent = data.profile.email;
  }
  if (phone) {
    phone.href = `tel:${data.profile.phone.replace(/\s/g, "")}`;
    phone.textContent = data.profile.phone;
  }

  const social = document.getElementById("contact-social");
  if (social) {
    social.innerHTML = "";
    data.profile.social.forEach((s) => {
      if (s.label === "Email") return;
      social.append(el("li", {}, [el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.label })]));
    });
  }
}

function renderJourneyRail(data) {
  const rail = document.getElementById("journey-rail");
  if (!rail) return;
  const sections = [
    { id: "hero", label: "Home" },
    { id: "about", label: "About" },
    { id: "skills", label: "Skills" },
    { id: "experience", label: "Experience" },
    { id: "projects", label: "Projects" },
    { id: "contact", label: "Contact" },
  ];
  rail.innerHTML = "";
  sections.forEach((s) => {
    rail.append(el("a", { href: `#${s.id}`, title: s.label, "data-section": s.id }));
  });
}

function setupCvDownload(data) {
  const cvBtn = document.getElementById("cv-download");
  if (!cvBtn) return;
  cvBtn.dataset.cvLight = data.profile.cvLight;
  cvBtn.dataset.cvDark = data.profile.cvDark;
}
