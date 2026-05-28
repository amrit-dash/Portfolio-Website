// AmritOS · Admin Dashboard SPA
// ----------------------------------------------------------------------
// Reads/writes the same data + prefs the public portfolio uses. Edits
// produce an overlay JSON saved to localStorage; the portfolio reads
// that overlay on next load (or live, if open in another tab via the
// `storage` event).
//
// Firebase migration plan (last step):
//   - Replace Auth (`./auth.js`) with Firebase Auth.
//   - Replace `Store.saveOverlay(...)` with a Firestore writeDoc call to
//     `portfolio/v2` (subscribe the public site via onSnapshot).
//   - Replace base64 image data-URLs with `uploadBytes` to Firebase Storage
//     and store the returned download URL in the overlay.
//   - Replace the CV picker file storage path with a Storage upload.

import { Store, Prefs } from "../store.js";
import { Theme } from "../theme.js";
import { Auth } from "./auth.js";
import { pickAndCrop, pickFile } from "./cropper.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

let working = null;     // mutable copy of overlay-merged data
let original = null;    // deep clone for revert
let dirty = false;
let currentSection = "profile";
let toastTimer = null;

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "hero", label: "Hero" },
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education & Awards" },
  { id: "projects", label: "Projects" },
  { id: "cv", label: "CV Files" },
  { id: "theme", label: "Theme & Cosmetics" },
  { id: "danger", label: "Reset" },
];

// ----------------------------------------------------------------------
// Boot
// ----------------------------------------------------------------------
boot().catch((e) => {
  console.error(e);
  alert("Admin failed to boot: " + e.message);
});

async function boot() {
  await Store.load();
  Theme.init(Store.data.theme);
  if (!Auth.isAuthed()) {
    renderLogin();
    return;
  }
  enterDashboard();
}

function renderLogin() {
  document.body.innerHTML = `
    <div class="login-shell">
      <form class="login-card" id="login-form">
        <div class="brand">
          <span class="brand-mark">A</span><span>AmritOS · Admin</span>
        </div>
        <h1>Sign in.</h1>
        <p class="lede">This panel is hidden from the public site. Use the credentials configured in <code>auth.js</code>. Default is <b>admin / admin</b>.</p>
        <div class="field">
          <label for="u">Username</label>
          <input id="u" name="username" type="text" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="p">Password</label>
          <input id="p" name="password" type="password" autocomplete="current-password" required />
        </div>
        <button class="btn btn-primary" style="width:100%" type="submit">Sign in</button>
        <div class="login-error" id="login-error"></div>
        <p class="hint" style="margin-top:18px;color:var(--text-mute);font-size:12px">When Firebase Auth is wired in, this stub is replaced with Email/Password or Google sign-in. Hosting rewrites already keep <code>/admin</code> and <code>/dashboard</code> off the public sitemap.</p>
      </form>
    </div>`;
  $("#login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const u = $("#u").value.trim();
    const p = $("#p").value;
    const r = Auth.signIn(u, p);
    if (!r.ok) {
      const err = $("#login-error");
      err.textContent = r.error;
      err.classList.add("show");
      return;
    }
    location.reload();
  });
}

function enterDashboard() {
  working = JSON.parse(JSON.stringify(Store.data));
  original = JSON.parse(JSON.stringify(working));
  document.body.innerHTML = `
    <div class="dash">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark">A</span><span>AmritOS · Admin</span>
        </div>
        <nav id="side-nav"></nav>
        <div class="foot">
          <button id="view-site">↗ View live site</button>
          <button id="sign-out">↳ Sign out</button>
        </div>
      </aside>
      <main class="main">
        <div class="topbar">
          <h2 id="section-title"></h2>
          <div class="actions">
            <span class="save-state" id="save-state">No unsaved changes</span>
            <button class="btn btn-sm" id="revert-btn">Revert</button>
            <button class="btn btn-sm btn-primary" id="save-btn">Save</button>
          </div>
        </div>
        <div id="section-body"></div>
      </main>
    </div>

    <!-- Image cropper -->
    <div class="cropper" id="cropper">
      <div class="modal-backdrop" id="cropper-backdrop"></div>
      <div class="cropper-panel" style="position:relative">
        <h3>Crop image</h3>
        <div class="cropper-stage" id="cropper-stage">
          <canvas id="cropper-canvas"></canvas>
          <div class="cropper-frame" id="cropper-frame"></div>
        </div>
        <div class="cropper-meta">
          <span class="ratio" id="cropper-ratio"></span>
          <input type="range" id="cropper-zoom" />
        </div>
        <div class="cropper-actions">
          <button class="btn btn-sm" id="cropper-cancel">Cancel</button>
          <button class="btn btn-sm btn-primary" id="cropper-save">Use this crop</button>
        </div>
      </div>
    </div>

    <div class="toast" id="toast"></div>
  `;
  renderSideNav();
  bindShellEvents();
  selectSection(currentSection);
}

function renderSideNav() {
  $("#side-nav").innerHTML = SECTIONS.map(
    (s, i) =>
      `<button data-section="${s.id}" class="${s.id === currentSection ? "is-active" : ""}"><span class="num">${String(i + 1).padStart(2, "0")}</span><span>${s.label}</span></button>`
  ).join("");
  $$("#side-nav button").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (dirty && !confirm("You have unsaved changes. Discard and switch section?")) return;
      working = JSON.parse(JSON.stringify(original));
      dirty = false;
      updateSaveState();
      selectSection(btn.dataset.section);
    })
  );
}

function bindShellEvents() {
  $("#view-site").addEventListener("click", () => window.open("/", "_blank"));
  $("#sign-out").addEventListener("click", () => {
    Auth.signOut();
    location.reload();
  });
  $("#save-btn").addEventListener("click", saveAll);
  $("#revert-btn").addEventListener("click", () => {
    if (!confirm("Revert all unsaved changes in this section?")) return;
    working = JSON.parse(JSON.stringify(original));
    dirty = false;
    updateSaveState();
    selectSection(currentSection);
  });
}

function selectSection(id) {
  currentSection = id;
  $$("#side-nav button").forEach((b) => b.classList.toggle("is-active", b.dataset.section === id));
  $("#section-title").textContent = SECTIONS.find((s) => s.id === id).label;
  const body = $("#section-body");
  body.innerHTML = "";
  RENDERERS[id](body);
}

function markDirty() {
  dirty = true;
  updateSaveState();
}

function updateSaveState() {
  const el = $("#save-state");
  if (!el) return;
  el.classList.remove("is-dirty", "is-saved");
  if (dirty) {
    el.classList.add("is-dirty");
    el.textContent = "Unsaved changes";
  } else {
    el.textContent = "All changes saved";
  }
}

function saveAll() {
  // Persist the entire working copy as the overlay. (Defaults still live
  // in portfolio.json and the deep-merge preserves them where untouched.)
  const overlay = working;
  Store.saveOverlay(overlay);
  // Theme prefs are stored separately via Prefs — written from theme controls.
  original = JSON.parse(JSON.stringify(working));
  dirty = false;
  updateSaveState();
  toast("Saved. Open the live site to see the changes.", "ok");
}

function toast(msg, kind = "ok") {
  const el = $("#toast");
  if (!el) return;
  el.className = "toast is-on " + kind;
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), 2400);
}

// ----------------------------------------------------------------------
// Helpers used by section renderers
// ----------------------------------------------------------------------
function field({ label, hint, value, type = "text", path }) {
  const id = `f-${path.replace(/[.\[\]]/g, "_")}`;
  const tag =
    type === "textarea"
      ? `<textarea id="${id}">${escapeHtml(value ?? "")}</textarea>`
      : `<input id="${id}" type="${type}" value="${escapeAttr(value ?? "")}">`;
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.innerHTML = `<label for="${id}">${escapeHtml(label)}</label>${tag}${hint ? `<span class="hint">${escapeHtml(hint)}</span>` : ""}`;
  const el = wrap.querySelector(type === "textarea" ? "textarea" : "input");
  el.addEventListener("input", () => {
    setByPath(working, path, type === "number" ? Number(el.value) : el.value);
    markDirty();
  });
  return wrap;
}

function tagInput({ label, hint, values, onChange }) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.innerHTML = `<label>${escapeHtml(label)}</label>
    <div class="tag-input" tabindex="0">
      ${values.map((v) => `<span class="tag" data-v="${escapeAttr(v)}">${escapeHtml(v)} <button type="button">×</button></span>`).join("")}
      <input placeholder="Add and press Enter" />
    </div>${hint ? `<span class="hint">${escapeHtml(hint)}</span>` : ""}`;
  const container = wrap.querySelector(".tag-input");
  const input = container.querySelector("input");
  const update = () => onChange(values.slice());
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".tag button");
    if (btn) {
      const v = btn.parentElement.dataset.v;
      const i = values.indexOf(v);
      if (i >= 0) {
        values.splice(i, 1);
        btn.parentElement.remove();
        update();
        markDirty();
      }
    }
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = input.value.trim();
      if (!v || values.includes(v)) return;
      values.push(v);
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.dataset.v = v;
      tag.innerHTML = `${escapeHtml(v)} <button type="button">×</button>`;
      container.insertBefore(tag, input);
      input.value = "";
      update();
      markDirty();
    }
  });
  return wrap;
}

function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] === undefined || cur[k] === null) cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

// ----------------------------------------------------------------------
// Section renderers
// ----------------------------------------------------------------------
const RENDERERS = {
  profile(root) {
    root.appendChild(panel("Identity", [
      field({ label: "Name", value: working.profile.name, path: "profile.name" }),
      field({ label: "Short name", value: working.profile.shortName, path: "profile.shortName" }),
      field({ label: "Title", value: working.profile.title, path: "profile.title" }),
      field({ label: "Tagline", type: "textarea", value: working.profile.tagline, path: "profile.tagline" }),
      field({ label: "Location", value: working.profile.location, path: "profile.location" }),
      field({ label: "Availability", value: working.profile.availability, path: "profile.availability" }),
    ]));
    root.appendChild(panel("Contact", [
      field({ label: "Email", type: "email", value: working.profile.email, path: "profile.email" }),
      field({ label: "Phone", value: working.profile.phone, path: "profile.phone" }),
      field({ label: "WhatsApp link", value: working.profile.whatsapp, path: "profile.whatsapp" }),
      field({ label: "LinkedIn URL", value: working.profile.social.linkedin, path: "profile.social.linkedin" }),
      field({ label: "GitHub URL", value: working.profile.social.github, path: "profile.social.github" }),
      field({ label: "Instagram URL", value: working.profile.social.instagram, path: "profile.social.instagram" }),
    ]));
    root.appendChild(
      imagePanel({
        title: "Profile photo",
        current: working.profile.photo,
        outW: 800,
        outH: 1000,
        label: "Portrait 4:5",
        onChange: (dataUrl) => {
          working.profile.photo = dataUrl;
          working.profile.photo2x = dataUrl;
        },
      })
    );
  },

  hero(root) {
    root.appendChild(panel("Hero block", [
      field({ label: "Kicker (top label)", value: working.hero.kicker, path: "hero.kicker", hint: "Shown in mono caps above the title." }),
      tagInput({
        label: "Title lines",
        hint: "Each entry renders as one animated title line. Last line auto-tints with the accent.",
        values: working.hero.lines.slice(),
        onChange: (v) => (working.hero.lines = v),
      }),
      field({ label: "Subtitle", type: "textarea", value: working.hero.subtitle, path: "hero.subtitle" }),
      field({ label: "Primary CTA label", value: working.hero.ctaPrimary.label, path: "hero.ctaPrimary.label" }),
      field({ label: "Primary CTA href", value: working.hero.ctaPrimary.href, path: "hero.ctaPrimary.href" }),
      field({ label: "Secondary CTA label", value: working.hero.ctaSecondary.label, path: "hero.ctaSecondary.label" }),
      field({ label: "Secondary CTA href", value: working.hero.ctaSecondary.href, path: "hero.ctaSecondary.href", hint: "Use the literal value 'cv' to make it download the active-theme CV." }),
    ]));
    root.appendChild(
      repeaterPanel({
        title: "Hero metrics",
        items: working.hero.metrics,
        fieldsForItem: (m, i, item) => [
          field({ label: "Value", value: item.value, path: `hero.metrics.${i}.value` }),
          field({ label: "Label", value: item.label, path: `hero.metrics.${i}.label` }),
        ],
        labelFor: (m) => m.label || "(metric)",
        empty: { value: "", label: "" },
      })
    );
  },

  about(root) {
    root.appendChild(panel("About copy", [
      field({ label: "Headline", type: "textarea", value: working.about.headline, path: "about.headline" }),
      field({ label: "Body", type: "textarea", value: working.about.body, path: "about.body" }),
    ]));
    root.appendChild(
      repeaterPanel({
        title: "Quick facts",
        items: working.about.facts,
        fieldsForItem: (f, i, item) => [
          field({ label: "Key", value: item.k, path: `about.facts.${i}.k` }),
          field({ label: "Value", value: item.v, path: `about.facts.${i}.v` }),
        ],
        labelFor: (f) => f.k || "(fact)",
        empty: { k: "", v: "" },
      })
    );
  },

  skills(root) {
    const p = panel("Skill groups", [], { lede: "Groups render as cards on the public site. Each item becomes a pill tag." });
    const rep = document.createElement("div");
    rep.className = "repeater";
    p.appendChild(rep);
    root.appendChild(p);
    working.skills.groups.forEach((g, i) => {
      const card = document.createElement("div");
      card.className = "repeater-item";
      card.innerHTML = `<div class="row"><span class="title">Group ${i + 1}</span><div class="ctrls">
        <button data-up title="Move up">↑</button>
        <button data-down title="Move down">↓</button>
        <button class="danger" data-del title="Delete">✕</button></div></div>`;
      card.appendChild(field({ label: "Group title", value: g.title, path: `skills.groups.${i}.title` }));
      card.appendChild(
        tagInput({
          label: "Items",
          values: g.items.slice(),
          onChange: (v) => (working.skills.groups[i].items = v),
        })
      );
      card.querySelector("[data-up]").addEventListener("click", () => {
        if (i === 0) return;
        const [it] = working.skills.groups.splice(i, 1);
        working.skills.groups.splice(i - 1, 0, it);
        markDirty();
        selectSection("skills");
      });
      card.querySelector("[data-down]").addEventListener("click", () => {
        if (i === working.skills.groups.length - 1) return;
        const [it] = working.skills.groups.splice(i, 1);
        working.skills.groups.splice(i + 1, 0, it);
        markDirty();
        selectSection("skills");
      });
      card.querySelector("[data-del]").addEventListener("click", () => {
        if (!confirm("Delete this skill group?")) return;
        working.skills.groups.splice(i, 1);
        markDirty();
        selectSection("skills");
      });
      rep.appendChild(card);
    });
    const addBtn = document.createElement("button");
    addBtn.className = "add-btn";
    addBtn.textContent = "+ Add group";
    addBtn.addEventListener("click", () => {
      working.skills.groups.push({ title: "New group", items: [] });
      markDirty();
      selectSection("skills");
    });
    rep.appendChild(addBtn);
  },

  experience(root) {
    root.appendChild(
      repeaterPanel({
        title: "Experience timeline",
        lede: "Top entry shows up first on the timeline. Mark the current role to highlight it.",
        items: working.experience,
        fieldsForItem: (e, i, item) => [
          field({ label: "Role", value: item.role, path: `experience.${i}.role` }),
          field({ label: "Company", value: item.company, path: `experience.${i}.company` }),
          field({ label: "Period", value: item.period, path: `experience.${i}.period` }),
          field({ label: "Location", value: item.location, path: `experience.${i}.location` }),
          field({ label: "Summary", type: "textarea", value: item.summary, path: `experience.${i}.summary` }),
          tagInput({
            label: "Highlights (each becomes a bullet)",
            values: (item.highlights || []).slice(),
            onChange: (v) => (working.experience[i].highlights = v),
          }),
          tagInput({
            label: "Tags",
            values: (item.tags || []).slice(),
            onChange: (v) => (working.experience[i].tags = v),
          }),
          checkboxField({
            label: "Current role",
            value: !!item.current,
            onChange: (v) => {
              if (v) working.experience.forEach((x, j) => (x.current = j === i));
              else working.experience[i].current = false;
              markDirty();
            },
          }),
        ],
        labelFor: (e) => `${e.role || "(role)"} · ${e.company || ""}`,
        empty: { role: "New role", company: "", period: "", location: "", summary: "", highlights: [], tags: [], current: false },
      })
    );
  },

  education(root) {
    root.appendChild(
      repeaterPanel({
        title: "Education",
        items: working.education,
        fieldsForItem: (e, i, item) => [
          field({ label: "School", value: item.school, path: `education.${i}.school` }),
          field({ label: "Degree", value: item.degree, path: `education.${i}.degree` }),
          field({ label: "Period", value: item.period, path: `education.${i}.period` }),
          field({ label: "Score", value: item.score, path: `education.${i}.score` }),
          field({ label: "Notes", type: "textarea", value: item.notes, path: `education.${i}.notes` }),
        ],
        labelFor: (e) => e.school || "(school)",
        empty: { school: "", degree: "", period: "", score: "", notes: "" },
      })
    );
    root.appendChild(
      repeaterPanel({
        title: "Standardized test scores",
        items: working.tests,
        fieldsForItem: (t, i, item) => [
          field({ label: "Name", value: item.name, path: `tests.${i}.name` }),
          field({ label: "Score", value: item.score, path: `tests.${i}.score` }),
        ],
        labelFor: (t) => t.name || "(test)",
        empty: { name: "", score: "" },
      })
    );
    root.appendChild(
      repeaterPanel({
        title: "Certifications",
        items: working.certifications,
        fieldsForItem: (c, i, item) => [
          field({ label: "Name", value: item.name, path: `certifications.${i}.name` }),
          field({ label: "Issuer", value: item.issuer, path: `certifications.${i}.issuer` }),
          field({ label: "Year", value: item.year, path: `certifications.${i}.year` }),
        ],
        labelFor: (c) => c.name || "(cert)",
        empty: { name: "", issuer: "", year: "" },
      })
    );
    root.appendChild(
      repeaterPanel({
        title: "Achievements",
        items: working.achievements,
        fieldsForItem: (a, i, item) => [
          field({ label: "Title", value: item.title, path: `achievements.${i}.title` }),
          field({ label: "Detail", type: "textarea", value: item.detail, path: `achievements.${i}.detail` }),
        ],
        labelFor: (a) => a.title || "(achievement)",
        empty: { title: "", detail: "" },
      })
    );
  },

  projects(root) {
    const p = panel("Projects (bento grid)", [], { lede: "Each project becomes a tile. Pick its size to control the bento layout — sm = 2 cols, md = 3, lg = 4." });
    const rep = document.createElement("div");
    rep.className = "repeater";
    p.appendChild(rep);
    root.appendChild(p);
    working.projects.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "repeater-item";
      card.innerHTML = `<div class="row"><span class="title">${escapeHtml(p.title || "(project)")}</span><div class="ctrls">
        <button data-up title="Move up">↑</button>
        <button data-down title="Move down">↓</button>
        <button class="danger" data-del title="Delete">✕</button></div></div>`;
      card.appendChild(field({ label: "Title", value: p.title, path: `projects.${i}.title` }));
      card.appendChild(field({ label: "Category", value: p.category, path: `projects.${i}.category` }));
      card.appendChild(field({ label: "Year", value: p.year, path: `projects.${i}.year` }));
      card.appendChild(field({ label: "Summary", type: "textarea", value: p.summary, path: `projects.${i}.summary` }));
      card.appendChild(tagInput({
        label: "Tags",
        values: (p.tags || []).slice(),
        onChange: (v) => (working.projects[i].tags = v),
      }));
      // Size selector
      const sizeWrap = document.createElement("div");
      sizeWrap.className = "field";
      sizeWrap.innerHTML = `<label>Bento size</label>
        <select>
          <option value="sm">Small (2 cols)</option>
          <option value="md">Medium (3 cols)</option>
          <option value="lg">Large (4 cols)</option>
        </select>`;
      sizeWrap.querySelector("select").value = p.size || "md";
      sizeWrap.querySelector("select").addEventListener("change", (e) => {
        working.projects[i].size = e.target.value;
        markDirty();
      });
      card.appendChild(sizeWrap);
      // Links
      const linksRep = document.createElement("div");
      linksRep.className = "field";
      linksRep.innerHTML = `<label>Links</label><div class="repeater" data-links></div>`;
      const linksList = linksRep.querySelector("[data-links]");
      (p.links || []).forEach((l, li) => {
        linksList.appendChild(linkRow(p, i, li));
      });
      const addLink = document.createElement("button");
      addLink.className = "add-btn";
      addLink.textContent = "+ Add link";
      addLink.addEventListener("click", () => {
        if (!p.links) p.links = [];
        p.links.push({ label: "Visit", href: "#", primary: !p.links.length });
        markDirty();
        selectSection("projects");
      });
      linksList.appendChild(addLink);
      card.appendChild(linksRep);

      card.appendChild(
        imageRow({
          title: "Thumbnail (16:10 · ~1200×750)",
          current: p.thumb,
          outW: 1200,
          outH: 750,
          label: "Bento thumb",
          onChange: (d) => {
            working.projects[i].thumb = d;
            working.projects[i].thumb2x = d;
          },
        })
      );
      card.appendChild(
        imageRow({
          title: "Hero image (modal · 2400×1350)",
          current: p.hero,
          outW: 2400,
          outH: 1350,
          label: "Modal hero",
          onChange: (d) => (working.projects[i].hero = d),
        })
      );
      card.querySelector("[data-up]").addEventListener("click", () => {
        if (i === 0) return;
        const [it] = working.projects.splice(i, 1);
        working.projects.splice(i - 1, 0, it);
        markDirty();
        selectSection("projects");
      });
      card.querySelector("[data-down]").addEventListener("click", () => {
        if (i === working.projects.length - 1) return;
        const [it] = working.projects.splice(i, 1);
        working.projects.splice(i + 1, 0, it);
        markDirty();
        selectSection("projects");
      });
      card.querySelector("[data-del]").addEventListener("click", () => {
        if (!confirm("Delete this project?")) return;
        working.projects.splice(i, 1);
        markDirty();
        selectSection("projects");
      });
      rep.appendChild(card);
    });
    const add = document.createElement("button");
    add.className = "add-btn";
    add.textContent = "+ Add project";
    add.addEventListener("click", () => {
      working.projects.unshift({
        id: "p-" + Math.random().toString(36).slice(2, 7),
        title: "New project",
        category: "",
        year: String(new Date().getFullYear()),
        summary: "",
        tags: [],
        size: "md",
        thumb: "",
        hero: "",
        links: [],
      });
      markDirty();
      selectSection("projects");
    });
    rep.appendChild(add);
  },

  cv(root) {
    root.appendChild(panel("CV files", [], { lede: "Two PDFs power the live CV download — the active theme decides which one downloads. Files are stored as data-URLs in the overlay; Firebase Storage upload comes in the final wiring step." }));
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gap = "10px";

    const row = (variant, label) => {
      const r = document.createElement("div");
      r.className = "file-row";
      const path = working.cv[variant];
      const fileLabel = (path || "").split("/").pop() || "(no file)";
      r.innerHTML = `
        <div class="meta">
          <div><b>${escapeHtml(label)}</b></div>
          <div>${escapeHtml(fileLabel)}</div>
        </div>
        <a class="btn btn-sm" href="${escapeAttr(path)}" target="_blank" rel="noopener">View</a>
        <button class="btn btn-sm" data-replace>Replace…</button>`;
      r.querySelector("[data-replace]").addEventListener("click", async () => {
        const f = await pickFile({ accept: "application/pdf" });
        if (!f) return;
        working.cv[variant] = f.dataUrl;
        markDirty();
        toast(`Loaded ${f.name} for ${label}. Click Save.`, "ok");
        selectSection("cv");
      });
      return r;
    };
    wrap.appendChild(row("light", "Light-mode CV"));
    wrap.appendChild(row("dark", "Dark-mode CV"));
    root.lastElementChild.appendChild(wrap);
  },

  theme(root) {
    root.appendChild(panel("Default theme", [], {
      lede: "These defaults ship to first-time visitors. Individual users can still toggle to their preference.",
    }));
    const p = root.lastElementChild;

    // Default mode
    const modeWrap = document.createElement("div");
    modeWrap.className = "field";
    modeWrap.innerHTML = `<label>Default mode</label>
      <select>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>`;
    modeWrap.querySelector("select").value = working.theme.default;
    modeWrap.querySelector("select").addEventListener("change", (e) => {
      working.theme.default = e.target.value;
      markDirty();
    });
    p.appendChild(modeWrap);

    // Default accent
    const accentWrap = document.createElement("div");
    accentWrap.className = "field";
    accentWrap.innerHTML = `<label>Default accent</label>
      <div class="swatch-row" data-default-accent></div>
      <span class="hint">Tap a swatch to choose. To add/remove swatches, edit the list below.</span>`;
    const row = accentWrap.querySelector(".swatch-row");
    const renderSwatches = () => {
      row.innerHTML = working.theme.accentOptions
        .map((c) => `<button type="button" data-c="${c}" style="background:${c}" class="${c.toLowerCase() === working.theme.accent.toLowerCase() ? "is-active" : ""}"></button>`)
        .join("");
      row.querySelectorAll("button").forEach((b) =>
        b.addEventListener("click", () => {
          working.theme.accent = b.dataset.c;
          Theme.setAccent(b.dataset.c);
          markDirty();
          renderSwatches();
        })
      );
    };
    renderSwatches();
    p.appendChild(accentWrap);

    // Accent palette editor
    p.appendChild(
      tagInput({
        label: "Accent palette (hex codes)",
        hint: "These power the public accent picker.",
        values: working.theme.accentOptions.slice(),
        onChange: (v) => {
          working.theme.accentOptions = v.filter((x) => /^#[0-9a-f]{6}$/i.test(x));
          renderSwatches();
        },
      })
    );

    // Fonts
    p.appendChild(
      field({ label: "Heading font CSS stack", value: working.theme.fontHeading, path: "theme.fontHeading", hint: "Make sure the font is loaded via Google Fonts in index.html." })
    );
    p.appendChild(field({ label: "Body font CSS stack", value: working.theme.fontBody, path: "theme.fontBody" }));
    p.appendChild(field({ label: "Mono font CSS stack", value: working.theme.fontMono, path: "theme.fontMono" }));

    // Behavioural toggles
    const t2 = panel("Behaviour", [], { lede: "Cosmetic defaults. Save here and the public site reflects on next load." });
    root.appendChild(t2);
    const make = (key, label, desc, themeKey, prefKey) => {
      const wrap = document.createElement("div");
      wrap.className = "toggle-row";
      wrap.innerHTML = `<div class="label"><div class="k">${escapeHtml(label)}</div><div class="d">${escapeHtml(desc)}</div></div>
        <div class="switch ${working.theme[themeKey] ? "is-on" : ""}" tabindex="0"></div>`;
      wrap.querySelector(".switch").addEventListener("click", (e) => {
        const on = !working.theme[themeKey];
        working.theme[themeKey] = on;
        e.currentTarget.classList.toggle("is-on", on);
        Theme.setFlag(prefKey, on);
        markDirty();
      });
      t2.appendChild(wrap);
    };
    make("cursor", "Custom cursor", "Replace the OS cursor with a dot + ring pair on the public site.", "customCursor", "customCursor");
    make("bg", "Animated 3D background", "Particle field rendered with Three.js behind every section.", "animatedBackground", "animatedBg");
    make("anims", "Scroll-triggered animations", "Section reveal + staggered transitions across the site.", "scrollAnimations", "scrollAnims");
  },

  danger(root) {
    root.appendChild(panel("Reset", [], { lede: "Clears every admin override and restores the bundled defaults from public/data/portfolio.json. Also wipes the user-prefs (theme mode, accent, cursor toggle)." }));
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "10px";
    wrap.innerHTML = `
      <button class="btn btn-sm" id="reset-data">Reset content overrides</button>
      <button class="btn btn-sm" id="reset-prefs">Reset user prefs</button>
      <button class="btn btn-sm" id="reset-all">Reset everything</button>`;
    wrap.querySelector("#reset-data").addEventListener("click", () => {
      if (!confirm("Delete all content overrides? This cannot be undone.")) return;
      Store.resetOverlay();
      location.reload();
    });
    wrap.querySelector("#reset-prefs").addEventListener("click", () => {
      if (!confirm("Reset all user preferences?")) return;
      Prefs.reset();
      location.reload();
    });
    wrap.querySelector("#reset-all").addEventListener("click", () => {
      if (!confirm("Reset both overrides AND user prefs?")) return;
      Store.resetOverlay();
      Prefs.reset();
      location.reload();
    });
    root.lastElementChild.appendChild(wrap);
  },
};

// --- Reusable helpers ----------------------------------------------------
function panel(heading, children = [], { lede } = {}) {
  const p = document.createElement("div");
  p.className = "panel";
  p.innerHTML = `<h3>${escapeHtml(heading)}</h3>${lede ? `<p class="lede">${escapeHtml(lede)}</p>` : ""}`;
  children.forEach((c) => p.appendChild(c));
  return p;
}

function repeaterPanel({ title, lede, items, fieldsForItem, labelFor, empty }) {
  const p = panel(title, [], { lede });
  const rep = document.createElement("div");
  rep.className = "repeater";
  p.appendChild(rep);
  items.forEach((it, i) => {
    const card = document.createElement("div");
    card.className = "repeater-item";
    card.innerHTML = `<div class="row"><span class="title">${escapeHtml(labelFor(it, i))}</span><div class="ctrls">
      <button data-up title="Move up">↑</button>
      <button data-down title="Move down">↓</button>
      <button class="danger" data-del title="Delete">✕</button></div></div>`;
    fieldsForItem(it, i, it).forEach((f) => card.appendChild(f));
    card.querySelector("[data-up]").addEventListener("click", () => {
      if (i === 0) return;
      const [it2] = items.splice(i, 1);
      items.splice(i - 1, 0, it2);
      markDirty();
      selectSection(currentSection);
    });
    card.querySelector("[data-down]").addEventListener("click", () => {
      if (i === items.length - 1) return;
      const [it2] = items.splice(i, 1);
      items.splice(i + 1, 0, it2);
      markDirty();
      selectSection(currentSection);
    });
    card.querySelector("[data-del]").addEventListener("click", () => {
      if (!confirm("Delete this entry?")) return;
      items.splice(i, 1);
      markDirty();
      selectSection(currentSection);
    });
    rep.appendChild(card);
  });
  const add = document.createElement("button");
  add.className = "add-btn";
  add.textContent = `+ Add ${title.toLowerCase().replace(/s$/, "")}`;
  add.addEventListener("click", () => {
    items.unshift(JSON.parse(JSON.stringify(empty)));
    markDirty();
    selectSection(currentSection);
  });
  rep.appendChild(add);
  return p;
}

function checkboxField({ label, value, onChange }) {
  const wrap = document.createElement("label");
  wrap.className = "checkbox";
  wrap.innerHTML = `<input type="checkbox" ${value ? "checked" : ""}><span>${escapeHtml(label)}</span>`;
  wrap.querySelector("input").addEventListener("change", (e) => onChange(e.target.checked));
  const w2 = document.createElement("div");
  w2.className = "field";
  w2.appendChild(wrap);
  return w2;
}

function linkRow(project, projectIdx, linkIdx) {
  const link = project.links[linkIdx];
  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "1fr 1.6fr auto auto";
  row.style.gap = "8px";
  row.style.marginBottom = "8px";
  row.innerHTML = `
    <input type="text" value="${escapeAttr(link.label || "")}" placeholder="Label" />
    <input type="text" value="${escapeAttr(link.href || "")}" placeholder="https://…" />
    <label class="checkbox" style="white-space:nowrap"><input type="checkbox" ${link.primary ? "checked" : ""}><span>Primary</span></label>
    <button class="btn btn-sm" data-del>✕</button>`;
  const [labelInp, hrefInp, primaryWrap, delBtn] = row.children;
  labelInp.addEventListener("input", () => {
    project.links[linkIdx].label = labelInp.value;
    markDirty();
  });
  hrefInp.addEventListener("input", () => {
    project.links[linkIdx].href = hrefInp.value;
    markDirty();
  });
  primaryWrap.querySelector("input").addEventListener("change", (e) => {
    project.links[linkIdx].primary = e.target.checked;
    markDirty();
  });
  delBtn.addEventListener("click", () => {
    project.links.splice(linkIdx, 1);
    markDirty();
    selectSection("projects");
  });
  return row;
}

function imagePanel({ title, current, outW, outH, label, onChange }) {
  return imageRow({ title, current, outW, outH, label, onChange, asPanel: true });
}

function imageRow({ title, current, outW, outH, label, onChange, asPanel = false }) {
  const block = asPanel ? panel(title, []) : (() => {
    const d = document.createElement("div");
    d.className = "field";
    d.innerHTML = `<label>${escapeHtml(title)}</label>`;
    return d;
  })();
  const picker = document.createElement("div");
  picker.className = "image-picker";
  picker.innerHTML = `
    <div class="preview">${current ? `<img src="${escapeAttr(current)}" alt="">` : "no image"}</div>
    <div class="controls">
      <button class="btn btn-sm" data-pick>Upload & crop…</button>
      <span class="hint">Recommended: ${outW}×${outH}px. The cropper enforces the aspect ratio.</span>
    </div>`;
  block.appendChild(picker);
  picker.querySelector("[data-pick]").addEventListener("click", async () => {
    const cropped = await pickAndCrop({ outW, outH, label });
    if (!cropped) return;
    picker.querySelector(".preview").innerHTML = `<img src="${cropped}" alt="">`;
    onChange(cropped);
    markDirty();
  });
  return block;
}
