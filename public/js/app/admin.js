import { defaultPortfolioData, PORTFOLIO_DB_PATH } from "./portfolio-data.js";
import {
  adminLogin,
  adminLogout,
  canUseFirebase,
  readData,
  setData,
  uploadFile,
  watchAuthState,
} from "./firebase-client.js";

const state = {
  data: structuredClone(defaultPortfolioData),
  cropper: null,
};

function mergeData(base, incoming) {
  if (!incoming || typeof incoming !== "object") return structuredClone(base);
  const target = structuredClone(base);
  Object.entries(incoming).forEach(([key, value]) => {
    if (Array.isArray(value)) target[key] = value;
    else if (value && typeof value === "object") target[key] = { ...(target[key] || {}), ...value };
    else target[key] = value;
  });
  return target;
}

function showStatus(message, type = "info") {
  const el = document.querySelector("[data-admin-status]");
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
}

function bindTextLines(selector, values = []) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.value = values.join("\n");
}

function parseTextLines(selector) {
  const value = document.querySelector(selector)?.value || "";
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fillForms(data) {
  document.querySelector("[name='name']").value = data.profile.name;
  document.querySelector("[name='title']").value = data.profile.title;
  document.querySelector("[name='tagline']").value = data.profile.tagline;
  document.querySelector("[name='summary']").value = data.profile.summary;
  document.querySelector("[name='status']").value = data.profile.status;
  document.querySelector("[name='location']").value = data.profile.location;

  document.querySelector("[name='accent']").value = data.theme.accent;
  document.querySelector("[name='altAccent']").value = data.theme.altAccent;
  document.querySelector("[name='defaultMode']").value = data.theme.defaultMode;
  document.querySelector("[name='fontFamily']").value = data.theme.fontFamily;

  document.querySelector("[name='email']").value = data.contact.email;
  document.querySelector("[name='phone']").value = data.contact.phone;
  document.querySelector("[name='linkedin']").value = data.contact.linkedin;
  document.querySelector("[name='github']").value = data.contact.github;
  document.querySelector("[name='instagram']").value = data.contact.instagram;

  bindTextLines("[name='skills']", data.skills);
  bindTextLines("[name='interests']", data.interests);
  bindTextLines("[name='achievements']", data.achievements);
  bindTextLines("[name='certifications']", data.certifications);

  document.querySelector("[name='experienceJson']").value = JSON.stringify(data.experience, null, 2);
  document.querySelector("[name='projectsJson']").value = JSON.stringify(data.projects, null, 2);
  document.querySelector("[name='educationJson']").value = JSON.stringify(data.education, null, 2);
}

function collectFormData() {
  return {
    profile: {
      name: document.querySelector("[name='name']").value.trim(),
      title: document.querySelector("[name='title']").value.trim(),
      tagline: document.querySelector("[name='tagline']").value.trim(),
      summary: document.querySelector("[name='summary']").value.trim(),
      status: document.querySelector("[name='status']").value.trim(),
      location: document.querySelector("[name='location']").value.trim(),
    },
    theme: {
      accent: document.querySelector("[name='accent']").value.trim(),
      altAccent: document.querySelector("[name='altAccent']").value.trim(),
      defaultMode: document.querySelector("[name='defaultMode']").value,
      fontFamily: document.querySelector("[name='fontFamily']").value.trim(),
    },
    contact: {
      email: document.querySelector("[name='email']").value.trim(),
      phone: document.querySelector("[name='phone']").value.trim(),
      linkedin: document.querySelector("[name='linkedin']").value.trim(),
      github: document.querySelector("[name='github']").value.trim(),
      instagram: document.querySelector("[name='instagram']").value.trim(),
    },
    skills: parseTextLines("[name='skills']"),
    interests: parseTextLines("[name='interests']"),
    achievements: parseTextLines("[name='achievements']"),
    certifications: parseTextLines("[name='certifications']"),
    experience: JSON.parse(document.querySelector("[name='experienceJson']").value),
    projects: JSON.parse(document.querySelector("[name='projectsJson']").value),
    education: JSON.parse(document.querySelector("[name='educationJson']").value),
    cv: state.data.cv,
    scores: state.data.scores,
    ui: state.data.ui,
  };
}

async function loadPortfolioData() {
  if (!canUseFirebase()) {
    state.data = structuredClone(defaultPortfolioData);
    fillForms(state.data);
    showStatus("Firebase config missing. Edit values locally, then add firebase config to persist.", "warn");
    return;
  }

  const remote = await readData(PORTFOLIO_DB_PATH);
  state.data = mergeData(defaultPortfolioData, remote);
  fillForms(state.data);
  showStatus("Portfolio data loaded from Firebase.", "success");
}

async function savePortfolioData(event) {
  event.preventDefault();
  try {
    const next = collectFormData();
    state.data = mergeData(state.data, next);
    if (!canUseFirebase()) {
      showStatus("Firebase is not configured, so save is only local in this session.", "warn");
      return;
    }
    await setData(PORTFOLIO_DB_PATH, state.data);
    showStatus("Portfolio content saved to Firebase Realtime Database.", "success");
  } catch (error) {
    showStatus(`Save failed: ${error.message}`, "error");
  }
}

async function handleCvUpload(mode) {
  const input = document.querySelector(mode === "light" ? "[name='cvLight']" : "[name='cvDark']");
  const file = input?.files?.[0];
  if (!file) {
    showStatus(`Choose a ${mode} CV PDF first.`, "warn");
    return;
  }
  if (!canUseFirebase()) {
    showStatus("Firebase Storage not configured. Add config first.", "error");
    return;
  }
  const storagePath = `portfolio/cv/${mode}-${Date.now()}-${file.name}`;
  const url = await uploadFile(storagePath, file, file.type || "application/pdf");
  if (mode === "light") state.data.cv.lightUrl = url;
  else state.data.cv.darkUrl = url;
  await setData(PORTFOLIO_DB_PATH, state.data);
  showStatus(`${mode[0].toUpperCase()}${mode.slice(1)} CV uploaded and linked.`, "success");
}

function destroyCropper() {
  if (state.cropper) {
    state.cropper.destroy();
    state.cropper = null;
  }
}

function setupCropper() {
  const fileInput = document.querySelector("[name='projectImage']");
  const image = document.querySelector("[data-crop-image]");
  const targetSelect = document.querySelector("[name='projectImageType']");

  const applyCropper = (src) => {
    image.src = src;
    image.onload = () => {
      destroyCropper();
      const ratio = targetSelect.value === "thumbnail" ? 16 / 10 : 16 / 9;
      state.cropper = new Cropper(image, {
        aspectRatio: ratio,
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 0.95,
        responsive: true,
      });
    };
  };

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    applyCropper(URL.createObjectURL(file));
  });

  targetSelect.addEventListener("change", () => {
    if (image.src) applyCropper(image.src);
  });
}

async function uploadCroppedProjectImage() {
  const projectIndex = Number(document.querySelector("[name='projectIndex']").value);
  const imageType = document.querySelector("[name='projectImageType']").value;

  if (!Number.isInteger(projectIndex) || projectIndex < 0) {
    showStatus("Select a valid project index.", "error");
    return;
  }
  if (!state.cropper) {
    showStatus("Load and crop an image before upload.", "warn");
    return;
  }
  if (!canUseFirebase()) {
    showStatus("Firebase Storage not configured.", "error");
    return;
  }

  const dimensions = imageType === "thumbnail" ? [640, 400] : [1280, 720];
  const blob = await new Promise((resolve) =>
    state.cropper
      .getCroppedCanvas({ width: dimensions[0], height: dimensions[1], imageSmoothingQuality: "high" })
      .toBlob(resolve, "image/jpeg", 0.92),
  );

  if (!blob) {
    showStatus("Unable to create cropped image blob.", "error");
    return;
  }

  const path = `portfolio/projects/p${projectIndex}-${imageType}-${Date.now()}.jpg`;
  const url = await uploadFile(path, blob, "image/jpeg");
  const project = state.data.projects?.[projectIndex];
  if (!project) {
    showStatus("Project index does not exist in data.", "error");
    return;
  }
  project[imageType] = url;
  document.querySelector("[name='projectsJson']").value = JSON.stringify(state.data.projects, null, 2);
  await setData(PORTFOLIO_DB_PATH, state.data);
  showStatus(`Project ${imageType} updated and saved.`, "success");
}

function togglePanels(user) {
  document.querySelector("[data-login-panel]").hidden = Boolean(user);
  document.querySelector("[data-editor-panel]").hidden = !user;
  if (!user) {
    showStatus("Log in with Firebase Auth email/password to edit dashboard.", "warn");
  }
}

function setupAuth() {
  const loginForm = document.querySelector("[data-login-form]");
  const logoutButton = document.querySelector("[data-logout]");

  if (!canUseFirebase()) {
    togglePanels(null);
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("[name='adminEmail']").value.trim();
    const password = document.querySelector("[name='adminPassword']").value;
    try {
      await adminLogin(email, password);
      showStatus("Login successful.", "success");
    } catch (error) {
      showStatus(`Login failed: ${error.message}`, "error");
    }
  });

  logoutButton.addEventListener("click", async () => {
    await adminLogout();
    showStatus("Logged out.", "info");
  });

  watchAuthState((user) => {
    togglePanels(user);
    if (user) {
      document.querySelector("[data-admin-user]").textContent = user.email || user.uid;
      loadPortfolioData().catch((error) => showStatus(error.message, "error"));
    }
  });
}

function installActions() {
  document.querySelector("[data-editor-form]").addEventListener("submit", savePortfolioData);
  document.querySelector("[data-upload-light]").addEventListener("click", () => handleCvUpload("light"));
  document.querySelector("[data-upload-dark]").addEventListener("click", () => handleCvUpload("dark"));
  document.querySelector("[data-project-upload]").addEventListener("click", uploadCroppedProjectImage);
  setupCropper();
}

function bootAdmin() {
  setupAuth();
  installActions();
  if (!canUseFirebase()) {
    fillForms(state.data);
  }
}

bootAdmin();
