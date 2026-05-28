// Render the entire portfolio from the data store. Re-runnable: the
// admin dashboard calls render() again after every save so changes
// reflect live.

import { Theme } from "./theme.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const html = (s) => String(s ?? "");
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function render(data) {
  if (!data) return;

  // ---- Document chrome --------------------------------------------------
  document.title = `${data.profile.name} · ${data.profile.title}`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", `Portfolio of ${data.profile.name} — ${data.profile.title}.`);

  $("#brand-name").textContent = data.profile.name;
  $("#brand-mark").textContent = data.profile.shortName?.[0] || "A";

  // ---- Hero -------------------------------------------------------------
  $("#hero-kicker").textContent = data.hero.kicker;
  $("#hero-title").innerHTML = data.hero.lines
    .map((l) => `<span class="line"><span class="inner">${esc(l)}</span></span>`)
    .join("");
  $("#hero-sub").textContent = data.hero.subtitle;
  $("#hero-metrics").innerHTML = data.hero.metrics
    .map(
      (m) => `
      <div class="metric-card" data-reveal>
        <div class="v"><span>${esc(m.value)}</span></div>
        <div class="k">${esc(m.label)}</div>
      </div>`
    )
    .join("");
  const ctaP = $("#hero-cta-primary");
  if (ctaP) {
    ctaP.textContent = data.hero.ctaPrimary.label;
    ctaP.setAttribute("href", data.hero.ctaPrimary.href);
  }
  const ctaS = $("#hero-cta-secondary");
  if (ctaS) {
    const arrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12M6 10l6 6 6-6M4 20h16"/></svg>`;
    ctaS.innerHTML = `${esc(data.hero.ctaSecondary.label)} ${arrow}`;
    if (data.hero.ctaSecondary.href === "cv") {
      ctaS.setAttribute("data-cv-link", "");
      ctaS.setAttribute("download", "");
      ctaS.setAttribute("target", "_blank");
    } else {
      ctaS.removeAttribute("data-cv-link");
      ctaS.setAttribute("href", data.hero.ctaSecondary.href);
    }
  }

  // ---- About ------------------------------------------------------------
  $("#about-photo").innerHTML = `
    <img src="${esc(data.profile.photo)}" srcset="${esc(data.profile.photo)} 1x, ${esc(data.profile.photo2x)} 2x" alt="${esc(data.profile.name)}">
    <div class="about-badges">
      <span class="badge">${esc(data.profile.location)}</span>
      <span class="badge">${esc(data.profile.availability)}</span>
    </div>`;
  $("#about-headline").textContent = data.about.headline;
  $("#about-body").textContent = data.about.body;
  $("#about-facts").innerHTML = data.about.facts
    .map((f) => `<div class="fact"><div class="k">${esc(f.k)}</div><div class="v">${esc(f.v)}</div></div>`)
    .join("");

  // ---- Skills -----------------------------------------------------------
  $("#skill-groups").innerHTML = data.skills.groups
    .map(
      (g) => `
      <div class="skill-card" data-reveal>
        <h3>${esc(g.title)}</h3>
        <ul class="skill-tags">${g.items
          .map((i) => `<li>${esc(i)}</li>`)
          .join("")}</ul>
      </div>`
    )
    .join("");

  // ---- Experience timeline ---------------------------------------------
  $("#timeline").innerHTML =
    `<div class="timeline-progress" id="timeline-progress"></div>` +
    data.experience
      .map(
        (e) => `
      <div class="tl-item${e.current ? " is-current" : ""}" data-reveal>
        <div class="tl-bullet"></div>
        <div class="tl-meta">
          <span>${esc(e.period)}</span>
          ${e.current ? '<span class="tl-current-tag">Current</span>' : ""}
          ${e.location ? `<span>· ${esc(e.location)}</span>` : ""}
        </div>
        <h3 class="tl-role">${esc(e.role)}</h3>
        <p class="tl-company">${esc(e.company)}</p>
        <p class="tl-summary">${esc(e.summary)}</p>
        <ul class="tl-highlights">
          ${(e.highlights || []).map((h) => `<li>${esc(h)}</li>`).join("")}
        </ul>
        <ul class="tl-tags">${(e.tags || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      </div>`
      )
      .join("");

  // ---- Education + tests + certs + achievements ------------------------
  $("#edu-grid").innerHTML = data.education
    .map(
      (e) => `
      <div class="edu-card" data-reveal>
        <div class="meta">${esc(e.period)}</div>
        <h4>${esc(e.school)}</h4>
        <div class="body"><strong>${esc(e.degree)}</strong><br>${esc(e.score)}<br>${esc(e.notes)}</div>
      </div>`
    )
    .join("");
  $("#score-strip").innerHTML = data.tests
    .map((t) => `<div class="pair"><span class="name">${esc(t.name)}</span><span class="val">${esc(t.score)}</span></div>`)
    .join("");
  $("#cert-list").innerHTML = data.certifications
    .map((c) => `<li data-reveal><div class="name">${esc(c.name)}</div><div class="sub">${esc(c.issuer)} · ${esc(c.year)}</div></li>`)
    .join("");
  $("#ach-list").innerHTML = data.achievements
    .map((a) => `<li data-reveal><div class="name">${esc(a.title)}</div><div class="sub">${esc(a.detail)}</div></li>`)
    .join("");

  // ---- Projects (bento) ------------------------------------------------
  $("#bento").innerHTML = data.projects
    .map((p) => {
      const gh = p.github;
      // Cards show curated tags first; if a repo is wired, fall back to
      // its topics so the public site always has something to render
      // even when curated tags are intentionally short.
      const labels = (p.tags && p.tags.length ? p.tags : gh?.topics || []).slice(0, 4);
      const lang = gh?.primaryLanguage;
      const stars = gh?.stars ?? null;
      const forks = gh?.forks ?? null;
      const ghMeta = gh
        ? `<div class="gh-meta">
             ${lang ? `<span class="gh-chip"><span class="lang-dot" data-lang="${esc(lang)}"></span>${esc(lang)}</span>` : ""}
             ${stars !== null ? `<span class="gh-chip" title="Stars">${iconStar()}${stars}</span>` : ""}
             ${forks !== null ? `<span class="gh-chip" title="Forks">${iconFork()}${forks}</span>` : ""}
           </div>`
        : "";
      return `
      <article class="card size-${esc(p.size || "md")}" data-reveal data-project="${esc(p.id)}" data-cursor-hover>
        <div class="img" style="background-image:url('${esc(p.thumb)}')"></div>
        <span class="year-tag">${esc(p.year || "")}</span>
        ${gh ? '<span class="repo-tag" title="Linked to a GitHub repository">' + iconGithub() + '</span>' : ""}
        <div class="body">
          <div class="cat">${esc(p.category)}</div>
          <h3 class="title">${esc(p.title)}</h3>
          <p class="summary">${esc(p.summary)}</p>
          <ul class="tags">${labels.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          ${ghMeta}
        </div>
      </article>`;
    })
    .join("");

  // ---- Contact ---------------------------------------------------------
  const social = data.profile.social || {};
  const contactCards = [
    { k: "Email", v: data.profile.email, href: `mailto:${data.profile.email}`, ico: iconMail() },
    { k: "WhatsApp", v: data.profile.phone, href: data.profile.whatsapp, ico: iconChat() },
    { k: "LinkedIn", v: "linkedin.com/in/amritdash60", href: social.linkedin, ico: iconLink() },
    { k: "GitHub", v: "github.com/the-AoG-guy", href: social.github, ico: iconCode() },
    { k: "Instagram", v: "@_amrit_dash_", href: social.instagram, ico: iconCam() },
  ].filter((c) => c.href);
  $("#contact-cards").innerHTML = contactCards
    .map(
      (c) => `
      <a class="contact-card" href="${esc(c.href)}" target="_blank" rel="noopener" data-reveal data-cursor-hover>
        <span class="ico">${c.ico}</span>
        <span><span class="k">${esc(c.k)}</span><br><span class="v">${esc(c.v)}</span></span>
      </a>`
    )
    .join("");
  $("#contact-headline").innerHTML = `Got a build worth chatting about? <a href="mailto:${esc(data.profile.email)}">Say hello.</a>`;

  // ---- Footer ---------------------------------------------------------
  $("#footer-tagline").textContent = data.footer.tagline;
  $("#footer-name").textContent = data.profile.name;
  $("#current-year").textContent = String(new Date().getFullYear());

  // Refresh theme-driven attributes (CV link href etc.)
  Theme.data = data;
  Theme._apply();
}

function iconMail() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`;
}
function iconChat() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a8 8 0 1 1-3.6-6.7L21 4l-1.3 3.7A8 8 0 0 1 21 12Z"/></svg>`;
}
function iconLink() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="9" width="4" height="11"/><rect x="3" y="4" width="4" height="3"/><path d="M11 9h4v11h-4zM15 9h4v11h-4z"/></svg>`;
}
function iconCode() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18l-6-6 6-6M15 6l6 6-6 6"/></svg>`;
}
function iconCam() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`;
}

export function iconGithub() {
  return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.84 1.18 3.1 0 4.44-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.16v3.2c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>`;
}
export function iconStar() {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3 6.18 21l1.64-6.81L2.5 9.74l6.93-.59L12 2.75l2.57 6.4 6.93.59-5.32 4.45L17.82 21z"/></svg>`;
}
export function iconFork() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v4a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 14v3"/></svg>`;
}
export function iconExt() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 4h6v6M20 4l-9 9M19 13v6H5V5h6"/></svg>`;
}
