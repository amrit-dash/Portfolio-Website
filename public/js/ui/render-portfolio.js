function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

export function renderPortfolio(content) {
  renderNav(content);
  renderIntro(content);
  renderAbout(content);
  renderExperience(content);
  renderProjects(content);
  renderContact(content);
}

function renderNav(content) {
  const name = content.profile?.name || 'Amrit Dash';
  document.querySelectorAll('[data-bind="brand"]').forEach((n) => { n.textContent = name; });
}

function renderIntro(content) {
  const p = content.profile;
  const pre = document.querySelector('[data-bind="pretitle"]');
  const headline = document.querySelector('[data-bind="headline"]');
  const social = document.querySelector('[data-bind="intro-social"]');

  if (pre) pre.textContent = p.pretitle || 'Hey There';
  if (headline) {
    headline.innerHTML = (p.headline || []).map((line) => `<span class="headline-line">${line}</span>`).join('');
  }
  if (social) {
    social.innerHTML = (p.social || [])
      .map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></li>`)
      .join('');
  }
}

function renderAbout(content) {
  const p = content.profile;
  const summary = document.querySelector('[data-bind="summary"]');
  const photo = document.querySelector('[data-bind="about-photo"]');
  const skills = document.querySelector('[data-bind="skills"]');

  if (summary) summary.textContent = p.summary || '';
  if (photo) {
    photo.src = p.aboutPhoto || 'images/about-photo.jpg';
    photo.srcset = `${p.aboutPhoto} 1x, ${p.aboutPhoto2x || p.aboutPhoto} 2x`;
  }
  if (skills) {
    skills.innerHTML = (content.skills || [])
      .map((s) => `<li data-reveal>${s}</li>`)
      .join('');
  }

  const eduContainer = document.querySelector('[data-bind="education-timeline"]');
  if (eduContainer) {
    eduContainer.innerHTML = (content.education || []).map(renderTimelineBlock).join('');
  }
}

function renderExperience(content) {
  const container = document.querySelector('[data-bind="experience-timeline"]');
  if (!container) return;
  container.innerHTML = (content.experience || [])
    .map((item) => renderTimelineBlock(item, item.highlight))
    .join('');
}

function renderTimelineBlock(item, highlight = false) {
  return `
    <article class="timeline__block ${highlight ? 'timeline__block--highlight' : ''}" data-reveal>
      <div class="timeline__bullet"></div>
      <div class="timeline__body">
        <header class="timeline__header">
          <h4 class="timeline__title">${item.company || item.title}</h4>
          <p class="timeline__meta">${item.role || item.subtitle || ''}</p>
          ${item.period ? `<p class="timeline__time">${item.period}</p>` : ''}
        </header>
        <p class="timeline__desc">${item.description || ''}</p>
      </div>
    </article>
  `;
}

function renderProjects(content) {
  const grid = document.querySelector('[data-bind="projects-grid"]');
  const modals = document.querySelector('[data-bind="project-modals"]');
  if (!grid || !modals) return;

  const projects = content.projects || [];
  grid.innerHTML = projects
    .map((proj, i) => {
      const modalId = `modal-${proj.id}`;
      return `
        <li class="project-card ${proj.featured ? 'project-card--featured' : ''}" data-reveal style="--reveal-delay:${i * 0.06}s">
          <button type="button" class="project-card__open" data-modal="${modalId}" aria-haspopup="dialog">
            <div class="project-card__thumb">
              <img src="${proj.thumbnail}" alt="" loading="lazy" width="600" height="650">
            </div>
            <div class="project-card__meta">
              <span class="project-card__cat">${proj.category}</span>
              <h3 class="project-card__title">${proj.title}</h3>
            </div>
          </button>
          ${(proj.links || []).slice(0, 1).map((l) => `
            <a class="project-card__ext" href="${l.url}" target="_blank" rel="noopener" title="${l.label}">↗</a>
          `).join('')}
        </li>
      `;
    })
    .join('');

  modals.innerHTML = projects
    .map((proj) => {
      const modalId = `modal-${proj.id}`;
      const tags = (proj.tags || []).map((t) => `<li>${t}</li>`).join('');
      const links = (proj.links || [])
        .map((l) => `<a class="btn" href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`)
        .join('');
      return `
        <dialog class="project-modal" id="${modalId}">
          <div class="project-modal__inner">
            <button type="button" class="project-modal__close" data-close-modal aria-label="Close">×</button>
            <img class="project-modal__img" src="${proj.gallery || proj.thumbnail}" alt="">
            <div class="project-modal__content">
              <p class="project-modal__cat">${proj.category}</p>
              <h3>${proj.title}</h3>
              <p>${proj.description}</p>
              <ul class="project-modal__tags">${tags}</ul>
              <div class="project-modal__actions">${links}</div>
            </div>
          </div>
        </dialog>
      `;
    })
    .join('');

  grid.querySelectorAll('[data-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-modal');
      document.getElementById(id)?.showModal();
    });
  });
  modals.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('dialog')?.close());
  });
  modals.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target === d) d.close();
    });
  });
}

function renderContact(content) {
  const c = content.contact || {};
  const p = content.profile || {};
  const heading = document.querySelector('[data-bind="contact-heading"]');
  const message = document.querySelector('[data-bind="contact-message"]');
  const email = document.querySelector('[data-bind="contact-email"]');
  const phone = document.querySelector('[data-bind="contact-phone"]');
  const social = document.querySelector('[data-bind="contact-social"]');

  if (heading) heading.textContent = c.heading || 'Get In Touch';
  if (message) message.textContent = c.message || '';
  if (email) {
    email.href = `mailto:${p.email}`;
    email.textContent = p.email;
  }
  if (phone) {
    phone.href = `tel:${(p.phone || '').replace(/\s/g, '')}`;
    phone.textContent = p.phone;
  }
  if (social) {
    const items = [...(p.social || []), ...(c.extraSocial || [])];
    social.innerHTML = items
      .filter((s) => s.label !== 'Email')
      .map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></li>`)
      .join('');
    if (c.whatsapp) {
      social.innerHTML += `<li><a href="${c.whatsapp}" target="_blank" rel="noopener">WhatsApp</a></li>`;
    }
  }
}

export function bindCvDownload(getContent) {
  const refresh = () => {
    const btn = document.querySelector('[data-bind="cv-download"]');
    if (!btn) return;
    const content = getContent();
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const assets = content?.assets || {};
    const url =
      (theme === 'dark' ? assets.cvDarkStorage || assets.cvDark : assets.cvLightStorage || assets.cvLight) ||
      assets.cvLight;
    btn.href = url;
    btn.setAttribute('download', '');
  };
  refresh();
  document.addEventListener('themechange', refresh);
  return refresh;
}
