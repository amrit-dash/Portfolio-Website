import { isAuthenticated, login, logout } from "./auth.js";
import {
  loadSiteData,
  saveLocalOverride,
  clearLocalOverride,
} from "../../js/core/data-loader.js";
import { saveSiteToFirebase, uploadFile, isFirebaseConfigured, initFirebase } from "../../js/core/firebase.js";

const PROJECT_THUMB = { width: 800, height: 500 };
const PROJECT_GALLERY = { width: 1280, height: 720 };

let siteData = null;
let cropper = null;
let cropContext = null;

const toast = document.getElementById("toast");

function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function showDashboard() {
  document.getElementById("login-screen")?.classList.add("hidden");
  document.getElementById("dashboard")?.classList.add("is-active");
}

function showLogin() {
  document.getElementById("login-screen")?.classList.remove("hidden");
  document.getElementById("dashboard")?.classList.remove("is-active");
}

async function init() {
  document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = document.getElementById("login-user").value.trim();
    const pass = document.getElementById("login-pass").value;
    if (login(user, pass) || (await tryFirebaseEmailLogin(user, pass))) {
      await loadDashboard();
      showDashboard();
    } else {
      showToast("Invalid credentials");
    }
  });

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    logout();
    showLogin();
  });

  document.querySelectorAll("[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => switchPanel(btn.dataset.panel));
  });

  document.getElementById("save-local")?.addEventListener("click", () => publish(false));
  document.getElementById("save-firebase")?.addEventListener("click", () => publish(true));
  document.getElementById("reset-local")?.addEventListener("click", () => {
    clearLocalOverride();
    showToast("Local overrides cleared — reload site");
  });

  document.getElementById("preview-site")?.addEventListener("click", () => window.open("/", "_blank"));

  setupCropModal();
  setupThemePanel();
  setupCvPanel();
  setupProjectPanel();
  setupSkillsAddButton();

  if (isAuthenticated()) {
    await loadDashboard();
    showDashboard();
  }
}

async function tryFirebaseEmailLogin(user, pass) {
  if (!user.includes("@")) return false;
  const { tryFirebaseLogin } = await import("./auth.js");
  return tryFirebaseLogin(user, pass);
}

async function loadDashboard() {
  siteData = await loadSiteData();
  populateProfileForm();
  populateAboutForm();
  populateExperienceEditor();
  populateProjectsEditor();
  populateThemeForm();
}

function switchPanel(id) {
  document.querySelectorAll(".panel-section").forEach((p) => p.classList.toggle("is-active", p.id === `panel-${id}`));
  document.querySelectorAll("[data-panel]").forEach((b) => b.classList.toggle("is-active", b.dataset.panel === id));
}

function populateProfileForm() {
  const p = siteData.profile;
  setVal("profile-name", p.name);
  setVal("profile-title", p.title);
  setVal("profile-tagline", p.tagline);
  setVal("profile-email", p.email);
  setVal("profile-phone", p.phone);
  setVal("profile-photo", p.photo);
}

function populateAboutForm() {
  setVal("about-summary", siteData.about?.summary);
  setVal("contact-headline", siteData.contact?.headline);
  setVal("contact-sub", siteData.contact?.subtext);
  renderSkillsEditor();
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? "";
}

function getVal(id) {
  return document.getElementById(id)?.value ?? "";
}

function renderSkillsEditor() {
  const wrap = document.getElementById("skills-editor");
  if (!wrap) return;
  wrap.innerHTML = "";
  siteData.skills = siteData.skills || [];
  siteData.skills.forEach((skill, i) => {
    wrap.append(createListRow(skill, () => siteData.skills.splice(i, 1), (v) => (siteData.skills[i] = v)));
  });
}

function setupSkillsAddButton() {
  document.getElementById("add-skill")?.addEventListener("click", () => {
    siteData.skills = siteData.skills || [];
    siteData.skills.push("New skill");
    renderSkillsEditor();
  });
}

function createListRow(value, onDelete, onChange) {
  const row = document.createElement("div");
  row.className = "list-editor-item grid-2";
  const input = document.createElement("input");
  input.value = value;
  input.addEventListener("input", () => onChange(input.value));
  const del = document.createElement("button");
  del.type = "button";
  del.className = "btn btn-ghost";
  del.textContent = "Remove";
  del.addEventListener("click", () => {
    onDelete();
    row.remove();
  });
  row.append(input, del);
  return row;
}

function populateExperienceEditor() {
  const wrap = document.getElementById("experience-editor");
  if (!wrap) return;
  wrap.innerHTML = "";
  (siteData.experience || []).forEach((exp, i) => {
    wrap.append(createExperienceCard(exp, i));
  });
  document.getElementById("add-experience")?.onclick = () => {
    siteData.experience.unshift({
      id: `exp-${Date.now()}`,
      company: "Company",
      role: "Role",
      timeframe: "2025 — Present",
      current: false,
      description: "",
    });
    populateExperienceEditor();
  };
}

function createExperienceCard(exp, index) {
  const card = document.createElement("div");
  card.className = "list-editor-item";
  card.innerHTML = `
    <div class="grid-2">
      <div><label>Company</label><input data-field="company" value="${esc(exp.company)}"></div>
      <div><label>Role</label><input data-field="role" value="${esc(exp.role)}"></div>
      <div><label>Timeframe</label><input data-field="timeframe" value="${esc(exp.timeframe)}"></div>
      <div><label><input type="checkbox" data-field="current" ${exp.current ? "checked" : ""}> Current role</label></div>
    </div>
    <label>Description</label><textarea data-field="description">${esc(exp.description)}</textarea>
    <button type="button" class="btn btn-ghost remove-exp">Remove</button>
  `;
  card.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => syncExp(card, index));
    input.addEventListener("change", () => syncExp(card, index));
  });
  card.querySelector(".remove-exp").addEventListener("click", () => {
    siteData.experience.splice(index, 1);
    populateExperienceEditor();
  });
  return card;
}

function syncExp(card, index) {
  const exp = siteData.experience[index];
  exp.company = card.querySelector('[data-field="company"]').value;
  exp.role = card.querySelector('[data-field="role"]').value;
  exp.timeframe = card.querySelector('[data-field="timeframe"]').value;
  exp.current = card.querySelector('[data-field="current"]').checked;
  exp.description = card.querySelector('[data-field="description"]').value;
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function collectProfileFromForm() {
  siteData.profile.name = getVal("profile-name");
  siteData.profile.title = getVal("profile-title");
  siteData.profile.tagline = getVal("profile-tagline");
  siteData.profile.email = getVal("profile-email");
  siteData.profile.phone = getVal("profile-phone");
  siteData.profile.photo = getVal("profile-photo");
  siteData.about.summary = getVal("about-summary");
  siteData.contact.headline = getVal("contact-headline");
  siteData.contact.subtext = getVal("contact-sub");
}

function setupThemeForm() {
  /* populated in populateThemeForm */
}

function populateThemeForm() {
  const t = siteData.theme || {};
  setVal("theme-default", t.defaultMode || "dark");
  setVal("theme-accent", t.accent || "#6ee7ff");
  setVal("theme-accent-2", t.accentSecondary || "#a78bfa");
  setVal("theme-font-display", t.fontDisplay || "Syne");
  setVal("theme-font-body", t.fontBody || "DM Sans");
  document.getElementById("theme-cursor").checked = Boolean(t.cursorGlow);
  document.getElementById("theme-reduced").checked = Boolean(t.reducedMotion);
}

function collectThemeFromForm() {
  siteData.theme = {
    defaultMode: getVal("theme-default"),
    accent: getVal("theme-accent"),
    accentSecondary: getVal("theme-accent-2"),
    fontDisplay: getVal("theme-font-display"),
    fontBody: getVal("theme-font-body"),
    cursorGlow: document.getElementById("theme-cursor")?.checked,
    reducedMotion: document.getElementById("theme-reduced")?.checked,
  };
}

function setupThemePanel() {
  document.getElementById("theme-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    collectThemeFromForm();
    showToast("Theme updated in draft — save to apply");
  });
}

function setupCvPanel() {
  document.getElementById("cv-light-upload")?.addEventListener("change", (e) => handleCvUpload(e, "light"));
  document.getElementById("cv-dark-upload")?.addEventListener("change", (e) => handleCvUpload(e, "dark"));
}

async function handleCvUpload(e, mode) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (isFirebaseConfigured()) {
    try {
      await initFirebase();
      const url = await uploadFile(`cv/cv-${mode}.pdf`, file);
      if (mode === "light") siteData.profile.cvLight = url;
      else siteData.profile.cvDark = url;
      showToast(`CV (${mode}) uploaded to Firebase`);
    } catch (err) {
      showToast(err.message);
    }
  } else {
    showToast("Firebase not configured — CV paths use bundled assets until connected");
  }
  e.target.value = "";
}

function populateProjectsEditor() {
  const wrap = document.getElementById("projects-editor");
  if (!wrap) return;
  wrap.innerHTML = "";
  (siteData.projects || []).forEach((proj, i) => {
    const card = document.createElement("div");
    card.className = "list-editor-item";
    card.innerHTML = `
      <h4>${esc(proj.title)}</h4>
      <div class="grid-2">
        <div><label>Title</label><input class="proj-title" value="${esc(proj.title)}"></div>
        <div><label>Category</label><input class="proj-cat" value="${esc(proj.category)}"></div>
      </div>
      <label>Description</label><textarea class="proj-desc">${esc(proj.description)}</textarea>
      <label>Thumbnail URL</label><input class="proj-thumb" value="${esc(proj.thumbnail)}">
      <label>Gallery URL</label><input class="proj-gallery" value="${esc(proj.gallery)}">
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin:0.75rem 0">
        <button type="button" class="btn btn-ghost crop-thumb" data-i="${i}">Crop thumbnail (800×500)</button>
        <button type="button" class="btn btn-ghost crop-gallery" data-i="${i}">Crop gallery (1280×720)</button>
      </div>
      <button type="button" class="btn btn-ghost remove-proj">Remove project</button>
    `;
    card.querySelector(".proj-title").addEventListener("input", (e) => (proj.title = e.target.value));
    card.querySelector(".proj-cat").addEventListener("input", (e) => (proj.category = e.target.value));
    card.querySelector(".proj-desc").addEventListener("input", (e) => (proj.description = e.target.value));
    card.querySelector(".proj-thumb").addEventListener("input", (e) => (proj.thumbnail = e.target.value));
    card.querySelector(".proj-gallery").addEventListener("input", (e) => (proj.gallery = e.target.value));
    card.querySelector(".crop-thumb").addEventListener("click", () => openCropPicker(i, "thumbnail"));
    card.querySelector(".crop-gallery").addEventListener("click", () => openCropPicker(i, "gallery"));
    card.querySelector(".remove-proj").addEventListener("click", () => {
      siteData.projects.splice(i, 1);
      populateProjectsEditor();
    });
    wrap.append(card);
  });
}

function setupProjectPanel() {
  document.getElementById("add-project")?.addEventListener("click", () => {
    siteData.projects.push({
      id: `proj-${Date.now()}`,
      title: "New Project",
      category: "Category",
      thumbnail: "images/portfolio/make.jpg",
      gallery: "images/portfolio/gallery/make.jpg",
      description: "",
      tags: [],
      links: [],
    });
    populateProjectsEditor();
  });
}

function openCropPicker(projectIndex, type) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const aspect = type === "thumbnail" ? PROJECT_THUMB.width / PROJECT_THUMB.height : PROJECT_GALLERY.width / PROJECT_GALLERY.height;
    const size = type === "thumbnail" ? PROJECT_THUMB : PROJECT_GALLERY;
    openCropModal(url, aspect, size, async (blob) => {
      if (isFirebaseConfigured()) {
        await initFirebase();
        const path = `projects/${siteData.projects[projectIndex].id}-${type}.jpg`;
        const f = new File([blob], `${type}.jpg`, { type: "image/jpeg" });
        const downloadUrl = await uploadFile(path, f);
        if (type === "thumbnail") siteData.projects[projectIndex].thumbnail = downloadUrl;
        else siteData.projects[projectIndex].gallery = downloadUrl;
      } else {
        const dataUrl = await blobToDataUrl(blob);
        if (type === "thumbnail") siteData.projects[projectIndex].thumbnail = dataUrl;
        else siteData.projects[projectIndex].gallery = dataUrl;
      }
      populateProjectsEditor();
      showToast("Image cropped and attached");
    });
  });
  input.click();
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

function setupCropModal() {
  document.getElementById("crop-cancel")?.addEventListener("click", closeCropModal);
  document.getElementById("crop-apply")?.addEventListener("click", async () => {
    if (!cropper || !cropContext) return;
    const { width, height } = cropContext.size;
    const canvas = cropper.getCroppedCanvas({ width, height, imageSmoothingQuality: "high" });
    canvas.toBlob(async (blob) => {
      await cropContext.onDone(blob);
      closeCropModal();
    }, "image/jpeg", 0.92);
  });
}

function openCropModal(imageUrl, aspect, size, onDone) {
  const modal = document.getElementById("crop-modal");
  const img = document.getElementById("crop-image");
  if (!modal || !img) return;
  cropContext = { size, onDone };
  img.src = imageUrl;
  modal.classList.add("is-open");
  if (cropper) cropper.destroy();
  cropper = new Cropper(img, { aspectRatio: aspect, viewMode: 1, autoCropArea: 1 });
}

function closeCropModal() {
  document.getElementById("crop-modal")?.classList.remove("is-open");
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  cropContext = null;
}

async function publish(toFirebase) {
  collectProfileFromForm();
  collectThemeFromForm();
  saveLocalOverride(siteData);
  if (toFirebase) {
    if (!isFirebaseConfigured()) {
      showToast("Configure firebase-config.js first");
      return;
    }
    try {
      await initFirebase();
      await saveSiteToFirebase(siteData);
      showToast("Published to Firebase + local preview");
    } catch (err) {
      showToast(`Firebase error: ${err.message}`);
    }
  } else {
    showToast("Saved locally — refresh main site to preview");
  }
}

init();
