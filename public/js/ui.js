// Misc UI bindings: mobile menu, theme toggle, accent picker, project
// modal, smooth-scroll. Kept side-effect-free until `initUI()` is
// called from main.js.

import { Theme } from "./theme.js";
import { Store } from "./store.js";
import { iconGithub, iconStar, iconFork, iconExt } from "./render.js";

function bindThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => Theme.toggleMode());
}

function bindAccentPicker() {
  const btn = document.getElementById("accent-toggle");
  const pop = document.getElementById("accent-pop");
  if (!btn || !pop) return;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    pop.classList.toggle("is-open");
  });
  document.addEventListener("click", (e) => {
    if (!pop.contains(e.target) && e.target !== btn) pop.classList.remove("is-open");
  });
}

function renderAccentPicker(data) {
  const pop = document.getElementById("accent-pop");
  if (!pop) return;
  pop.innerHTML = (data.theme.accentOptions || [])
    .map((c) => `<button type="button" data-accent="${c}" style="background:${c}"></button>`)
    .join("");
  pop.querySelectorAll("button").forEach((b) => {
    if (b.dataset.accent.toLowerCase() === Theme.state.accent.toLowerCase()) b.classList.add("is-active");
    b.addEventListener("click", () => {
      Theme.setAccent(b.dataset.accent);
      pop.querySelectorAll("button").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
    });
  });
}

function bindMobileMenu() {
  const btn = document.getElementById("menu-toggle");
  const links = document.querySelector(".nav-links");
  if (!btn || !links) return;
  btn.addEventListener("click", () => links.classList.toggle("is-open"));
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => links.classList.remove("is-open"))
  );
}

function bindSmoothScroll() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href^='#']");
    if (!link) return;
    const id = link.getAttribute("href");
    if (!id || id === "#" || id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", id);
  });
}

function bindProjectModal() {
  const modal = document.getElementById("project-modal");
  const panel = modal.querySelector(".modal-panel");
  const closeBtn = modal.querySelector(".modal-close");
  const backdrop = modal.querySelector(".modal-backdrop");
  if (!modal) return;

  const open = (projectId) => {
    const p = (Store.data.projects || []).find((x) => x.id === projectId);
    if (!p) return;
    const gh = p.github;

    // Hero image: prefer GitHub's social-preview when the repo provides
    // a custom one, otherwise fall back to the curated hero asset.
    const heroImg = gh?.usesCustomSocialImage && gh.socialImage
      ? gh.socialImage
      : p.hero || p.thumb;

    // Description: prefer the curated summary; if it's empty, fall back
    // to the live GitHub description so newly-added projects always
    // have a description without manual copy-paste.
    const description = (p.summary && p.summary.trim()) || gh?.description || "";

    // Labels: curated tags first; if none, surface GitHub topics so
    // every project carries at least its repo's metadata.
    const labels = (p.tags && p.tags.length ? p.tags : gh?.topics || []).slice(0, 12);

    panel.innerHTML = `
      <button class="modal-close" aria-label="Close">✕</button>
      <div class="modal-hero"><img src="${escapeAttr(heroImg)}" alt="${escapeAttr(p.title)}" onerror="this.onerror=null;this.src='${escapeAttr(p.hero || p.thumb || "")}'"></div>
      <div class="modal-body">
        <div class="cat">${escapeHtml(p.category)}${p.year ? " · " + escapeHtml(p.year) : ""}</div>
        <h3>${escapeHtml(p.title)}</h3>
        ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        ${labels.length ? `<ul class="tags">${labels.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : ""}
        ${gh ? renderGithubBlock(gh) : ""}
        <div class="modal-actions">
          ${renderLinks(p, gh)}
        </div>
      </div>`;
    panel.querySelector(".modal-close").addEventListener("click", close);
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };

  function renderLinks(p, gh) {
    const links = (p.links || []).slice();
    // Ensure the GitHub repo always has an explicit button when one is
    // present but missing from the curated link list.
    if (gh && !links.some((l) => l.href === gh.url)) {
      links.push({ label: "GitHub Repository", href: gh.url, primary: !links.length });
    }
    if (gh?.homepage && !links.some((l) => l.href === gh.homepage)) {
      links.push({ label: "Project Homepage", href: gh.homepage });
    }
    return links
      .map(
        (l) =>
          `<a class="btn ${l.primary ? "btn-primary" : ""}" href="${escapeAttr(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)} ${iconExt()}</a>`
      )
      .join("");
  }

  function renderGithubBlock(gh) {
    const fmtDate = (s) => {
      if (!s) return "";
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    };
    const langs = (gh.languages || []).slice(0, 5);
    return `
      <div class="gh-block">
        <a class="gh-repo-link" href="${escapeAttr(gh.url)}" target="_blank" rel="noopener" data-cursor-hover>
          ${iconGithub()}<span>${escapeHtml(gh.nameWithOwner)}</span>
        </a>
        <div class="gh-stats">
          <span class="gh-stat" title="Stars">${iconStar()}${gh.stars ?? 0} stars</span>
          <span class="gh-stat" title="Forks">${iconFork()}${gh.forks ?? 0} forks</span>
          ${gh.license ? `<span class="gh-stat" title="License">${escapeHtml(gh.license.key || gh.license.name)}</span>` : ""}
          ${gh.pushedAt ? `<span class="gh-stat" title="Last push">Updated ${escapeHtml(fmtDate(gh.pushedAt))}</span>` : ""}
        </div>
        ${
          langs.length
            ? `<div class="gh-langs">
                 <div class="gh-bar">
                   ${langs.map((l) => `<span data-lang="${escapeAttr(l.name)}" style="width:${(l.pct || 0).toFixed(1)}%" title="${escapeAttr(l.name)} · ${(l.pct || 0).toFixed(1)}%"></span>`).join("")}
                 </div>
                 <ul class="gh-langs-key">
                   ${langs.map((l) => `<li><span class="lang-dot" data-lang="${escapeAttr(l.name)}"></span>${escapeHtml(l.name)} <em>${(l.pct || 0).toFixed(1)}%</em></li>`).join("")}
                 </ul>
               </div>`
            : ""
        }
        ${
          (gh.topics || []).length
            ? `<ul class="gh-topics">${gh.topics.map((t) => `<li>#${escapeHtml(t)}</li>`).join("")}</ul>`
            : ""
        }
      </div>`;
  }

  const close = () => {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  document.addEventListener("click", (e) => {
    const card = e.target.closest("[data-project]");
    if (card) {
      e.preventDefault();
      open(card.dataset.project);
    }
  });
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

export function initUI() {
  bindThemeToggle();
  bindAccentPicker();
  bindMobileMenu();
  bindSmoothScroll();
  bindProjectModal();
}

export function renderUI(data) {
  renderAccentPicker(data);
}
