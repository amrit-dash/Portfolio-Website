// Misc UI bindings: mobile menu, theme toggle, accent picker, project
// modal, smooth-scroll. Kept side-effect-free until `initUI()` is
// called from main.js.

import { Theme } from "./theme.js";
import { Store } from "./store.js";

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
    panel.innerHTML = `
      <button class="modal-close" aria-label="Close">✕</button>
      <div class="modal-hero"><img src="${p.hero || p.thumb}" alt="${p.title}"></div>
      <div class="modal-body">
        <div class="cat">${escapeHtml(p.category)} · ${escapeHtml(p.year || "")}</div>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.summary)}</p>
        <ul class="tags">${(p.tags || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
        <div class="modal-actions">
          ${(p.links || [])
            .map(
              (l) =>
                `<a class="btn ${l.primary ? "btn-primary" : ""}" href="${escapeAttr(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`
            )
            .join("")}
        </div>
      </div>`;
    panel.querySelector(".modal-close").addEventListener("click", close);
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };

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
