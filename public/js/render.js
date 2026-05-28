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
    .map(
      (p, i) => `
      <article class="card size-${esc(p.size || "md")}" data-reveal data-project="${esc(p.id)}" data-cursor-hover>
        <div class="img" style="background-image:url('${esc(p.thumb)}')"></div>
        <span class="year-tag">${esc(p.year || "")}</span>
        <div class="body">
          <div class="cat">${esc(p.category)}</div>
          <h3 class="title">${esc(p.title)}</h3>
          <p class="summary">${esc(p.summary)}</p>
          <ul class="tags">${(p.tags || []).slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        </div>
      </article>`
    )
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
