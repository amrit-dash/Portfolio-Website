import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";
import {
  firebaseConfig,
  FIRESTORE_PATHS,
  STORAGE_PATHS,
  IMAGE_SPECS
} from "../../js/firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let content = {};
let settings = {};
let thumbCropper;
let heroCropper;

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const saveStatus = document.getElementById("save-status");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginScreen.hidden = true;
    dashboard.hidden = false;
    await loadData();
  } else {
    loginScreen.hidden = false;
    dashboard.hidden = true;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("login-email").value,
      document.getElementById("login-password").value
    );
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  }
});

document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.getElementById("save-btn").addEventListener("click", saveAll);

document.getElementById("thumb-file").addEventListener("change", (e) =>
  initCropper(e.target.files[0], "thumb-crop", IMAGE_SPECS.thumb, (c) => (thumbCropper = c))
);
document.getElementById("hero-file").addEventListener("change", (e) =>
  initCropper(e.target.files[0], "hero-crop", IMAGE_SPECS.hero, (c) => (heroCropper = c))
);

document.getElementById("upload-thumb").addEventListener("click", () => uploadCrop(thumbCropper, "thumb"));
document.getElementById("upload-hero").addEventListener("click", () => uploadCrop(heroCropper, "hero"));
document.getElementById("upload-cv").addEventListener("click", uploadCvs);

async function loadData() {
  const [contentRes, settingsRes, defaultsRes] = await Promise.all([
    getDoc(doc(db, FIRESTORE_PATHS.content)),
    getDoc(doc(db, FIRESTORE_PATHS.settings)),
    fetch("/data/default-content.json")
  ]);

  const defaults = await defaultsRes.json();
  content = contentRes.exists() ? deepMerge(defaults, contentRes.data()) : defaults;
  settings = settingsRes.exists()
    ? { ...getDefaultSettings(), ...settingsRes.data() }
    : getDefaultSettings();

  populateForm();
  populateProjects();
  populateSettings();
}

function populateForm() {
  document.querySelectorAll("[data-field]").forEach((el) => {
    const path = el.dataset.field;
    const val = getByPath(content, path);
    if (el.dataset.array) {
      el.value = Array.isArray(val) ? val.join(", ") : "";
    } else {
      el.value = val ?? "";
    }
  });
  document.getElementById("experience-json").value = JSON.stringify(content.experience || [], null, 2);
}

function populateProjects() {
  const select = document.getElementById("project-select");
  select.innerHTML = (content.projects || [])
    .map((p) => `<option value="${p.id}">${p.title}</option>`)
    .join("");
}

function populateSettings() {
  document.getElementById("setting-theme").value = settings.defaultTheme || "dark";
  document.getElementById("setting-accent").value = settings.accentHue ?? 142;
  document.getElementById("setting-font-display").value = settings.fontDisplay || "";
  document.getElementById("setting-font-body").value = settings.fontBody || "";
  document.getElementById("setting-boot").checked = settings.bootEnabled !== false;
  document.getElementById("setting-reduced").checked = !!settings.reducedMotion;
}

async function saveAll() {
  collectForm();
  try {
    await setDoc(doc(db, FIRESTORE_PATHS.content), content, { merge: true });
    await setDoc(doc(db, FIRESTORE_PATHS.settings), collectSettings(), { merge: true });
    saveStatus.textContent = "Saved successfully.";
  } catch (err) {
    saveStatus.textContent = `Save failed: ${err.message}`;
  }
}

function collectForm() {
  document.querySelectorAll("[data-field]").forEach((el) => {
    const path = el.dataset.field;
    let val = el.value;
    if (el.dataset.array) {
      val = val.split(",").map((s) => s.trim()).filter(Boolean);
    }
    setByPath(content, path, val);
  });
  try {
    content.experience = JSON.parse(document.getElementById("experience-json").value);
  } catch {
    /* keep previous */
  }
}

function collectSettings() {
  return {
    defaultTheme: document.getElementById("setting-theme").value,
    accentHue: Number(document.getElementById("setting-accent").value),
    fontDisplay: document.getElementById("setting-font-display").value,
    fontBody: document.getElementById("setting-font-body").value,
    bootEnabled: document.getElementById("setting-boot").checked,
    reducedMotion: document.getElementById("setting-reduced").checked
  };
}

function switchTab(name) {
  document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((p) => {
    p.hidden = p.id !== `tab-${name}`;
  });
  document.getElementById("panel-title").textContent =
    name.charAt(0).toUpperCase() + name.slice(1);
}

function initCropper(file, imgId, spec, setter) {
  if (!file) return;
  const img = document.getElementById(imgId);
  const reader = new FileReader();
  reader.onload = () => {
    img.src = reader.result;
    if (imgId === "thumb-crop" && thumbCropper) thumbCropper.destroy();
    if (imgId === "hero-crop" && heroCropper) heroCropper.destroy();
    const cropper = new Cropper(img, {
      aspectRatio: spec.width / spec.height,
      viewMode: 1
    });
    setter(cropper);
  };
  reader.readAsDataURL(file);
}

async function uploadCrop(cropper, kind) {
  if (!cropper) {
    saveStatus.textContent = "Choose an image first.";
    return;
  }
  const projectId = document.getElementById("project-select").value;
  const spec = kind === "thumb" ? IMAGE_SPECS.thumb : IMAGE_SPECS.hero;
  const canvas = cropper.getCroppedCanvas({ width: spec.width, height: spec.height });
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));

  const path =
    kind === "thumb" ? STORAGE_PATHS.projectThumb(projectId) : STORAGE_PATHS.projectHero(projectId);
  await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(ref(storage, path));

  const project = content.projects.find((p) => p.id === projectId);
  if (project) {
    if (kind === "thumb") project.thumb = url;
    else project.hero = url;
    await setDoc(doc(db, FIRESTORE_PATHS.content), content, { merge: true });
  }
  saveStatus.textContent = `${kind} uploaded for ${projectId}.`;
}

async function uploadCvs() {
  const lightFile = document.getElementById("cv-light-file").files[0];
  const darkFile = document.getElementById("cv-dark-file").files[0];
  if (!lightFile && !darkFile) {
    saveStatus.textContent = "Select at least one PDF.";
    return;
  }
  if (lightFile) {
    await uploadBytes(ref(storage, STORAGE_PATHS.cvLight), lightFile, { contentType: "application/pdf" });
    content.about.cvLightStorage = STORAGE_PATHS.cvLight;
    content.about.cvLightUrl = await getDownloadURL(ref(storage, STORAGE_PATHS.cvLight));
  }
  if (darkFile) {
    await uploadBytes(ref(storage, STORAGE_PATHS.cvDark), darkFile, { contentType: "application/pdf" });
    content.about.cvDarkStorage = STORAGE_PATHS.cvDark;
    content.about.cvDarkUrl = await getDownloadURL(ref(storage, STORAGE_PATHS.cvDark));
  }
  await setDoc(doc(db, FIRESTORE_PATHS.content), content, { merge: true });
  saveStatus.textContent = "CV files uploaded.";
}

function getDefaultSettings() {
  return {
    defaultTheme: "dark",
    accentHue: 142,
    fontDisplay: "'Space Grotesk', system-ui, sans-serif",
    fontBody: "'IBM Plex Mono', ui-monospace, monospace",
    bootEnabled: true,
    reducedMotion: false
  };
}

function getByPath(obj, path) {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

function setByPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]]) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function deepMerge(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override || {})) {
    const val = override[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      out[key] = deepMerge(base[key] || {}, val);
    } else if (val != null) {
      out[key] = val;
    }
  }
  return out;
}
