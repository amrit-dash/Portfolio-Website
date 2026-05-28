function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderList(items = []) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderProjectLinks(links = []) {
  if (!links.length) return '<span class="muted">Details on request</span>';
  return links
    .map(
      (link) =>
        `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`,
    )
    .join("");
}

function setTextAll(selector, value) {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = value;
  });
}

export function renderPortfolio(data) {
  document.title = `${data.profile.name} · ${data.profile.title}`;
  setTextAll("[data-profile-name]", data.profile.name);

  const titleEl = document.querySelector("[data-profile-title]");
  if (titleEl) titleEl.textContent = data.profile.title;

  const taglineEl = document.querySelector("[data-profile-tagline]");
  if (taglineEl) taglineEl.textContent = data.profile.tagline;

  const statusEl = document.querySelector("[data-profile-status]");
  if (statusEl) statusEl.textContent = data.profile.status;

  const summaryEl = document.querySelector("[data-profile-summary]");
  if (summaryEl) summaryEl.textContent = data.profile.summary;

  const locationEl = document.querySelector("[data-profile-location]");
  if (locationEl) locationEl.textContent = data.profile.location;

  const scoresEl = document.querySelector("[data-scores]");
  if (scoresEl) {
    scoresEl.innerHTML = data.scores
      .map(
        (score) =>
          `<article class="metric-card reveal"><p>${escapeHtml(score.label)}</p><strong>${escapeHtml(score.value)}</strong></article>`,
      )
      .join("");
  }

  const skillsEl = document.querySelector("[data-skills]");
  if (skillsEl) {
    skillsEl.innerHTML = data.skills
      .map((skill) => `<span class="skill-pill reveal">${escapeHtml(skill)}</span>`)
      .join("");
  }

  const timelineEl = document.querySelector("[data-experience]");
  if (timelineEl) {
    timelineEl.innerHTML = data.experience
      .map(
        (item, index) => `
        <article class="timeline-item reveal ${item.primary ? "is-primary" : ""}" style="--delay:${index * 70}ms">
          <header>
            <p class="timeline-period">${escapeHtml(item.period)}</p>
            <h3>${escapeHtml(item.role)}</h3>
            <p class="timeline-company">${escapeHtml(item.company)}</p>
          </header>
          <ul>${renderList(item.highlights)}</ul>
        </article>`,
      )
      .join("");
  }

  const educationEl = document.querySelector("[data-education]");
  if (educationEl) {
    educationEl.innerHTML = data.education
      .map(
        (item) => `
      <article class="education-card reveal">
        <p>${escapeHtml(item.period)}</p>
        <h3>${escapeHtml(item.school)}</h3>
        <h4>${escapeHtml(item.degree)}</h4>
        <p>${escapeHtml(item.details)}</p>
      </article>`,
      )
      .join("");
  }

  const volunteerEl = document.querySelector("[data-volunteer]");
  if (volunteerEl && data.volunteer) {
    volunteerEl.innerHTML = renderList(data.volunteer);
  }

  const projectsEl = document.querySelector("[data-projects]");
  if (projectsEl) {
    projectsEl.innerHTML = data.projects
      .map(
        (project, index) => `
      <article class="project-card reveal" data-project-index="${index}" tabindex="0" role="button" style="--delay:${index * 90}ms">
        ${
          project.thumbnail
            ? `<img class="project-thumb" src="${escapeHtml(project.thumbnail)}" alt="${escapeHtml(project.title)} thumbnail" loading="lazy" />`
            : '<div class="project-thumb project-thumb--placeholder" aria-hidden="true"></div>'
        }
        <div class="project-content">
          <p>${escapeHtml(project.type)}</p>
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.summary)}</p>
          <div class="project-tags">${project.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          <div class="project-links">${renderProjectLinks(project.links)}</div>
        </div>
      </article>`,
      )
      .join("");
  }

  const achievementsEl = document.querySelector("[data-achievements]");
  if (achievementsEl) achievementsEl.innerHTML = renderList(data.achievements);

  const certificationsEl = document.querySelector("[data-certifications]");
  if (certificationsEl) certificationsEl.innerHTML = renderList(data.certifications);

  const interestsEl = document.querySelector("[data-interests]");
  if (interestsEl) {
    interestsEl.innerHTML = data.interests
      .map((item) => `<span class="interest-chip">${escapeHtml(item)}</span>`)
      .join("");
  }

  const emailEl = document.querySelector("[data-email]");
  if (emailEl) {
    emailEl.href = `mailto:${data.contact.email}`;
    emailEl.textContent = data.contact.email;
  }

  const phoneEl = document.querySelector("[data-phone]");
  if (phoneEl) {
    phoneEl.href = `tel:${data.contact.phone.replace(/\s+/g, "")}`;
    phoneEl.textContent = data.contact.phone;
  }

  const websiteEl = document.querySelector("[data-website]");
  if (websiteEl && data.contact.website) {
    websiteEl.href = data.contact.website;
    websiteEl.textContent = data.contact.website.replace(/^https?:\/\//, "");
  }

  const linkedinEl = document.querySelector("[data-linkedin]");
  if (linkedinEl) linkedinEl.href = data.contact.linkedin;

  const githubEl = document.querySelector("[data-github]");
  if (githubEl) githubEl.href = data.contact.github;

  const instagramEl = document.querySelector("[data-instagram]");
  if (instagramEl) instagramEl.href = data.contact.instagram;

  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  applyUiSettings(data.ui, data.theme);
}

export function applyUiSettings(ui = {}, theme = {}) {
  const root = document.documentElement;
  const showRail = ui.showJourneyRail !== false;
  const rail = document.querySelector("[data-journey-rail]");
  if (rail) rail.hidden = !showRail;

  const cursorGlow = document.querySelector("[data-cursor-glow]");
  const useCursor = ui.customCursor ?? theme.customCursor ?? false;
  if (cursorGlow) cursorGlow.hidden = !useCursor;
  root.dataset.customCursor = useCursor ? "on" : "off";
}

export function getProjectModalPayload(project) {
  if (!project) return "";
  const image = project.image || project.thumbnail;
  return `
    ${image ? `<img class="modal-image" src="${escapeHtml(image)}" alt="${escapeHtml(project.title)}" />` : ""}
    <p class="label">${escapeHtml(project.type)}</p>
    <h3>${escapeHtml(project.title)}</h3>
    <p>${escapeHtml(project.summary)}</p>
    <div class="project-tags">${project.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    <div class="project-links">${renderProjectLinks(project.links)}</div>
  `;
}
