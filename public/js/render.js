// Renders portfolio.json into the DOM. All sections are data-driven so that
// the admin dashboard can edit them and re-render without a page reload.

import { get } from './data.js';

export function renderAll(data) {
  document.title = get(data, 'meta.title') || document.title;
  setMetaDescription(get(data, 'meta.description'));

  bindSimpleFields(data);
  renderHero(data);
  renderAboutStats(data);
  renderSkills(data);
  renderExperience(data);
  renderProjects(data);
  renderEducation(data);
  renderAchievements(data);
  renderCertifications(data);
  renderSocials(data);
  applyPhoto(data);
}

function setMetaDescription(text) {
  if (!text) return;
  let m = document.querySelector('meta[name="description"]');
  if (!m) {
    m = document.createElement('meta');
    m.name = 'description';
    document.head.appendChild(m);
  }
  m.content = text;
}

function bindSimpleFields(data) {
  document.querySelectorAll('[data-bind]').forEach(el => {
    const v = get(data, el.getAttribute('data-bind'));
    if (typeof v === 'string') el.textContent = v;
  });
  document.querySelectorAll('[data-bind-href]').forEach(el => {
    const key = el.getAttribute('data-bind-href');
    const v = get(data, key);
    if (typeof v !== 'string') return;
    if (key === 'identity.email') el.setAttribute('href', `mailto:${v}`);
    else if (key === 'identity.phone') el.setAttribute('href', `tel:${v.replace(/\s+/g, '')}`);
    else if (key.startsWith('cv.')) el.setAttribute('href', v);
    else el.setAttribute('href', v);
  });
  document.querySelectorAll('[data-bind-toggle]').forEach(el => {
    const v = get(data, el.getAttribute('data-bind-toggle'));
    el.style.display = v ? '' : 'none';
  });
}

function applyPhoto(data) {
  const photo = get(data, 'identity.photoRetina') || get(data, 'identity.photo');
  const el = document.getElementById('about-photo');
  if (el && photo) el.style.backgroundImage = `url('${photo}')`;
}

function renderHero(data) {
  const role = get(data, 'identity.role');
  const name = get(data, 'identity.name');
  if (name) {
    document.querySelectorAll('[data-bind="identity.name"]').forEach(el => el.textContent = name);
  }
  if (role) {
    document.querySelectorAll('[data-bind="identity.role"]').forEach(el => el.textContent = role);
  }
}

function renderAboutStats(data) {
  const root = document.getElementById('about-stats');
  if (!root) return;
  const stats = get(data, 'about.stats') || [];
  root.innerHTML = stats.map(s => `
    <div class="stat">
      <div class="num">${escapeHTML(s.value)}</div>
      <div class="lbl">${escapeHTML(s.label)}</div>
    </div>`).join('');
}

function renderSkills(data) {
  const root = document.getElementById('skills-bento');
  if (!root) return;
  const groups = get(data, 'expertise') || [];
  root.innerHTML = groups.map(g => `
    <div class="cell">
      <span class="glow"></span>
      <h3>${escapeHTML(g.group)}</h3>
      <ul>${(g.items || []).map(i => `<li>${escapeHTML(i)}</li>`).join('')}</ul>
    </div>
  `).join('');
}

function renderExperience(data) {
  const root = document.getElementById('timeline');
  if (!root) return;
  const items = get(data, 'experience') || [];
  root.innerHTML = items.map(it => `
    <article class="tl-item ${it.current ? 'is-current' : ''}" data-reveal>
      <div class="tl-head">
        <h3 class="tl-role">${escapeHTML(it.role)}</h3>
        <span class="tl-company">@ ${escapeHTML(it.company)}</span>
        <span class="tl-period">${escapeHTML(it.period)}</span>
        ${it.current ? '<span class="tl-current-pill">Current</span>' : ''}
      </div>
      <p>${escapeHTML(it.summary)}</p>
      <ul class="tl-tags">
        ${(it.tags || []).map(t => `<li>${escapeHTML(t)}</li>`).join('')}
      </ul>
    </article>
  `).join('');
}

function renderProjects(data) {
  const root = document.getElementById('projects-grid');
  if (!root) return;
  const items = get(data, 'projects') || [];
  root.innerHTML = items.map((p, i) => `
    <article class="project" data-project="${i}" data-reveal>
      <div class="project__media" style="background-image:url('${p.image}')"></div>
      <button class="project__open" aria-label="Open project details">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
      </button>
      <div class="project__body">
        <div class="project__cat">${escapeHTML(p.category)}</div>
        <h3 class="project__title">${escapeHTML(p.title)}</h3>
        <p class="project__desc">${escapeHTML(p.summary)}</p>
        <ul class="project__tags">${(p.tags || []).map(t => `<li>${escapeHTML(t)}</li>`).join('')}</ul>
      </div>
    </article>
  `).join('');

  // Wire modals
  root.querySelectorAll('.project').forEach(el => {
    el.addEventListener('click', () => openModal(items[el.dataset.project]));
  });
}

function renderEducation(data) {
  const root = document.getElementById('education-cards');
  if (!root) return;
  const items = get(data, 'education') || [];
  root.innerHTML = items.map(it => `
    <div class="card">
      <div class="title">${escapeHTML(it.title)}</div>
      <div class="sub">${escapeHTML(it.subtitle || '')}</div>
      <div class="when">${escapeHTML(it.period || '')}</div>
      <div class="body">${escapeHTML(it.body || '')}</div>
    </div>
  `).join('');
}

function renderAchievements(data) {
  const root = document.getElementById('achievements-cards');
  if (!root) return;
  const items = get(data, 'achievements') || [];
  root.innerHTML = items.map(it => `
    <div class="card">
      <div class="title">${escapeHTML(it.title)}</div>
      <div class="body">${escapeHTML(it.body || '')}</div>
    </div>
  `).join('');
}

function renderCertifications(data) {
  const root = document.getElementById('cert-list');
  if (!root) return;
  const items = get(data, 'certifications') || [];
  root.innerHTML = items.map(c => `<li>${escapeHTML(c)}</li>`).join('');
}

function renderSocials(data) {
  const root = document.getElementById('socials-list');
  if (!root) return;
  const socials = get(data, 'identity.socials') || {};
  const labels = {
    linkedin: 'LinkedIn',
    github: 'GitHub',
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
    aboutme: 'About.me',
  };
  root.innerHTML = Object.entries(socials)
    .filter(([, v]) => v)
    .map(([k, v]) => `<li><a href="${v}" target="_blank" rel="noopener">${escapeHTML(labels[k] || k)}</a></li>`)
    .join('');
}

/* ---- Project modal ---- */
function openModal(p) {
  if (!p) return;
  const m = document.getElementById('project-modal');
  document.getElementById('modal-img').style.backgroundImage = `url('${p.image}')`;
  document.getElementById('modal-cat').textContent = p.category || '';
  document.getElementById('modal-title').textContent = p.title || '';
  document.getElementById('modal-desc').textContent = p.summary || '';
  document.getElementById('modal-tags').innerHTML = (p.tags || []).map(t => `<li>${escapeHTML(t)}</li>`).join('');
  document.getElementById('modal-links').innerHTML = (p.links || []).map(l =>
    `<a class="btn btn--accent" href="${l.url}" target="_blank" rel="noopener">${escapeHTML(l.label)}</a>`
  ).join('');
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const m = document.getElementById('project-modal');
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  if (e.target.matches('[data-modal-close]')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
