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
  return links
    .map(
      (link) =>
        `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`,
    )
    .join("");
}

export function renderPortfolio(data) {
  document.title = `${data.profile.name} · ${data.profile.title}`;
  document.querySelector("[data-profile-name]").textContent = data.profile.name;
  document.querySelector("[data-profile-title]").textContent = data.profile.title;
  document.querySelector("[data-profile-tagline]").textContent = data.profile.tagline;
  document.querySelector("[data-profile-status]").textContent = data.profile.status;
  document.querySelector("[data-profile-summary]").textContent = data.profile.summary;
  document.querySelector("[data-profile-location]").textContent = data.profile.location;

  const scoresEl = document.querySelector("[data-scores]");
  scoresEl.innerHTML = data.scores
    .map(
      (score) =>
        `<article class="metric-card reveal"><p>${escapeHtml(score.label)}</p><strong>${escapeHtml(score.value)}</strong></article>`,
    )
    .join("");

  const skillsEl = document.querySelector("[data-skills]");
  skillsEl.innerHTML = data.skills
    .map((skill) => `<span class="skill-pill reveal">${escapeHtml(skill)}</span>`)
    .join("");

  const timelineEl = document.querySelector("[data-experience]");
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

  const educationEl = document.querySelector("[data-education]");
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

  const projectsEl = document.querySelector("[data-projects]");
  projectsEl.innerHTML = data.projects
    .map(
      (project, index) => `
      <article class="project-card reveal" style="--delay:${index * 90}ms">
        ${
          project.thumbnail
            ? `<img class="project-thumb" src="${escapeHtml(project.thumbnail)}" alt="${escapeHtml(project.title)} thumbnail" />`
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

  document.querySelector("[data-achievements]").innerHTML = renderList(data.achievements);
  document.querySelector("[data-certifications]").innerHTML = renderList(data.certifications);
  document.querySelector("[data-interests]").innerHTML = data.interests
    .map((item) => `<span class="interest-chip">${escapeHtml(item)}</span>`)
    .join("");

  document.querySelector("[data-email]").href = `mailto:${data.contact.email}`;
  document.querySelector("[data-email]").textContent = data.contact.email;
  document.querySelector("[data-phone]").href = `tel:${data.contact.phone.replace(/\s+/g, "")}`;
  document.querySelector("[data-phone]").textContent = data.contact.phone;
  document.querySelector("[data-linkedin]").href = data.contact.linkedin;
  document.querySelector("[data-github]").href = data.contact.github;
  document.querySelector("[data-instagram]").href = data.contact.instagram;

  document.querySelector("[data-year]").textContent = new Date().getFullYear();
}
