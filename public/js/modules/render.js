import { escapeHtml } from "./utils.js";

export function renderSite(content) {
  renderIntro(content);
  renderAbout(content);
  renderSkills(content);
  renderExperience(content);
  renderEducationBlock(content);
  renderProjects(content);
  renderContact(content);
  setCvDataset(content);
}

function renderIntro({ profile, intro }) {
  setText("[data-bind='intro-pretitle']", intro?.pretitle);
  setText("[data-bind='intro-headline']", intro?.headline || profile?.name);
  const rolesEl = document.querySelector("[data-bind='intro-roles']");
  if (rolesEl && intro?.roles) {
    rolesEl.innerHTML = intro.roles.map((r) => `<span class="role-chip">${escapeHtml(r)}</span>`).join("");
  }
  setText("[data-bind='intro-subtitle']", intro?.subtitle);
  setText("[data-bind='nav-brand']", profile?.name);
}

function renderAbout({ about, profile }) {
  setText("[data-bind='about-summary']", about?.summary);
  const img = document.querySelector("[data-bind='about-photo']");
  if (img && profile?.aboutPhoto) {
    img.src = profile.aboutPhoto;
    if (profile.aboutPhoto2x) img.srcset = `${profile.aboutPhoto} 1x, ${profile.aboutPhoto2x} 2x`;
    img.alt = profile.name;
  }
}

function renderSkills({ skills }) {
  const el = document.querySelector("[data-bind='skills-list']");
  if (!el || !skills) return;
  el.innerHTML = skills.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
}

function renderExperience({ experience }) {
  const track = document.querySelector("[data-bind='timeline-experience']");
  if (!track || !experience) return;
  track.innerHTML = experience
    .map(
      (job) => `
    <article class="timeline-card ${job.current ? "is-current" : ""}" data-animate="slide-left">
      <div class="timeline-card__marker"></div>
      <div class="timeline-card__body folder-panel">
        <header>
          <p class="timeline-card__time">${escapeHtml(job.timeframe)}</p>
          <h3>${escapeHtml(job.company)}</h3>
          <p class="timeline-card__role">${escapeHtml(job.role)}</p>
        </header>
        <ul>${(job.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
      </div>
    </article>`
    )
    .join("");
}

function renderEducationBlock({ education, scores, certifications, achievements, interests }) {
  const edu = document.querySelector("[data-bind='timeline-education']");
  if (edu && education) {
    edu.innerHTML = education
      .map(
        (e) => `
      <article class="timeline-card" data-animate="slide-right">
        <div class="timeline-card__marker"></div>
        <div class="timeline-card__body folder-panel">
          <p class="timeline-card__time">${escapeHtml(e.timeframe)}</p>
          <h3>${escapeHtml(e.title)}</h3>
          <p class="timeline-card__role">${escapeHtml(e.subtitle)}</p>
          <p>${escapeHtml(e.description)}</p>
        </div>
      </article>`
      )
      .join("");
  }

  const scoresEl = document.querySelector("[data-bind='scores-grid']");
  if (scoresEl && scores) {
    scoresEl.innerHTML = `
      <div class="score-pill"><span>CGPA</span><strong>${escapeHtml(scores.cgpa)}</strong></div>
      <div class="score-pill"><span>IELTS</span><strong>${escapeHtml(scores.ielts)}</strong></div>
      <div class="score-pill"><span>GRE</span><strong>${escapeHtml(scores.gre)}</strong></div>`;
  }

  renderList("[data-bind='cert-list']", certifications);
  renderList("[data-bind='achievements-list']", achievements);
  renderList("[data-bind='interests-list']", interests, "tag");
}

function renderProjects({ projects }) {
  const grid = document.querySelector("[data-bind='projects-grid']");
  const modals = document.querySelector("[data-bind='project-modals']");
  if (!grid || !projects) return;

  grid.innerHTML = projects
    .map(
      (p, i) => `
    <article class="project-card folder-tile" data-animate="flip-up" style="--stagger:${i}">
      <button type="button" class="project-card__open" data-project-open="${escapeHtml(p.id)}" aria-label="Open ${escapeHtml(p.title)}">
        <div class="project-card__thumb">
          <img src="${escapeHtml(p.thumb)}" alt="" loading="lazy" width="600" height="450">
        </div>
        <div class="project-card__meta">
          <span class="project-card__cat">${escapeHtml(p.category)}</span>
          <h3>${escapeHtml(p.title)}</h3>
        </div>
      </button>
    </article>`
    )
    .join("");

  if (modals) {
    modals.innerHTML = projects
      .map(
        (p) => `
      <dialog class="project-modal" id="modal-${escapeHtml(p.id)}" data-project-modal="${escapeHtml(p.id)}">
        <div class="project-modal__inner folder-panel">
          <button type="button" class="project-modal__close" data-modal-close aria-label="Close">×</button>
          <img src="${escapeHtml(p.hero || p.thumb)}" alt="">
          <div class="project-modal__content">
            <p class="project-modal__cat">${escapeHtml(p.category)}</p>
            <h2>${escapeHtml(p.title)}</h2>
            <p>${escapeHtml(p.description)}</p>
            <ul class="tag-row">${(p.tags || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
            <div class="project-modal__links">
              ${(p.links || [])
                .map(
                  (l) =>
                    `<a href="${escapeHtml(l.url)}" class="btn btn--primary" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`
                )
                .join("")}
            </div>
          </div>
        </div>
      </dialog>`
      )
      .join("");
  }
}

function renderContact({ contact, profile }) {
  setText("[data-bind='contact-headline']", contact?.headline);
  setText("[data-bind='contact-pretitle']", contact?.pretitle);
  setAttr("[data-bind='contact-email']", "href", `mailto:${profile?.email}`);
  setText("[data-bind='contact-email']", profile?.email);
  setAttr("[data-bind='contact-phone']", "href", `tel:${(profile?.phone || "").replace(/\s/g, "")}`);
  setText("[data-bind='contact-phone']", profile?.phone);
  setAttr("[data-bind='social-linkedin']", "href", profile?.linkedin);
  setAttr("[data-bind='social-github']", "href", profile?.github);
  setAttr("[data-bind='social-whatsapp']", "href", contact?.whatsapp);
  setAttr("[data-bind='social-about']", "href", contact?.aboutMe);
  setAttr("[data-bind='social-instagram']", "href", profile?.instagram);
}

function setCvDataset({ about }) {
  const btn = document.querySelector("[data-cv-download]");
  if (!btn || !about) return;
  btn.dataset.cvLight = about.cvLightUrl || "/assets/cv/cv-light.pdf";
  btn.dataset.cvDark = about.cvDarkUrl || "/assets/cv/cv-dark.pdf";
}

function renderList(selector, items, className = "") {
  const el = document.querySelector(selector);
  if (!el || !items) return;
  el.innerHTML = items
    .map((item) => `<li class="${className}">${escapeHtml(item)}</li>`)
    .join("");
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => {
    if (value != null) el.textContent = value;
  });
}

function setAttr(selector, attr, value) {
  document.querySelectorAll(selector).forEach((el) => {
    if (value != null) el.setAttribute(attr, value);
  });
}
